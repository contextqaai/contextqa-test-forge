import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {ContextQAClient} from '../src/contextqa.js';
import {normalize} from '../src/sources.js';
import {approveBundle,applyBundle,readContextQACase,portableMapping} from '../src/contextqa-workflow.js';
import {exportProject} from '../src/exporters.js';

// Every API response, tenant ID and token in this example is synthetic. Never send its bundle live.
const output=process.argv[2] || `output/contextqa-${Date.now()}`;
await mkdir(output,{recursive:true,mode:0o700});
const save=(name,value)=>writeFile(join(output,name),JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
const fixture=JSON.parse(await readFile('examples/fixtures/contextqa.json','utf8'));
const settings=JSON.parse(await readFile('examples/fixtures/contextqa-settings.synthetic.json','utf8'));
let nextId=200;
const requests=[];
const client=new ContextQAClient({token:'synthetic-no-live-token',minIntervalMs:0,fetchImpl:async(url,options)=>{
  const path=new URL(url).pathname;requests.push({method:options.method,path});
  let result;
  if(options.method==='GET' && path==='/test_cases/101') result=fixture.case;
  else if(options.method==='GET' && path==='/test_steps/701') result=fixture.steps[0];
  else if(options.method==='POST') result={...JSON.parse(options.body),id:nextId++};
  else result={...JSON.parse(options.body),id:Number(path.split('/').at(-1))};
  return new Response(JSON.stringify(result),{headers:{'Content-Type':'application/json'}});
}});
const source=normalize('json',{id:'PREF-001',title:'Save account preferences',description:'Synthetic manual case. Save changes and observe Saved confirmation.'});
const ref=label=>({$createdId:label});
const caseBody={name:'Synthetic preference check',description:'Mock authoring example only',workspaceVersionId:settings.workspaceVersionId,environmentId:settings.environmentId,testDataId:settings.testDataId,isDataDriven:true,prerequisiteTestCaseIds:[settings.prerequisiteCaseId],preRequisite:settings.prerequisiteCaseId};
const stepBody={testCaseId:ref('case'),position:1,description:'Save preferences and check confirmation',action:'Save preferences',type:'AI_ACTION',exceptedResult:'Saved',preRequisiteStepId:settings.prerequisiteStepId,testDataId:settings.testDataId,forLoopTestDataId:settings.forLoopTestDataId};
const suiteBody={name:'Synthetic suite',workspaceVersionId:settings.workspaceVersionId,testCaseIds:[ref('case')],preRequisite:settings.prerequisiteSuiteId};
const planBody={name:'Synthetic plan',workspaceVersionId:settings.workspaceVersionId,environmentId:settings.environmentId,testPlanType:'CROSS_BROWSER',parallelNode:2,reRunType:'NONE',retrySessionCreation:false,retrySessionCreationTimeout:30,testDevices:settings.devices.map((device,index)=>({...device,workspaceVersionId:settings.workspaceVersionId,...(index===0?{suiteIds:[ref('suite')]}:{planSuites:[{suiteId:ref('suite'),orderIndex:0}]})}))};
const bundle={schema:1,sourceSha:source.sourceSha,operations:[
  {label:'case',operationId:'createTestCase',body:caseBody},
  {label:'step',operationId:'createTestStep',body:stepBody},
  {label:'suite',operationId:'createTestSuite',body:suiteBody},
  {label:'plan',operationId:'createTestPlan',body:planBody},
  {label:'case-update',operationId:'updateTestCase',id:ref('case'),body:{...caseBody,name:'Synthetic reviewed preference check'}},
  {label:'case-patch',operationId:'patchTestCase',id:ref('case'),body:{description:'Controlled synthetic revision'}},
  {label:'step-update',operationId:'updateTestStep',id:ref('step'),body:{...stepBody,description:'Reviewed synthetic action'}},
  {label:'suite-update',operationId:'updateTestSuite',id:ref('suite'),body:{...suiteBody,description:'Reviewed synthetic suite'}},
  {label:'plan-update',operationId:'updateTestPlan',id:ref('plan'),body:{...planBody,description:'Reviewed synthetic plan'}}
]};
const receipt=approveBundle(bundle,source,'Repository-owned synthetic authoring example');
await save('source.json',source);await save('bundle.json',bundle);await save('approval.json',receipt);
const journal=await applyBundle({client,bundle,source,receipt,journalFile:join(output,'write-journal.json'),approveWrite:true});
const imported=await readContextQACase(client,{caseId:101,stepIds:[701]});
await save('contextqa-source.json',imported.source);
const html='<!doctype html><button id="save" onclick="document.querySelector(\'#result\').textContent=\'Saved\'">Save</button><p id="result">Unsaved</p>';
const mapping={schema:1,sourceSha:imported.source.sourceSha,tests:[{id:'preferences-save',title:'Mapped synthetic ContextQA step',steps:[
  {action:'navigate',value:'data:text/html,'+encodeURIComponent(html),sourceStepIds:['701']},
  {action:'click',selector:'#save',sourceStepIds:['701']},
  {action:'assertText',selector:'#result',value:'Saved',sourceStepIds:['701']}
]}]};
await save('portable-mapping.json',mapping);
const portable=portableMapping(imported.source,mapping,'Repository-owned reviewed synthetic mapping');
await save('portable-contract.json',portable.contract);await save('portable-approval.json',portable.approval);
for(const framework of ['playwright','selenium','webdriverio']) await exportProject(portable.contract,portable.approval,framework,join(output,framework));
const result={schema:1,mode:'mocked-contextqa-transport',liveNetworkCalls:0,modelCalls:0,paidExecutionStarted:false,authoringState:journal.state,mockedApiRequests:requests,portableProjects:3,browserExecuted:false,limitations:['Synthetic tenant IDs/payloads are not live templates','No hosted execution or billing acceptance test','Portable selectors were explicitly mapped, not inferred']};
await save('result.json',result);
console.log(JSON.stringify({output,mode:result.mode,authoringState:result.authoringState,mockedApiRequests:requests.length,liveNetworkCalls:0,modelCalls:0,browserExecuted:false}));
