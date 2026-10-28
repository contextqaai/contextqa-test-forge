import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {normalize} from '../src/sources.js';
import {ContextQAClient,validateRequest} from '../src/contextqa.js';
import {approveBundle,previewBundle,applyBundle,readContextQACase,portableMapping} from '../src/contextqa-workflow.js';
const source=normalize('json',{id:'manual-1',title:'Synthetic requirement'});
const bundle={schema:1,sourceSha:source.sourceSha,operations:[{label:'case',operationId:'createTestCase',body:{name:'Synthetic case',workspaceVersionId:42}},{label:'step',operationId:'createTestStep',body:{testCaseId:{$createdId:'case'},description:'Reviewed action'}}]};
const response=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
const fake=fetchImpl=>new ContextQAClient({token:'synthetic-test-only',minIntervalMs:0,fetchImpl});

test('authoring bundle source/review/reference/schema gates fail before network',async()=>{
  let calls=0;const client=fake(async()=>{calls++;return response({id:201});});
  const receipt=approveBundle(bundle,source,'reviewer');
  await assert.rejects(applyBundle({client,bundle,source,receipt,journalFile:'/not-used'}),/approval/);
  const altered=structuredClone(bundle);altered.operations[0].body.name='changed';
  await assert.rejects(applyBundle({client,bundle:altered,source,receipt,journalFile:'/not-used',approveWrite:true}),/approval/);
  const invalid=structuredClone(bundle);invalid.operations[0].body.nonexistentField='not in DTO';
  assert.throws(()=>previewBundle(invalid,source,validateRequest),/absent/);
  const wrongRef=structuredClone(bundle);wrongRef.operations[0].body.name={$createdId:'case'};
  assert.throws(()=>approveBundle(wrongRef,source,'reviewer'),/references/);
  const execution=structuredClone(bundle);execution.operations[0].operationId='triggerRun';
  assert.throws(()=>approveBundle(execution,source,'reviewer'),/supported/);
  assert.equal(calls,0);
});

test('authoring records intent before send, resolves returned IDs and refuses any journal replay',async()=>{
  const temp=await mkdtemp(join(tmpdir(),'forge-authoring-'));
  try {
    const journalFile=join(temp,'journal.json');let calls=0;
    const client=fake(async(url,options)=>{
      const intent=JSON.parse(await readFile(journalFile,'utf8'));
      assert.equal(intent.operations.at(-1).state,'attempting');
      if(++calls===2) assert.equal(JSON.parse(options.body).testCaseId,201);
      return response({id:calls===1?201:301});
    });
    const receipt=approveBundle(bundle,source,'reviewer');
    const result=await applyBundle({client,bundle,source,receipt,journalFile,approveWrite:true});
    assert.equal(result.state,'completed');assert.equal(result.operations[0].createdId,201);assert.equal(calls,2);
    await assert.rejects(applyBundle({client,bundle,source,receipt,journalFile,approveWrite:true}),/EEXIST/);
    assert.equal(calls,2);
  } finally {await rm(temp,{recursive:true,force:true});}
});

test('partial writes and absent created IDs stop and preserve an unresolved journal without retry',async()=>{
  for(const mode of ['network','missing-id']) {
    const temp=await mkdtemp(join(tmpdir(),'forge-partial-'));
    try {
      let calls=0;const client=fake(async()=>{calls++;if(mode==='missing-id')return response({accepted:true});if(calls===1)return response({id:201});throw new Error('private provider detail');});
      const result=await applyBundle({client,bundle,source,receipt:approveBundle(bundle,source,'reviewer'),journalFile:join(temp,'journal.json'),approveWrite:true});
      assert.equal(result.state,'needs-reconciliation');assert.equal(calls,mode==='network'?2:1);
      assert.ok(!JSON.stringify(result).includes('private provider detail'));
      assert.equal(result.operations.at(-1).state,mode==='network'?'unknown-outcome':'unresolved-created-id');
    } finally {await rm(temp,{recursive:true,force:true});}
  }
});

test('authoring snapshots approved data before any async work',async()=>{
  const temp=await mkdtemp(join(tmpdir(),'forge-immutable-'));
  try {
    const mutable=structuredClone(bundle),receipt=approveBundle(mutable,source,'reviewer');let calls=0;
    const client=fake(async(url,options)=>{
      if(++calls===1) mutable.operations[1].body.description='Unreviewed concurrent change';
      else assert.equal(JSON.parse(options.body).description,'Reviewed action');
      return response({id:calls===1?201:301});
    });
    const result=await applyBundle({client,bundle:mutable,source,receipt,journalFile:join(temp,'journal.json'),approveWrite:true});
    assert.equal(result.state,'completed');assert.equal(calls,2);
  } finally {await rm(temp,{recursive:true,force:true});}
});

