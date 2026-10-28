import {createHash} from 'node:crypto';

export class ReportInputError extends Error {}
const fail = message => { throw new ReportInputError(message); };
const OPTIONAL = ['summary', 'reproduction', 'environment', 'severity', 'owner'];
const MANDATORY = ['expected', 'actual', 'source', 'run', 'evidence'];
const INCLUDE = [...OPTIONAL, 'expected', 'actual', 'evidence'];
const EVENTS = ['test.created', 'test.updated', 'test.passed', 'test.failed', 'maintenance.proposed', 'maintenance.escalated', 'sync.review-required', 'sync.pr-created'];
const CHANNELS = ['artifact', 'slack', 'email', 'webhook'];
const LABELS = {summary:'Summary', reproduction:'Steps to reproduce', expected:'Expected behavior', actual:'Actual behavior', environment:'Environment', severity:'Severity', owner:'Owner', source:'Source', run:'Run', evidence:'Evidence'};
const canonical = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const object = (value, label, keys) => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) fail(`Invalid ${label} fields`);
  return value;
};
function text(value, label, max = 4000) {
  if (value == null) return null;
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) fail(`Invalid ${label}`);
  // Reports are shareable text, not a place for bearer credentials or signed URLs.
  if (/(?:\bBearer\s+\S+|\b(?:sk|sk-ant)-[A-Za-z0-9_-]{8,}|\btoken_[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|\b(?:api[_-]?key|access[_-]?token|password|secret)\s*[:=]\s*\S+|(?:[A-Za-z][A-Za-z0-9+.-]*:\/\/)|\b(?:www\.|mailto:))/i.test(value)) fail(`Remove credentials and URLs from ${label}`);
  return value;
}
function id(value, label) {
  if (value == null) return null;
  if (Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/.test(value)) fail(`Invalid ${label}`);
  return text(value, label, 160);
}
function strings(value, label, max = 30) {
  if (value == null) return null;
  if (!Array.isArray(value) || value.length > max) fail(`Invalid ${label}`);
  return value.map(item => text(item, label));
}
function selected(settings = {}) {
  object(settings, 'report settings', ['include']);
  if (settings.include == null) return [...OPTIONAL];
  if (!Array.isArray(settings.include) || settings.include.length > INCLUDE.length || settings.include.some(field => !INCLUDE.includes(field)) || new Set(settings.include).size !== settings.include.length) fail('Invalid report include fields');
  return OPTIONAL.filter(field => settings.include.includes(field));
}
function reference(value, label, keys) {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number') return id(value, label);
  object(value, label, keys);
  const result = {};
  for (const key of keys) if (Object.hasOwn(value, key)) {
    if (key === 'sha256') {
      if (value[key] != null && (typeof value[key] !== 'string' || !/^[a-f0-9]{64}$/.test(value[key]))) fail(`Invalid ${label} hash`);
      result[key] = value[key] ?? null;
    } else result[key] = key === 'id' ? id(value[key], `${label} ID`) : text(value[key], `${label} ${key}`, 300);
  }
  return result;
}
function evidence(value) {
  if (value == null) return null;
  if (!Array.isArray(value) || value.length > 30) fail('Invalid evidence references');
  return value.map(row => reference(row, 'evidence reference', ['id', 'kind', 'sha256']));
}
function environment(value) {
  if (value == null || typeof value === 'string') return text(value, 'environment', 1000);
  const keys = ['name', 'browser', 'browserVersion', 'os', 'buildId'];
  object(value, 'environment', keys);
  return Object.fromEntries(keys.filter(key => Object.hasOwn(value, key)).map(key => [key, text(value[key], `environment ${key}`, 300)]));
}
const md = value => String(value ?? 'unknown').replace(/[&<>]/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;'}[char])).replace(/[\\`*_{}\[\]()#+!|]/g, '\\$&').replace(/(^|\n)(\s*)([-=~>]|\d+[.)])/g, '$1$2\\$3');
function renderValue(value) {
  if (value == null) return 'unknown';
  if (Array.isArray(value)) return value.length ? value.map((item, index) => `${index + 1}. ${renderValue(item).replace(/\n/g, '\n   ')}`).join('\n') : 'None recorded.';
  if (typeof value === 'object') return Object.entries(value).length ? Object.entries(value).map(([key, item]) => `- ${md(key)}: ${renderValue(item).replace(/\n/g, '\n  ')}`).join('\n') : 'unknown';
  return md(value);
}

/**
 * Local formatting only. Facts are caller-supplied, never authenticated by this module.
 * source: ID or {platform,id,revision,sha256}; run: ID or {provider,id,status,assertionOutcome}.
 * evidence: IDs or {id,kind,sha256} records; use opaque labels, not remote/private URLs.
 * settings.include selects optional fields; expected/actual/source/run/evidence cannot be removed.
 */
export function renderBugReport(facts, settings = {}) {
  object(facts, 'bug report', [...OPTIONAL, ...MANDATORY]);
  const fields = selected(settings);
  const normalized = {
    summary: text(facts.summary, 'summary', 500),
    reproduction: strings(facts.reproduction, 'reproduction'),
    expected: text(facts.expected, 'expected behavior'),
    actual: text(facts.actual, 'actual behavior'),
    source: reference(facts.source, 'source', ['platform', 'id', 'revision', 'sha256']),
    run: reference(facts.run, 'run', ['provider', 'id', 'status', 'assertionOutcome']),
    evidence: evidence(facts.evidence),
    environment: environment(facts.environment),
    severity: text(facts.severity, 'severity', 100),
    owner: text(facts.owner, 'owner', 200),
  };
  const json = {schema:1, dataTrust:'caller-supplied-unverified', evidenceVerifiedByTool:false, deliveryPending:true};
  for (const field of [...fields, ...MANDATORY]) json[field] = normalized[field];
  const lines = ['# ContextQA bug report', '', 'Caller-supplied facts; source, run and evidence references have not been authenticated by this formatter.', '', 'Delivery pending. This local report has not been sent.'];
  for (const field of ['summary', 'reproduction', 'expected', 'actual', 'environment', 'severity', 'owner', 'source', 'run', 'evidence']) if (Object.hasOwn(json, field)) lines.push('', `## ${LABELS[field]}`, '', renderValue(json[field]));
  return {schema:1, markdown:lines.join('\n') + '\n', json};
}

/** Evaluate explicit local subscriptions; this function never sends or persists anything. */
export function notificationIntent({event, profile, report} = {}) {
  object(event, 'notification event', ['id', 'type']);
  const eventId = id(event.id, 'event ID');
  if (typeof eventId !== 'string' || !EVENTS.includes(event.type)) fail('Use a supported event type and stable string event ID');
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) fail('Invalid notification profile');
  const cfg = profile.notifications;
  const result = {schema:1, eventId, eventType:event.type, subscribed:false, deliveryPending:false, intents:[], sent:false, externalRequests:0};
  if (cfg == null) return result;
  object(cfg, 'notification settings', ['events', 'channels', 'format', 'include']);
  for (const [key, values] of [['events', EVENTS], ['channels', CHANNELS]]) if (!Array.isArray(cfg[key]) || cfg[key].length > values.length || cfg[key].some(value => !values.includes(value)) || new Set(cfg[key]).size !== cfg[key].length) fail(`Invalid notification ${key}`);
  if (cfg.format != null && !['markdown', 'json'].includes(cfg.format)) fail('Invalid notification format');
  const settings = {include:cfg.include};
  selected(settings);
  if (!cfg.events.includes(event.type) || cfg.channels.length === 0) return result;
  // Re-render only allowlisted facts; never pass raw report objects, URLs or destinations through.
  const facts = report?.json ?? report;
  if (!facts || typeof facts !== 'object' || Array.isArray(facts)) fail('Provide bug report facts');
  const cleanFacts = Object.fromEntries([...OPTIONAL, ...MANDATORY].filter(key => Object.hasOwn(facts, key)).map(key => [key, facts[key]]));
  const rendered = renderBugReport(cleanFacts, settings);
  const format = cfg.format ?? 'markdown';
  result.subscribed = true;
  result.deliveryPending = true;
  result.intents = cfg.channels.map(channel => ({
    deduplicationKey:createHash('sha256').update(canonical([eventId, channel])).digest('hex'),
    eventId, eventType:event.type, channel, state:'delivery_pending', deliveryPending:true,
    format, payload:format === 'markdown' ? rendered.markdown : structuredClone(rendered.json),
    sent:false, deliveryConfiguration:'not_configured',
  }));
  return result;
}
