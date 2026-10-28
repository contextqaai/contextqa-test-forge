import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ContextQAClient, ContextQAError, catalog, validateRequest, evaluateRun, executePlanOnce} from '../src/contextqa.js';

const token = 'synthetic_local_test_credential';
const good = {status:'STATUS_COMPLETED', result:'SUCCESS', totalCount:1, passedCount:1, failedCount:0, abortedCount:0, stoppedCount:0, notExecutedCount:0};
test('catalog covers all 40 supplied operations with actual method/path and least privilege metadata', () => {
  assert.equal(catalog.operations.length, 40);
  assert.equal(new Set(catalog.operations.map(x=>x.operationId)).size,40);
  for (const op of catalog.operations) {
    assert.ok(op.path.startsWith('/')); assert.ok(op.permission); assert.ok(['read','write','execute'].includes(op.effect));
  }
  const trigger = catalog.operations.find(x=>x.operationId==='triggerRun');
  assert.equal(trigger.method,'GET'); assert.equal(trigger.effect,'execute');
  assert.equal(catalog.operations.find(x=>x.operationId==='getMediaUploadUrl').effect,'write');
});
test('strict request validation rejects traversal, unsupported queries and DTO fields before network', () => {
  assert.throws(()=>validateRequest('getTestPlan',{id:'1/../../api/tokens'}));
  assert.throws(()=>validateRequest('deleteTestPlan',{id:1}));
  assert.throws(()=>validateRequest('listTestPlans',{query:{token:'private'}}));
  assert.throws(()=>validateRequest('listTestPlans',{query:{size:101}}));
  assert.throws(()=>validateRequest('createTestCase',{body:{name:'safe',madeUpEndpoint:true}}));
  assert.throws(()=>validateRequest('createTestCase',{body:{workspaceVersionId:'bad'}}));
  assert.throws(()=>validateRequest('createTestCase',{body:{status:'PUBLISHED'}}));
  assert.equal(validateRequest('listTestPlans',{query:{page:0,size:10,sort:['id,asc','name,desc']}}).url,'https://server.contextqa.com/test_plans?page=0&size=10&sort=id%2Casc&sort=name%2Cdesc');
});
test('every catalog operation dispatches its documented method/path with synthetic transport only', async () => {
  const calls=[];
  const client=new ContextQAClient({token,minIntervalMs:0,fetchImpl:async(url,init)=>{calls.push({url,method:init.method});return Response.json({id:10});}});
  for(const op of catalog.operations) {
    const args={query:{},approveWrite:true,approveExecution:true};
    if(op.path.includes('{id}')) args.id=7;
    for(const p of op.parameters.filter(p=>p.in==='query'&&p.required)) {
      args.query[p.name]=p.schema.type==='integer' ? Math.max(p.schema.minimum||0,1) : p.schema.type==='boolean' ? false : p.name==='file_name' ? 'synthetic.apk' : '2026-10-27';
    }
    if(op.contentType==='application/json') args.body={};
    if(op.contentType==='multipart/form-data') args.appFile=new File(['synthetic'],'sample.apk');
    await client.request(op.operationId,args);
    const seen=calls.at(-1);assert.equal(new URL(seen.url).origin,'https://server.contextqa.com');
    assert.equal(new URL(seen.url).pathname,op.path.replace('{id}','7'));assert.equal(seen.method,op.method);
  }
  assert.equal(calls.length,40);
});
test('JSON authoring, private bearer header and no redirects use actual wire shape', async () => {
  const calls=[];
  const c=new ContextQAClient({token,minIntervalMs:0,fetchImpl:async (url,init)=>{calls.push([url,init]); return Response.json({id:42});}});
  await assert.rejects(c.request('createTestCase',{body:{name:'Reviewed'}}),/approveWrite/);
  assert.equal(calls.length,0);
  assert.deepEqual(await c.request('createTestCase',{body:{name:'Reviewed'},approveWrite:true}),{id:42});
  assert.equal(calls[0][0],'https://server.contextqa.com/test_cases');
  assert.equal(calls[0][1].method,'POST'); assert.equal(calls[0][1].redirect,'manual');
  assert.equal(calls[0][1].headers.Authorization,`Bearer ${token}`);
  assert.deepEqual(JSON.parse(calls[0][1].body),{name:'Reviewed'});
  assert.equal(JSON.stringify(c).includes(token),false);
});
test('multipart mobile execution requires approval, is bounded, and uses no invented upload endpoint', async () => {
  let seen;
  const c=new ContextQAClient({token,minIntervalMs:0,fetchImpl:async(url,init)=>{seen={url,init};return Response.json({id:8});}});
  const appFile=new File(['synthetic'],'demo.apk');
  await assert.rejects(c.request('triggerRunWithAppFile',{id:3,appFile}),/approveExecution/);
  await c.request('triggerRunWithAppFile',{id:3,appFile,approveExecution:true});
  assert.equal(seen.url,'https://server.contextqa.com/test_plans/3/execution');
  assert.equal(seen.init.body.get('appFile').name,'demo.apk');
  assert.equal(seen.init.headers['Content-Type'],undefined);
  assert.throws(()=>validateRequest('triggerRunWithAppFile',{id:3,appFile:new File(['x'],'demo.zip')}));
});
test('a trigger transport failure is ambiguous and is never retried', async () => {
  let calls=0;const c=new ContextQAClient({token,minIntervalMs:0,fetchImpl:async()=>{calls++;throw new Error('secret upstream body');}});
  await assert.rejects(c.request('triggerRun',{id:1,approveExecution:true}),e=>e instanceof ContextQAError && e.ambiguous && !e.message.includes('secret'));
  assert.equal(calls,1);
});
test('rate-limit metadata is retained, response contents are suppressed, no retry occurs', async () => {
  let calls=0;const c=new ContextQAClient({token,minIntervalMs:0,fetchImpl:async()=>{calls++;return new Response('private',{status:429,headers:{'retry-after':'8'}});}});
  await assert.rejects(c.request('getTestPlan',{id:1}),e=>e.status===429&&e.retryAfter===8&&!e.message.includes('private'));
  assert.equal(calls,1);
});
test('an undocumented proxy timeout cannot prove a write was rejected',async()=>{
  const client=new ContextQAClient({token,minIntervalMs:0,fetchImpl:async()=>new Response('private',{status:408})});
  await assert.rejects(client.request('createTestCase',{body:{name:'Reviewed'},approveWrite:true}),e=>e.ambiguous===true&&e.status===408);
});
test('response size and redirect failures are bounded and suppress credentials', async () => {
  for(const response of [new Response('x',{headers:{'content-length':'4000001'}}),new Response('private',{status:302,headers:{location:'https://untrusted.invalid'}}),new Response('not json')]) {
    const c=new ContextQAClient({token,minIntervalMs:0,fetchImpl:async()=>response});
    await assert.rejects(c.request('getTestPlan',{id:1}),e=>!e.message.includes(token));
  }
});
test('terminal status alone, no executed tests, missing or conflicting counts never pass',()=>{
  assert.equal(evaluateRun(good).verdict,'passed');
  for(const summary of [{status:'STATUS_COMPLETED'}, {...good,totalCount:0,passedCount:0}, {...good,failedCount:1}, {...good,result:'SKIPPED'}, {...good,status:'STATUS_IN_PROGRESS'}]) assert.equal(evaluateRun(summary).verdict,'inconclusive');
  assert.equal(evaluateRun({...good,result:'FAILURE'}).verdict,'failed');
});
test('polling is bounded and never invokes execution',async()=>{
  const calls=[];const c=new ContextQAClient({token,minIntervalMs:0,fetchImpl:async url=>{calls.push(url);return Response.json({status:'STATUS_QUEUED',result:'QUEUED'});}});
  const result=await c.waitForRun(9,{maxPolls:2,intervalMs:0});
  assert.equal(result.polls,2);assert.equal(result.verdict,'inconclusive');
  assert.deepEqual(calls,['https://server.contextqa.com/test_plan_results/9/results','https://server.contextqa.com/test_plan_results/9/results']);
});
test('execution journal blocks replay and preserves accepted run ID before returning',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'cqa-run-'));const journalFile=join(dir,'run.json');let calls=0;
  try {
    const client=new ContextQAClient({token,minIntervalMs:0,fetchImpl:async()=>{calls++;return Response.json({id:77,url:'https://private.invalid'});}});
    const result=await executePlanOnce({client,planId:5,journalFile,approveExecution:true});assert.equal(result.runId,77);
    const receipt=JSON.parse(await readFile(journalFile));assert.equal(receipt.runId,77);assert.equal(receipt.state,'accepted');assert.equal(JSON.stringify(receipt).includes('private.invalid'),false);
    await assert.rejects(executePlanOnce({client,planId:5,journalFile,approveExecution:true}),/EEXIST/);assert.equal(calls,1);
  } finally {await rm(dir,{recursive:true,force:true});}
});
test('an ambiguous execution stays journaled and blocks replay',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'cqa-unknown-'));const journalFile=join(dir,'run.json');let calls=0;
  try {
    const client=new ContextQAClient({token,minIntervalMs:0,fetchImpl:async()=>{calls++;throw new Error('unknown');}});
    await assert.rejects(executePlanOnce({client,planId:5,journalFile,approveExecution:true}));
    assert.equal(JSON.parse(await readFile(journalFile)).state,'unknown');
    await assert.rejects(executePlanOnce({client,planId:5,journalFile,approveExecution:true}),/EEXIST/);assert.equal(calls,1);
  } finally {await rm(dir,{recursive:true,force:true});}
});
