import {createHash} from 'node:crypto';
import {executePlanOnce} from './contextqa.js';

const id = n => Number.isSafeInteger(n) && n > 0;
const object = x => x && typeof x === 'object' && !Array.isArray(x);
const sha = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const resources = {cases:'getTestCase', suites:'getTestSuite', steps:'getTestStep'};

function checkExpected(value, depth = 0) {
  if (depth > 20) throw new Error('Project expectations are too deeply nested');
  if (Array.isArray(value)) {
    if (value.length > 100) throw new Error('Project expectation array is too large');
    for (const item of value) checkExpected(item, depth + 1);
  } else if (object(value)) {
    for (const [key, item] of Object.entries(value)) {
      if (['__proto__','constructor','prototype'].includes(key)) throw new Error('Invalid project expectation property');
      checkExpected(item, depth + 1);
    }
  } else if (value !== null && !['string','number','boolean'].includes(typeof value)) throw new Error('Project expectations must be JSON');
}
export function validateProject(profile) {
  if (!object(profile) || profile.schema !== 1 || typeof profile.name !== 'string' || !profile.name.trim() || profile.name.length > 120 || !id(profile.plan?.id)) throw new Error('Project needs schema 1, name and saved plan.id');
  if (Object.keys(profile).some(k => !['schema','name','plan','cases','suites','steps','execution'].includes(k))) throw new Error('Unknown project configuration property');
  for (const row of [profile.plan, ...Object.keys(resources).flatMap(k => profile[k] || [])]) {
    if (!object(row) || !id(row.id) || !object(row.expect) || !Object.keys(row.expect).length || Object.keys(row).some(k => !['id','expect'].includes(k))) throw new Error('Each project resource needs an ID and explicit expected ContextQA configuration');
    checkExpected(row.expect);
  }
  for (const kind of Object.keys(resources)) {
    const rows = profile[kind] || [];
    if (!Array.isArray(rows) || rows.length > 100 || new Set(rows.map(r => r.id)).size !== rows.length) throw new Error('Project resources need bounded unique IDs');
  }
  if (profile.execution !== undefined) {
    if (!object(profile.execution) || Object.keys(profile.execution).some(k => !['query','maxPolls','intervalMs'].includes(k))) throw new Error('Unknown project execution setting');
    if (profile.execution.maxPolls !== undefined && (!Number.isInteger(profile.execution.maxPolls) || profile.execution.maxPolls < 1 || profile.execution.maxPolls > 120)) throw new Error('Invalid project polling limit');
    if (profile.execution.intervalMs !== undefined && (!Number.isInteger(profile.execution.intervalMs) || profile.execution.intervalMs < 0 || profile.execution.intervalMs > 60000)) throw new Error('Invalid project polling interval');
  }
  return profile;
}
function matches(expected, actual) {
  if (Array.isArray(expected)) return Array.isArray(actual) && expected.length === actual.length && expected.every((v,i) => matches(v,actual[i]));
  if (object(expected)) return object(actual) && Object.entries(expected).every(([k,v]) => Object.hasOwn(actual,k) && matches(v,actual[k]));
  return expected === actual;
}

// This read-only preflight preserves the saved configuration and fails on drift.
// Expected fields use response DTO spelling; suite responses expose testCasesDto,
// while authoring requests use testCaseIds. Never blindly PUT a response DTO back.
export async function inspectProject(client, profile) {
  profile = structuredClone(profile);
  validateProject(profile);
  client.validate('triggerRun', {id:profile.plan.id,query:profile.execution?.query || {}});
  const observed = {plan:await client.request('getTestPlan',{id:profile.plan.id}),cases:[],suites:[],steps:[]};
  if (observed.plan?.id !== profile.plan.id || !matches(profile.plan.expect,observed.plan)) throw new Error('ContextQA plan configuration drift; review the project before execution');
  for (const [kind,operationId] of Object.entries(resources)) {
    for (const resource of profile[kind] || []) {
      const actual = await client.request(operationId,{id:resource.id});
      if (actual?.id !== resource.id || !matches(resource.expect,actual)) throw new Error('ContextQA resource configuration drift; review the project before execution');
      observed[kind].push(actual);
    }
  }
  return {schema:1,projectName:profile.name,profileSha256:sha(profile),observedSha256:sha(observed),checked:true,planId:profile.plan.id,observed,paidExecutionStarted:false};
}

export async function runProject({client,profile,journalFile,approveExecution=false}) {
  if (approveExecution !== true) throw new Error('Project execution may incur ContextQA charges; explicit approval required');
  profile = structuredClone(profile);
  const preflight = await inspectProject(client,profile);
  const run = await executePlanOnce({client,planId:profile.plan.id,query:profile.execution?.query || {},journalFile,approveExecution:true});
  // The acceptance receipt is already durable before the first status read.
  const result = await client.waitForRun(run.runId,{maxPolls:profile.execution?.maxPolls ?? 30,intervalMs:profile.execution?.intervalMs ?? 1000});
  return {schema:1,projectName:profile.name,profileSha256:preflight.profileSha256,configurationSha256:preflight.observedSha256,...run,...result,provider:'contextqa',modelTokens:null,billedCost:null};
}
