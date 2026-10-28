import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {normalize} from '../src/sources.js';
import {validate,approve,requireApproval} from '../src/contracts.js';
import {exportProject,render,renderProjectFiles,assertionStepMarker} from '../src/exporters.js';

const source=normalize('json',{id:'synthetic-approval',title:'Synthetic approval requirements',description:'AC-1: approved requests display Approved. AC-2: notify the requester.'});
const makeContract=()=>({
  schema:1,sourceSha:source.sourceSha,
  builder:{agentName:'Approval Guard',ownerName:'Sample SDET',version:'1.0.0',aiProvider:'anthropic'},
  businessGoal:'Give the release reviewer evidence that an approved request displays the agreed status.',
  criteria:[{id:'AC-1',text:'An approved request displays Approved.',sourceReferences:['description / AC-1']},{id:'AC-2',text:'Notify the requester.'}],
  tests:[{id:'approve-request',title:'Synthetic reviewed approval',contextqa:{caseId:'501'},steps:[
    {action:'navigate',env:'SYNTHETIC_APPROVAL_URL',sourceStepIds:['1001'],contextqa:{stepId:'1001'}},
    {action:'assertText',selector:'#status',value:'Approved',criterionIds:['AC-1'],sourceStepIds:['1002'],contextqa:{stepId:'1002'}},
    {action:'assertVisible',selector:'#status'}
  ]}]
});

test('optional builder and criterion metadata leaves legacy contracts valid',()=>{
  const contract=makeContract();
  delete contract.builder;delete contract.businessGoal;delete contract.criteria;
  delete contract.tests[0].contextqa;
  for(const step of contract.tests[0].steps) {delete step.criterionIds;delete step.contextqa;}
  assert.equal(validate(contract),contract);
  assert.doesNotThrow(()=>requireApproval(contract,approve(contract,'Legacy reviewer',source)));
  assert.match(render(contract,'playwright'),/Reviewed by.*: null/);
});

test('metadata validation rejects identity claims, malformed references and misleading assertion links',()=>{
  const invalid=[
    c=>{c.builder.ownerName='';},c=>{c.builder.agentName='a'.repeat(121);},
    c=>{c.builder.version=' ';},c=>{c.builder.aiProvider='';},
    c=>{c.builder.ownerName='Owner\n// injected';},c=>{c.builder.agentName='Owner\u2028injected';},
    c=>{c.builder.ownerName='Owner\u202e';},c=>{c.builder.identityVerified=true;},
    c=>{c.builder.reviewer='Impersonated reviewer';},c=>{c.builder=[];},
    c=>{c.businessGoal='x'.repeat(4001);},c=>{c.criteria=[];},
    c=>{c.criteria.push({...c.criteria[0]});},c=>{c.criteria[0].id='unsafe id';},
    c=>{c.criteria[0].text='';},c=>{c.criteria[0].sourceReferences=[];},
    c=>{c.criteria[0].sourceReferences=['reference','reference'];},
    c=>{c.criteria[0].sourceReferences=['ref\nscript'];},c=>{c.criteria[0].verified=true;},
    c=>{c.tests[0].steps[0].criterionIds=['AC-1'];},
    c=>{c.tests[0].steps[1].criterionIds=['AC-MISSING'];},
    c=>{c.tests[0].steps[1].criterionIds=['AC-1','AC-1'];},
    c=>{c.tests[0].steps[1].criterionIds=[];},
    c=>{c.tests[0].contextqa.caseId=501;},c=>{c.tests[0].contextqa.caseId='0';},
    c=>{c.tests[0].contextqa.caseId='9007199254740992';},
    c=>{c.tests[0].contextqa.runId='999';},
    c=>{c.tests[0].steps[1].contextqa.stepId='not-a-native-id';},
    c=>{delete c.tests[0].contextqa;},c=>{c.tests[0].steps[1].contextqa.stepId='1003';},
    c=>{c.codeStyle={pattern:'java-pojo'};},c=>{c.codeStyle={pattern:'inline',indent:8};},
    c=>{c.codeStyle={pattern:'page-object',template:'process.exit(1)'};}
  ];
  for(const mutate of invalid) {
    const contract=makeContract();mutate(contract);
    assert.throws(()=>validate(contract),Error,mutate.toString());
  }
});

