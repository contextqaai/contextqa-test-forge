// ContextQA token API adapter. Catalog generated from the supplied OpenAPI contract.
import {readFileSync} from 'node:fs';
import {open} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

export const CONTEXTQA_ORIGIN = 'https://server.contextqa.com';
export const catalog = JSON.parse(readFileSync(new URL('./contextqa-operations.json', import.meta.url), 'utf8'));
const operationMap = new Map(catalog.operations.map(op => [op.operationId, op]));
const positiveId = value => Number.isSafeInteger(Number(value)) && Number(value) > 0 && /^\d+$/.test(String(value));
const plain = value => value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const failure = message => { throw new Error(message); };

function validateValue(value, schema = {}, depth = 0) {
  if (depth > 40) failure('ContextQA payload nesting is too deep');
  if (schema.$ref) return validateValue(value, catalog.schemas[schema.$ref.split('/').at(-1)], depth + 1);
  if (schema.allOf) for (const item of schema.allOf) validateValue(value, item, depth + 1);
  if (value === null) { if (schema.nullable || !schema.type) return; failure('ContextQA payload has an invalid null'); }
  const t = schema.type;
  if (t === 'integer' && !Number.isSafeInteger(value)) failure('ContextQA integer field is invalid');
  if (t === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) failure('ContextQA numeric field is invalid');
  if (t === 'boolean' && typeof value !== 'boolean') failure('ContextQA boolean field is invalid');
  if (t === 'string' && typeof value !== 'string') failure('ContextQA string field is invalid');
  if (t === 'array' && !Array.isArray(value)) failure('ContextQA array field is invalid');
  if (t === 'object' && !plain(value)) failure('ContextQA object field is invalid');
  if (schema.enum && !schema.enum.includes(value)) failure('ContextQA enum field is invalid');
  if (schema.minimum !== undefined && value < schema.minimum) failure('ContextQA field is below its minimum');
  if (schema.maximum !== undefined && value > schema.maximum) failure('ContextQA field exceeds its maximum');
  if (Array.isArray(value)) {
    if (value.length > 1000) failure('ContextQA payload array is too large');
    for (const item of value) validateValue(item, schema.items || {}, depth + 1);
  } else if (plain(value)) {
    for (const key of schema.required || []) if (!Object.hasOwn(value, key)) failure('ContextQA required field is missing');
    for (const [key, item] of Object.entries(value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) failure('ContextQA payload contains a forbidden property');
      if (schema.properties && Object.hasOwn(schema.properties, key)) validateValue(item, schema.properties[key], depth + 1);
      else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') validateValue(item, schema.additionalProperties, depth + 1);
      else if (schema.properties && schema.additionalProperties !== true) failure('ContextQA payload field is absent from the inspected contract');
      else validateValue(item, {}, depth + 1);
    }
  } else if (!['string', 'number', 'boolean'].includes(typeof value)) failure('ContextQA payload must be JSON');
}

// No network or credentials: usable for reviewing authoring bundles before any write.
export function validateRequest(operationId, args = {}) {
  const operation = operationMap.get(operationId);
  if (!operation) failure('Unknown ContextQA operation');
  if (!plain(args)) failure('ContextQA request options must be an object');
  let path = operation.path;
  if (path.includes('{id}')) {
    if (!positiveId(args.id)) failure('ContextQA ID must be a positive safe integer');
    path = path.replace('{id}', String(Number(args.id)));
  } else if (args.id !== undefined) failure('This ContextQA operation has no path ID');
  const url = new URL(path, CONTEXTQA_ORIGIN);
  const query = args.query || {};
  if (!plain(query)) failure('ContextQA query must be an object');
  const allowed = new Map(operation.parameters.filter(p => p.in === 'query').map(p => [p.name, p]));
  for (const [key, value] of Object.entries(query)) {
    const param = allowed.get(key);
    if (!param) failure('Query parameter is absent from the ContextQA contract');
    const values = key === 'sort' && Array.isArray(value) ? value : [value];
    if (values.length > 20 || (values.length > 1 && key !== 'sort')) failure('Invalid repeated ContextQA query parameter');
    for (const v of values) {
      validateValue(v, key === 'sort' && param.schema.type === 'array' ? param.schema.items : param.schema);
      if (String(v).length > 4000 || /[\r\n]/.test(String(v))) failure('Invalid ContextQA query value');
      if (key === 'size' && v > 100) failure('Adapter limits page size to 100; paginate explicitly');
      url.searchParams.append(key, String(v));
    }
  }
  for (const [key, param] of allowed) if (param.required && !Object.hasOwn(query, key)) failure('Required ContextQA query parameter is missing');
  let body;
  if (operation.contentType === 'application/json') {
    if (!plain(args.body)) failure('ContextQA JSON body is required');
    validateValue(args.body, operation.requestSchema);
    body = JSON.stringify(args.body);
    if (Buffer.byteLength(body) > 1_000_000) failure('ContextQA request body exceeds 1 MB');
  } else if (operation.contentType === 'multipart/form-data') {
    if (!(args.appFile instanceof Blob) || !/\.(apk|ipa)$/i.test(args.appFile.name || '') || args.appFile.size > 10_000_000 || args.appFile.size < 1) failure('Inline build must be an APK/IPA File of 1 byte to 10 MB');
    body = new FormData(); body.append('appFile', args.appFile, args.appFile.name);
  } else if (args.body !== undefined || args.appFile !== undefined) failure('This ContextQA operation has no body');
  return {operation, url: url.toString(), body};
}