test('case reads verify IDs/parents and never infer portable selectors',async()=>{
  const fixture=JSON.parse(await readFile('examples/fixtures/contextqa.json','utf8'));
  const client=fake(async url=>response(new URL(url).pathname.startsWith('/test_cases/')?fixture.case:fixture.steps[0]));
  const imported=await readContextQACase(client,{caseId:101,stepIds:[701]});
  assert.equal(imported.source.platform,'contextqa');assert.equal(imported.source.steps[0].id,'701');
  assert.equal(imported.source.contextqa.caseSettings.workspaceVersionId,42);
  assert.notEqual(normalize('contextqa',{...fixture,case:{...fixture.case,environmentId:99}}).sourceSha,normalize('contextqa',fixture).sourceSha);
  assert.equal(imported.source.steps[0].selector,undefined);
  const mapping={schema:1,sourceSha:imported.source.sourceSha,tests:[{id:'mapped',title:'Reviewed mapping',steps:[{action:'assertText',selector:'#result',value:'Saved',sourceStepIds:['701']}]}]};
  assert.equal(portableMapping(imported.source,mapping,'reviewer').executed,false);
  for(const mutate of [m=>{m.tests[0].steps[0].selector='';},m=>{m.tests[0].steps[0].sourceStepIds=['999'];},m=>{m.sourceSha='a'.repeat(64);}]) {
    const changed=structuredClone(mapping);mutate(changed);assert.throws(()=>portableMapping(imported.source,changed,'reviewer'));
  }
  const wrong=fake(async url=>response(new URL(url).pathname.startsWith('/test_cases/')?fixture.case:{...fixture.steps[0],testCaseId:999}));
  await assert.rejects(readContextQACase(wrong,{caseId:101,stepIds:[701]}),/belong/);
  const selected=[701];let reads=0;
  const mutation=fake(async url=>{reads++;if(new URL(url).pathname.startsWith('/test_cases/')) {selected.push(702);return response(fixture.case);}return response(fixture.steps[0]);});
  await readContextQACase(mutation,{caseId:101,stepIds:selected});assert.equal(reads,2);
});

test('reviewed ContextQA settings retain documented environment/data/prerequisite/browser fields',async()=>{
  const settings=JSON.parse(await readFile('examples/fixtures/contextqa-settings.synthetic.json','utf8'));
  for(const [operationId,body] of [
    ['createTestCase',{workspaceVersionId:settings.workspaceVersionId,environmentId:settings.environmentId,testDataId:settings.testDataId,isDataDriven:true,prerequisiteTestCaseIds:[71],preRequisite:71}],
    ['createTestStep',{testCaseId:101,preRequisiteStepId:72,testDataId:61,forLoopTestDataId:62}],
    ['createTestSuite',{preRequisite:73,testCaseIds:[101]}],
    ['createTestPlan',{environmentId:51,testPlanType:'CROSS_BROWSER',parallelNode:2,reRunType:'NONE',retrySessionCreation:false,retrySessionCreationTimeout:30,testDevices:[{...settings.devices[0],suiteIds:[301]},{...settings.devices[1],planSuites:[{suiteId:301,orderIndex:0}]}]}]
  ]) assert.deepEqual(JSON.parse(validateRequest(operationId,{body}).body),body);
  assert.throws(()=>validateRequest('createTestPlan',{body:{testPlanType:'INVENTED'}}),/enum/);
});

test('offline bundle CLI previews and approves without a token and refuses receipt overwrite',async()=>{
  const temp=await mkdtemp(join(tmpdir(),'forge-bundle-cli-'));
  try {
    const sourceFile=join(temp,'source.json'),bundleFile=join(temp,'bundle.json'),receipt=join(temp,'approval.json');
    await writeFile(sourceFile,JSON.stringify(source));await writeFile(bundleFile,JSON.stringify(bundle));
    const run=args=>spawnSync(process.execPath,['scripts/contextqa-workflow.js',...args],{encoding:'utf8',env:{...process.env,CONTEXTQA_API_TOKEN:''}});
    const preview=run(['preview-bundle','--source',sourceFile,'--bundle',bundleFile,'--out',join(temp,'preview.json')]);
    assert.equal(preview.status,0,preview.stderr);
    const args=['approve-bundle','--source',sourceFile,'--bundle',bundleFile,'--reviewer','Synthetic CLI reviewer','--confirm-reviewed','--out',receipt];
    assert.equal(run(args).status,0);assert.equal(JSON.parse(await readFile(receipt)).approved,true);
    assert.equal(run(args).status,1);
  } finally {await rm(temp,{recursive:true,force:true});}
});

test('mock workflow example preserves native configuration in full PUT request payloads',async()=>{
  const temp=await mkdtemp(join(tmpdir(),'forge-contextqa-demo-'));
  try {
    const out=join(temp,'demo');
    const run=spawnSync(process.execPath,['examples/contextqa-workflow.js',out],{encoding:'utf8'});
    assert.equal(run.status,0,run.stderr);
    const journal=JSON.parse(await readFile(join(out,'write-journal.json')));
    for(const kind of ['case','step','suite','plan']) {
      const original=journal.operations.find(item=>item.label===kind).response;
      const updated=journal.operations.find(item=>item.label===kind+'-update').response;
      for(const [key,value] of Object.entries(original)) if(!['name','description'].includes(key)) assert.deepEqual(updated[key],value,`${kind}.${key} preserved`);
    }
    const result=JSON.parse(await readFile(join(out,'result.json')));
    assert.equal(result.liveNetworkCalls,0);assert.equal(result.mockedApiRequests.length,11);
    for(const framework of ['playwright','selenium','webdriverio']) {
      const trace=JSON.parse(await readFile(join(out,framework,'traceability.json')));
      assert.deepEqual(trace.tests[0].sourceSteps,[1,2,3].map(stepIndex=>({stepIndex,sourceStepIds:['701']})));
      assert.ok(!JSON.stringify(trace.tests[0].sourceSteps).includes('#result'));
    }
  } finally {await rm(temp,{recursive:true,force:true});}
});
