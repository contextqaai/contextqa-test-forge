import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {ContextQAClient} from '../src/contextqa.js';
import {inspectProject,runProject,validateProject} from '../src/contextqa-project.js';

const profile={schema:1,name:'synthetic',plan:{id:1,expect:{environmentId:2,parallelNode:2,testPlanType:'CROSS_BROWSER',testDevices:[{browser:'chrome'},{browser:'firefox'}]}},cases:[{id:3,expect:{testDataId:4,isDataDriven:true,prerequisiteTestCaseIds:[5]}}],suites:[{id:6,expect:{preRequisite:7,testCasesDto:[{id:3}]}}],steps:[{id:8,expect:{testCaseId:3,preRequisiteStepId:9}}],execution:{maxPolls:2,intervalMs:0}};
const summary={status:'STATUS_COMPLETED',result:'SUCCESS',totalCount:4,passedCount:4,failedCount:0,abortedCount:0,stoppedCount:0,notExecutedCount:0};
function setup(changes={}) {
  const calls=[];const bodies={'/test_plans/1':{id:1,...profile.plan.expect,...changes},'/test_cases/3':{id:3,...profile.cases[0].expect},'/test_suites/6':{id:6,...profile.suites[0].expect},'/test_steps/8':{id:8,...profile.steps[0].expect},'/test_plans/1/execution':{id:99},'/test_plan_results/99/results':summary};
  const client=new ContextQAClient({token:'synthetic',minIntervalMs:0,fetchImpl:async url=>{const p=new URL(url).pathname;calls.push(p);if(!(p in bodies))throw Error('Unexpected endpoint');return Response.json(bodies[p]);}});
  return {client,calls};
}
test('saved-plan preflight verifies environment, data, prerequisites, suite and full browser matrix',async()=>{
  const {client,calls}=setup();const r=await inspectProject(client,profile);
  assert.equal(r.checked,true);assert.equal(r.paidExecutionStarted,false);assert.equal(r.observed.plan.parallelNode,2);
  assert.deepEqual(calls,['/test_plans/1','/test_cases/3','/test_suites/6','/test_steps/8']);
});
test('configuration drift prevents any execution, including reduced browser matrix',async()=>{
  const {client,calls}=setup({testDevices:[{browser:'chrome'}]});
  await assert.rejects(inspectProject(client,profile),/drift/);assert.equal(calls.length,1);
});
test('project execution uses hosted trigger once, preserves configured settings, journals ID then polls',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'cqa-project-'));
  try {
    const {client,calls}=setup();const journalFile=join(dir,'run.json');
    const r=await runProject({client,profile,journalFile,approveExecution:true});
    assert.equal(r.verdict,'passed');assert.equal(r.provider,'contextqa');assert.equal(r.modelTokens,null);
    assert.equal(JSON.parse(await readFile(journalFile)).runId,99);
    assert.equal(calls.filter(x=>x.endsWith('/execution')).length,1);
    assert.equal(calls.at(-1),'/test_plan_results/99/results');
  } finally {await rm(dir,{recursive:true,force:true});}
});
test('explicit approval and valid review expectations required before execution',async()=>{
  const {client,calls}=setup();await assert.rejects(runProject({client,profile,journalFile:'unused'}),/approval/);assert.equal(calls.length,0);
  assert.throws(()=>validateProject({...profile,plan:{id:1,expect:{}}}));
  assert.throws(()=>validateProject({...profile,execution:{maxPolls:10000}}));
});
test('caller mutation during a read cannot substitute an unreviewed plan or environment',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'cqa-mutation-'));
  try {
    const input=structuredClone(profile);const {client}=setup();const request=client.request.bind(client);const seen=[];
    client.request=async(operation,args)=>{
      if(operation==='getTestStep') {input.plan.id=999;input.execution.query={environment:'unreviewed'};}
      if(operation==='triggerRun') seen.push(args);
      return request(operation,args);
    };
    const result=await runProject({client,profile:input,journalFile:join(dir,'run.json'),approveExecution:true});
    assert.equal(result.verdict,'passed');assert.equal(seen[0].id,1);assert.deepEqual(seen[0].query,{});
  }finally{await rm(dir,{recursive:true,force:true});}
});
