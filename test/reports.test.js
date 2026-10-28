import test from 'node:test';
import assert from 'node:assert/strict';
import {renderBugReport, notificationIntent, ReportInputError} from '../src/reports.js';

const facts = () => ({summary:'Saving preferences fails', reproduction:['Open the synthetic preferences form', 'Fill a name and select Save'], expected:'Saved confirmation is visible', actual:'No confirmation appears', environment:{name:'synthetic-staging', browser:'chromium', buildId:'demo-build-1'}, severity:'untriaged', owner:null, source:{platform:'github',id:'DEMO-12',revision:'r2'}, run:{provider:'synthetic',id:901,status:'FAILURE',assertionOutcome:'failed'}, evidence:[{id:'assertion-log-1',kind:'log',sha256:'a'.repeat(64)}]});
const profile = (overrides = {}) => ({notifications:{events:['test.failed','maintenance.escalated'],channels:['artifact'],format:'markdown',include:['summary','reproduction','expected','actual','environment','evidence','owner','severity'],...overrides}});
const event = {id:'demo-event-1',type:'test.failed'};

test('default report preserves caller facts and separates formatting from verification and delivery', () => {
  const input = facts(), before = structuredClone(input), result = renderBugReport(input);
  assert.deepEqual(input, before);
  for (const key of Object.keys(input)) assert.deepEqual(result.json[key],input[key]);
  assert.equal(result.json.evidenceVerifiedByTool,false);
  assert.equal(result.json.dataTrust,'caller-supplied-unverified');
  assert.equal(result.json.deliveryPending,true);
  assert.match(result.markdown,/## Steps to reproduce/);
  assert.match(result.markdown,/Delivery pending/);
  assert.doesNotMatch(result.markdown,/sent successfully|verified failure|critical severity/);
});

test('custom field selection cannot suppress expected, actual, source, run or evidence', () => {
  const result = renderBugReport(facts(), {include:['owner']});
  assert.equal(result.json.owner,null);
  for (const key of ['expected','actual','source','run','evidence']) assert.deepEqual(result.json[key],facts()[key]);
  for (const key of ['summary','reproduction','environment','severity']) assert.equal(Object.hasOwn(result.json,key),false);
  assert.match(result.markdown,/## Expected behavior/);
  assert.match(result.markdown,/## Source/);
  assert.doesNotMatch(result.markdown,/## Severity/);
});

test('missing values stay unknown and empty evidence differs from unrecorded evidence', () => {
  const unknown = renderBugReport({});
  for (const key of ['expected','actual','source','run','evidence','severity','owner']) assert.equal(unknown.json[key],null);
  assert.match(unknown.markdown,/## Actual behavior\n\nunknown/);
  const empty = renderBugReport({evidence:[],reproduction:[]});
  assert.deepEqual(empty.json.evidence,[]);
  assert.match(empty.markdown,/## Evidence\n\nNone recorded\./);
  assert.equal(empty.json.run,null);
});

test('Markdown cannot turn caller text into HTML, links, headings or notification mentions', () => {
  const input = facts();
  input.summary = '<script>alert(1)</script> <!here>';
  input.actual = '# Invented heading\n1. nested list\n[text](javascript:alert(1)) **bold**';
  const result = renderBugReport(input);
  assert.equal(result.json.actual,input.actual);
  assert.doesNotMatch(result.markdown,/<script>|<!here>|\n# Invented|\n1\. nested|\[text\]\(javascript:alert/);
  assert.match(result.markdown,/&lt;script&gt;/);
  assert.match(result.markdown,/\\# Invented/);
});

test('raw fields, credentials, remote URLs and unbounded input fail with no reflected payload', () => {
  const cases = [
    {actual:'Bearer do-not-reflect-me'}, {expected:'api_key=do-not-reflect-me'},
    {source:{id:'case-1',url:'https://private.invalid/?signature=do-not-reflect-me'}},
    {evidence:['https://private.invalid/?signature=do-not-reflect-me']},
    {actual:'token_contextqa-a.bbbbbbbbbbbbbbbbbbbbb'}, {actual:'sk-ant-abcdefghijklmnop'},
    {run:{id:901,raw:{token:'do-not-reflect-me'}}}, {summary:'x'.repeat(501)},
    {reproduction:new Array(31).fill('step')}, {evidence:[{id:'log-1',sha256:'invalid'}]},
  ];
  for (const value of cases) assert.throws(() => renderBugReport(value), error => error instanceof ReportInputError && !error.message.includes('do-not-reflect-me'));
  for (const settings of [{include:['source']},{include:['owner','owner']},{template:'raw'}, {include:'summary'}]) assert.throws(() => renderBugReport(facts(),settings),ReportInputError);
});

test('no notification intent exists without an explicit event and channel subscription', () => {
  for (const p of [{}, profile({events:['maintenance.escalated']}), profile({channels:[]})]) {
    const result = notificationIntent({event,profile:p,report:facts()});
    assert.equal(result.subscribed,false);assert.equal(result.deliveryPending,false);
    assert.deepEqual(result.intents,[]);assert.equal(result.sent,false);assert.equal(result.externalRequests,0);
  }
});

test('notification event support matches every event accepted by the shared profile', () => {
  const supported=['test.created','test.updated','test.passed','test.failed','maintenance.proposed','maintenance.escalated','sync.review-required','sync.pr-created'];
  for(const type of supported) {
    const result=notificationIntent({event:{id:`event-${type}`,type},profile:profile({events:[type]}),report:facts()});
    assert.equal(result.subscribed,true);assert.equal(result.intents.length,1);assert.equal(result.intents[0].eventType,type);
  }
});

test('artifact, Slack, email and webhook are deterministic queued plans with no delivery config', () => {
  const p = profile({channels:['artifact','slack','email','webhook']}), report = renderBugReport(facts());
  const first = notificationIntent({event,profile:p,report}), second = notificationIntent({event,profile:p,report});
  assert.deepEqual(first,second);assert.equal(first.subscribed,true);assert.equal(first.deliveryPending,true);
  assert.equal(first.intents.length,4);assert.equal(new Set(first.intents.map(row=>row.deduplicationKey)).size,4);
  for (const intent of first.intents) {
    assert.match(intent.deduplicationKey,/^[a-f0-9]{64}$/);assert.equal(intent.sent,false);
    assert.equal(intent.state,'delivery_pending');assert.equal(intent.deliveryConfiguration,'not_configured');
    assert.equal(Object.hasOwn(intent,'url'),false);assert.match(intent.payload,/Expected behavior/);
  }
  const changed = notificationIntent({event:{...event,id:'demo-event-2'},profile:p,report});
  assert.notEqual(first.intents[0].deduplicationKey,changed.intents[0].deduplicationKey);
  const changedContent = notificationIntent({event,profile:p,report:{...facts(),actual:'Different caller finding'}});
  assert.equal(first.intents[0].deduplicationKey,changedContent.intents[0].deduplicationKey);
});

test('JSON notification uses subscription field customization while preserving mandatory facts', () => {
  const result = notificationIntent({event:{id:'maintenance-1',type:'maintenance.escalated'},profile:profile({format:'json',include:['summary']}),report:renderBugReport(facts())});
  const payload = result.intents[0].payload;
  for (const key of ['expected','actual','source','run','evidence']) assert.deepEqual(payload[key],facts()[key]);
  assert.equal(Object.hasOwn(payload,'owner'),false);assert.equal(payload.summary,facts().summary);
  assert.equal(payload.evidenceVerifiedByTool,false);
});

test('unsupported subscription, destination config and raw payload never pass into notification plans', () => {
  const mutations = [profile({events:['anything']}),profile({channels:['sms']}),profile({channels:['artifact','artifact']}),profile({format:'html'}),profile({include:['raw']}),profile({webhookUrl:'https://do-not-reflect.invalid/secret'})];
  for (const p of mutations) assert.throws(() => notificationIntent({event,profile:p,report:facts()}),error => error instanceof ReportInputError && !error.message.includes('do-not-reflect'));
  assert.throws(() => notificationIntent({event:{...event,url:'https://private.invalid'},profile:profile(),report:facts()}),ReportInputError);
  const report = {...renderBugReport(facts()),rawPayload:'Bearer do-not-forward-me',webhookUrl:'https://private.invalid'};
  const result = notificationIntent({event,profile:profile(),report});
  assert.equal(JSON.stringify(result).includes('do-not-forward-me'),false);
  assert.equal(JSON.stringify(result).includes('private.invalid'),false);
});