export class ContextQAError extends Error {
  constructor(code, {status = null, retryAfter = null, ambiguous = false} = {}) {
    super(`ContextQA ${code}${status ? ` (HTTP ${status})` : ''}${ambiguous ? '; outcome may be unknown; do not replay' : ''}`);
    Object.assign(this, {name: 'ContextQAError', code, status, retryAfter, ambiguous});
  }
}

async function boundedJSON(response) {
  const limit = 4_000_000;
  if (Number(response.headers.get('content-length')) > limit) { await response.body?.cancel(); throw new Error('size'); }
  if (response.status === 204 || response.headers.get('content-length') === '0') return null;
  const reader = response.body?.getReader(); if (!reader) return null;
  const chunks = []; let length = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > limit) { await reader.cancel(); throw new Error('size'); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  if (!length) return null;
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function evaluateRun(summary) {
  const completed = summary?.status === 'STATUS_COMPLETED';
  if (!completed) return {completed: false, verdict: 'inconclusive'};
  if (['FAILURE', 'ABORTED', 'STOPPED'].includes(summary.result)) return {completed: true, verdict: 'failed'};
  const counts = ['totalCount', 'passedCount', 'failedCount', 'abortedCount', 'stoppedCount', 'notExecutedCount'];
  const consistent = counts.every(k => Number.isSafeInteger(summary[k]) && summary[k] >= 0)
    && summary.totalCount > 0 && summary.passedCount === summary.totalCount
    && ['failedCount', 'abortedCount', 'stoppedCount', 'notExecutedCount'].every(k => summary[k] === 0);
  return {completed: true, verdict: summary.result === 'SUCCESS' && consistent ? 'passed' : 'inconclusive'};
}

export class ContextQAClient {
  #token; #fetch; #timeout; #spacing; #last = 0; #queue = Promise.resolve();
  constructor({token = process.env.CONTEXTQA_API_TOKEN, fetchImpl = fetch, timeoutMs = 20_000, minIntervalMs = 550} = {}) {
    if (typeof token !== 'string' || !token.length || token.length > 20000 || /\s/.test(token)) failure('Set CONTEXTQA_API_TOKEN securely');
    if (typeof fetchImpl !== 'function' || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000 || !Number.isInteger(minIntervalMs) || minIntervalMs < 0 || minIntervalMs > 60000) failure('Invalid ContextQA client configuration');
    this.#token = token; this.#fetch = fetchImpl; this.#timeout = timeoutMs; this.#spacing = minIntervalMs;
    this.metrics = {requests: 0, durationMs: 0, modelTokens: null, billedCost: null};
  }
  validate(operationId, args) { return validateRequest(operationId, args); }
  async request(operationId, args = {}) {
    const spec = validateRequest(operationId, args);
    if (spec.operation.effect === 'write' && args.approveWrite !== true) failure('ContextQA write requires approveWrite: true after payload review');
    if (spec.operation.effect === 'execute' && args.approveExecution !== true) failure('ContextQA execution may incur charges; approveExecution: true is required');
    const job = this.#queue.then(() => this.#send(spec));
    this.#queue = job.catch(() => {}); return job;
  }
  async #send(spec) {
    await delay(Math.max(0, this.#last + this.#spacing - Date.now()));
    this.#last = Date.now(); const started = Date.now();
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), this.#timeout);
    const effect = spec.operation.effect !== 'read'; this.metrics.requests++;
    try {
      const headers = {Authorization: `Bearer ${this.#token}`, Accept: 'application/json'};
      if (spec.operation.contentType === 'application/json') headers['Content-Type'] = 'application/json';
      const response = await this.#fetch(spec.url, {method: spec.operation.method, headers, body: spec.body, redirect: 'manual', signal: controller.signal});
      if (!response.ok) {
        await response.body?.cancel();
        const retry = Number(response.headers.get('retry-after'));
        throw new ContextQAError(response.status === 429 ? 'rate_limited' : 'request_rejected', {status: response.status, retryAfter: Number.isFinite(retry) && retry > 0 ? Math.min(retry, 3600) : null, ambiguous: effect && ![400,401,403,404,429].includes(response.status)});
      }
      return await boundedJSON(response);
    } catch (error) {
      if (error instanceof ContextQAError) throw error;
      throw new ContextQAError('transport_or_response_error', {ambiguous: effect});
    } finally { clearTimeout(timer); this.metrics.durationMs += Date.now() - started; }
  }
  async waitForRun(id, {maxPolls = 30, intervalMs = 1000} = {}) {
    if (!positiveId(id) || !Number.isInteger(maxPolls) || maxPolls < 1 || maxPolls > 120 || !Number.isInteger(intervalMs) || intervalMs < 0 || intervalMs > 60000) failure('Invalid ContextQA polling bounds');
    let summary;
    for (let polls = 1; polls <= maxPolls; polls++) {
      try { summary = await this.request('getRunSummary', {id}); }
      catch (error) {
        // Never retry a trigger. A 429 on a safe poll can be resumed later by its known run ID.
        error.runId = Number(id); throw error;
      }
      const outcome = evaluateRun(summary);
      if (outcome.completed || polls === maxPolls) return {runId: Number(id), polls, ...outcome, summary};
      await delay(intervalMs);
    }
  }
}

// Exclusive local intent file blocks replay after accepted, rejected, or ambiguous attempts.
// This is a caller-side guard, not an upstream idempotency guarantee or cancellation API.
export async function executePlanOnce({client, planId, query = {}, journalFile, approveExecution = false}) {
  if (!journalFile || approveExecution !== true) failure('Execution needs a fresh private journal and explicit approval');
  query = structuredClone(query);
  client.validate('triggerRun', {id: planId, query});
  const fingerprint = createHash('sha256').update(JSON.stringify({planId, query})).digest('hex');
  const journal = {schema: 1, planId: Number(planId), fingerprint, state: 'attempting', attemptedAt: new Date().toISOString(), runId: null, paidExecutionMayHaveStarted: true};
  const file = await open(journalFile, 'wx', 0o600);
  try { await file.writeFile(JSON.stringify(journal, null, 2) + '\n'); await file.sync(); } finally { await file.close(); }
  const parent = await open(dirname(journalFile), 'r');
  try { await parent.sync(); } finally { await parent.close(); }
  try {
    const response = await client.request('triggerRun', {id: planId, query, approveExecution: true});
    if (!positiveId(response?.id)) throw new ContextQAError('invalid_trigger_response', {ambiguous: true});
    journal.runId = Number(response.id); journal.state = 'accepted';
    await persistJournal(journalFile, journal);
    return {runId: journal.runId, journalFile};
  } catch (error) {
    journal.state = error.ambiguous === false ? 'rejected' : 'unknown';
    // Keep the response/run URL and error body out of the receipt.
    if (journal.runId !== null) journal.state = 'accepted_journal_update_failed';
    try { await persistJournal(journalFile, journal); } catch {}
    throw error;
  }
}

async function persistJournal(path, value) {
  const file = await open(path, 'r+');
  try {
    const text = JSON.stringify(value, null, 2) + '\n';
    await file.write(text, 0, 'utf8'); await file.truncate(Buffer.byteLength(text)); await file.sync();
  } finally { await file.close(); }
}