test('all builder, business and native reference edits invalidate the original approval',()=>{
  const contract=makeContract(),receipt=approve(contract,'Actual local reviewer',source);
  for(const mutate of [
    c=>{c.builder.ownerName='Another owner';},c=>{c.builder.version='1.0.1';},
    c=>{c.builder.aiProvider='openai';},c=>{c.businessGoal='A different business outcome';},
    c=>{c.criteria[0].text='A changed requirement';},c=>{c.criteria[0].sourceReferences=['description / changed'];},
    c=>{c.tests[0].steps[1].criterionIds=['AC-2'];},c=>{c.tests[0].contextqa.caseId='502';},
    c=>{c.tests[0].steps[1].contextqa.stepId='1003';c.tests[0].steps[1].sourceStepIds=['1003'];},
    c=>{c.codeStyle={pattern:'page-object',indent:4};}
  ]) {
    const changed=structuredClone(contract);mutate(changed);
    assert.throws(()=>requireApproval(changed,receipt),/approval/);
  }
  for(const property of ['reviewer','reviewedAt']) {
    const changed={...receipt};delete changed[property];
    assert.throws(()=>requireApproval(contract,changed),/reviewer label and timestamp/);
  }
});

for(const framework of ['playwright','selenium','webdriverio']) test(`${framework} exports truthful identity and business assertion traceability`,async()=>{
  const temp=await mkdtemp(join(tmpdir(),'forge-builder-'));
  try {
    const contract=makeContract();
    // Unknown legacy root fields must never become identity, execution or healing claims.
    contract.reviewer='Impersonated reviewer';contract.executed=true;contract.healed=true;
    const receipt=approve(contract,'Actual local reviewer',source),out=join(temp,framework);
    await exportProject(contract,receipt,framework,out);
    const trace=JSON.parse(await readFile(join(out,'traceability.json'),'utf8'));
    assert.equal(trace.builder.ownerName,'Sample SDET');
    assert.equal(trace.builder.attribution,'self-declared');
    assert.equal(trace.builder.identityVerified,false);assert.equal(trace.builder.aiUsageVerified,false);
    assert.equal(trace.review.reviewer,'Actual local reviewer');assert.equal(trace.review.identityVerified,false);
    assert.equal(trace.businessGoal,contract.businessGoal);
    assert.equal(trace.criteria[0].sourceSha,source.sourceSha);
    assert.deepEqual(trace.criteria[0].sourceReferences,['description / AC-1']);
    assert.equal(trace.criteria[0].sourceReferenceStatus,'reviewer-described');
    assert.deepEqual(trace.criteria[0].assertions,[{testId:'approve-request',stepIndex:2,action:'assertText',codeMarker:assertionStepMarker(0,1),codeFile:'tests.spec.js'}]);
    assert.equal(trace.criteria[0].status,'mapped-not-executed');
    assert.equal(trace.criteria[1].sourceReferenceStatus,'not-provided');
    assert.deepEqual(trace.uncoveredCriteria,['AC-2']);
    assert.deepEqual(trace.unlinkedAssertions,[{testId:'approve-request',stepIndex:3,action:'assertVisible'}]);
    assert.deepEqual(trace.tests[0].contextqa,{caseId:'501'});
    assert.deepEqual(trace.tests[0].assertions[0].contextqa,{stepId:'1002'});
    assert.deepEqual(trace.tests[0].sourceSteps,[{stepIndex:1,sourceStepIds:['1001']},{stepIndex:2,sourceStepIds:['1002']}]);
    assert.equal(trace.tests[0].assertions[0].observedResult,null);
    assert.equal(trace.executed,false);assert.deepEqual(trace.execution,{status:'not-executed',reference:null});
    const code=await readFile(join(out,'tests.spec.js'),'utf8');
    assert.match(code,/self-declared; identity not verified/);
    assert.match(code,/"Actual local reviewer"/);assert.ok(!code.includes('Impersonated reviewer'));
    assert.ok(code.includes(`"codeMarker":"${assertionStepMarker(0,1)}","criterionIds":["AC-1"]`));
    assert.match(code,/No run or healing is claimed/);
    const readme=await readFile(join(out,'README.md'),'utf8');
    assert.ok(readme.includes('"ownerName": "Sample SDET"'));
    assert.ok(readme.includes('"reviewedBy": "Actual local reviewer"'));
    assert.ok(!readme.includes('Impersonated reviewer'));
    const syntax=spawnSync(process.execPath,['--check',join(out,'tests.spec.js')],{encoding:'utf8'});
    assert.equal(syntax.status,0,syntax.stderr);
  } finally {await rm(temp,{recursive:true,force:true});}
});

for(const indent of [2,4]) test(`Playwright page-object export preserves review and safe files with indent ${indent}`,async()=>{
  const temp=await mkdtemp(join(tmpdir(),'forge-pom-'));
  try {
    const contract=makeContract();contract.codeStyle={pattern:'page-object',indent};
    const receipt=approve(contract,'POM reviewer',source),out=join(temp,'project');
    const generated=renderProjectFiles(contract,'playwright',receipt);
    assert.deepEqual(Object.keys(generated),['tests.spec.js','pages/workflow-1.js']);
    assert.match(generated['tests.spec.js'],/import \{Workflow1Page\} from '\.\/pages\/workflow-1\.js';/);
    assert.match(generated['tests.spec.js'],/await workflow\.assertTextStep2\(\);/);
    assert.ok(generated['tests.spec.js'].includes(' '.repeat(indent)+'const workflow = new Workflow1Page(page);'));
    assert.ok(generated['pages/workflow-1.js'].includes(' '.repeat(indent*2)+'await expect(page.locator("#status")).toHaveText("Approved");'));
    assert.ok(generated['pages/workflow-1.js'].includes('navigation(required("SYNTHETIC_APPROVAL_URL"))'));
    assert.throws(()=>render(contract,'selenium',receipt),/only for Playwright/);
    assert.throws(()=>render(contract,'webdriverio',receipt),/only for Playwright/);
    await exportProject(contract,receipt,'playwright',out);
    for(const [filename,expected] of Object.entries(generated)) {
      assert.equal(await readFile(join(out,filename),'utf8'),expected);
      const syntax=spawnSync(process.execPath,['--check',join(out,filename)],{encoding:'utf8'});
      assert.equal(syntax.status,0,syntax.stderr);
    }
    const trace=JSON.parse(await readFile(join(out,'traceability.json'),'utf8'));
    assert.deepEqual(trace.codeStyle,{pattern:'page-object',indent});
    assert.equal(trace.criteria[0].assertions[0].codeFile,'pages/workflow-1.js');
    assert.equal(trace.tests[0].assertions[0].codeFile,'pages/workflow-1.js');
    await assert.rejects(exportProject(contract,receipt,'playwright',out),/EEXIST/);
    assert.equal(await readFile(join(out,'pages/workflow-1.js'),'utf8'),generated['pages/workflow-1.js']);
  } finally {await rm(temp,{recursive:true,force:true});}
});

async function exerciseTemplate(contract) {
  const calls=[],pending=[],state={'#status':'Pending'};
  const page={
    url:null,
    async goto(url) {calls.push(['navigate',url]);this.url=url;},
    locator(selector) {return {selector,
      async fill(value) {calls.push(['fill',selector,value]);state[selector]=value;},
      async click() {calls.push(['click',selector]);state['#status']='Approved';},
      async selectOption(value) {calls.push(['select',selector,value]);state[selector]=value;},
      async check() {calls.push(['check',selector]);state[selector]=true;}
    };}
  };
  const expect=target=>({
    async toHaveText(value) {calls.push(['assertText',target.selector,value]);assert.equal(state[target.selector],value);},
    async toBeVisible() {calls.push(['assertVisible',target.selector]);assert.ok(Object.hasOwn(state,target.selector));},
    async toHaveURL(value) {calls.push(['assertUrl',value]);assert.equal(target.url,value);}
  });
  const context={URL,expect,process:{env:{SYNTHETIC_APPROVAL_URL:'https://synthetic.example.test/approval'}},test:(name,callback)=>pending.push(callback({page}))};
  const files=renderProjectFiles(contract,'playwright');
  for(const [filename,code] of Object.entries(files).filter(([name])=>name.startsWith('pages/'))) {
    const className=code.match(/export class (Workflow\d+Page)/)[1];
    context[className]=runInNewContext(code.replace(/^import .*;$/gm,'').replace('export class ','class ')+`\n${className};`,context);
  }
  runInNewContext(files['tests.spec.js'].replace(/^import .*;$/gm,''),context);
  await Promise.all(pending);
  return calls;
}

test('inline and page-object templates perform identical ordered actions and retain assertion failures',async()=>{
  const contract=makeContract();
  contract.tests[0].steps=[
    {action:'navigate',env:'SYNTHETIC_APPROVAL_URL'},
    {action:'fill',selector:'#name',value:'Sample reviewer'},
    {action:'select',selector:'#category',value:'standard'},
    {action:'check',selector:'#confirmed'},
    {action:'click',selector:'#approve'},
    {action:'assertText',selector:'#status',value:'Approved',criterionIds:['AC-1']},
    {action:'assertVisible',selector:'#status'},
    {action:'assertUrl',value:'https://synthetic.example.test/approval'}
  ];
  const inline=await exerciseTemplate(contract);
  contract.codeStyle={pattern:'page-object',indent:4};
  assert.deepEqual(await exerciseTemplate(contract),inline);
  assert.equal(inline.length,8);
  contract.tests[0].steps[5].value='Denied';
  await assert.rejects(exerciseTemplate(contract),{code:'ERR_ASSERTION'});
  contract.codeStyle={pattern:'inline',indent:2};
  await assert.rejects(exerciseTemplate(contract),{code:'ERR_ASSERTION'});
  const invalid=makeContract();invalid.codeStyle={pattern:'page-object'};invalid.tests[0].steps[0].action='constructor';
  assert.throws(()=>renderProjectFiles(invalid,'playwright'),/Unsupported page-object action/);
});

test('export snapshots approved identity, style and environment references before asynchronous writes',async()=>{
  const temp=await mkdtemp(join(tmpdir(),'forge-snapshot-'));
  try {
    const contract=makeContract();contract.codeStyle={pattern:'page-object',indent:2};
    const receipt=approve(contract,'Snapshot reviewer',source),out=join(temp,'project');
    const expectedSha=receipt.contractSha;
    const exported=exportProject(contract,receipt,'playwright',out);
    contract.builder.ownerName='Changed during write';contract.codeStyle.pattern='inline';
    contract.tests[0].steps[0].env='UNAPPROVED_URL';receipt.reviewer='Changed reviewer';
    await exported;
    const trace=JSON.parse(await readFile(join(out,'traceability.json'),'utf8'));
    assert.equal(trace.contractSha,expectedSha);assert.equal(trace.builder.ownerName,'Sample SDET');
    assert.equal(trace.review.reviewer,'Snapshot reviewer');assert.equal(trace.codeStyle.pattern,'page-object');
    assert.equal(await readFile(join(out,'.env.example'),'utf8'),'SYNTHETIC_APPROVAL_URL=\n');
    assert.ok((await readFile(join(out,'pages/workflow-1.js'),'utf8')).includes('SYNTHETIC_APPROVAL_URL'));
  } finally {await rm(temp,{recursive:true,force:true});}
});

test('recorded reviewer labels cannot inject generated code comments',async()=>{
  const temp=await mkdtemp(join(tmpdir(),'forge-comment-'));
  try {
    const contract=makeContract();
    contract.builder.agentName='Agent */ " ; throw new Error("must remain text")';
    const reviewer='Reviewer\n*/\nthrow new Error("injected");\u2028//';
    const receipt=approve(contract,reviewer,source),out=join(temp,'project');
    await exportProject(contract,receipt,'playwright',out);
    const code=await readFile(join(out,'tests.spec.js'),'utf8');
    const line=code.split('\n').find(line=>line.startsWith('// Reviewed by'));
    assert.ok(line.includes('\\n*/\\nthrow new Error'));
    assert.ok(line.includes('\\u2028'));
    assert.ok(!code.split('\n').some(line=>line.startsWith('throw new Error("injected")')));
    assert.equal(spawnSync(process.execPath,['--check',join(out,'tests.spec.js')]).status,0);
    const trace=JSON.parse(await readFile(join(out,'traceability.json'),'utf8'));
    assert.equal(trace.review.reviewer,reviewer);
  } finally {await rm(temp,{recursive:true,force:true});}
});
