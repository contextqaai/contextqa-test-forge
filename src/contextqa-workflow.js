import {open} from 'node:fs/promises';
import {dirname} from 'node:path';
import {normalize,sha} from './sources.js';
import {verifySource,validate,approve} from './contracts.js';

const authoring=new Set(['createTestCase','updateTestCase','patchTestCase','createTestStep','updateTestStep','createTestSuite','updateTestSuite','createTestPlan','updateTestPlan']);
const positiveId=value=>(typeof value==='number' || typeof value==='string' && /^\d+$/.test(value)) && Number.isSafeInteger(Number(value)) && Number(value)>0;
const labelPattern=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const plain=value=>value && typeof value==='object' && !Array.isArray(value);

function references(value,ids,path=[]) {
  if(Array.isArray(value)) return value.map((item,index)=>references(item,ids,[...path,index]));
  if(!plain(value)) return value;
  if(Object.hasOwn(value,'$createdId')) {
    const key=[...path].reverse().find(item=>typeof item==='string');
    if(Object.keys(value).length!==1 || !/(?:^id$|Ids?$)/.test(key || '') || !ids.has(value.$createdId)) throw new Error('Created-ID references require a prior create label and a numeric ID field');
    return ids.get(value.$createdId);
  }
  return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,references(item,ids,[...path,key])]));
}

export function validateBundle(bundle,source) {
  if(bundle?.schema!==1 || !Array.isArray(bundle.operations) || bundle.operations.length<1 || bundle.operations.length>50 || Buffer.byteLength(JSON.stringify(bundle))>1_000_000) throw new Error('Authoring bundle requires schema 1 and 1–50 bounded operations');
  verifySource(bundle,source);
  const labels=new Set(),created=new Map();
  for(const item of bundle.operations) {
    if(!labelPattern.test(item.label || '') || labels.has(item.label) || !authoring.has(item.operationId) || !plain(item.body)) throw new Error('Use unique operation labels and supported raw ContextQA authoring payloads');
    if(Object.keys(item).some(key=>!['label','operationId','id','body'].includes(key))) throw new Error('Unknown authoring operation field');
    labels.add(item.label);
    const resolved=references({id:item.id,body:item.body},created);
    if(!item.operationId.startsWith('create') && !positiveId(resolved.id)) throw new Error('Updates require an explicit positive object ID');
    if(item.operationId.startsWith('create') && item.id!==undefined) throw new Error('Create operations do not accept a path ID');
    if(item.operationId.startsWith('create')) created.set(item.label,1);
  }
  return bundle;
}

export function approveBundle(bundle,source,reviewer) {
  validateBundle(bundle,source);
  if(typeof reviewer!=='string' || !reviewer.trim() || reviewer.length>120) throw new Error('Reviewer label required');
  return {schema:1,sourceSha:source.sourceSha,bundleSha:sha(bundle),reviewer,reviewedAt:new Date().toISOString(),approved:true};
}

export function previewBundle(bundle,source,validateRequest) {
  validateBundle(bundle,source);
  if(typeof validateRequest!=='function') throw new Error('ContextQA schema validator required');
  const created=new Map();
  return bundle.operations.map(item=>{
    const args=references({id:item.id,body:item.body},created);
    validateRequest(item.operationId,{...args,approveWrite:true});
    if(item.operationId.startsWith('create')) created.set(item.label,1);
    return {label:item.label,operationId:item.operationId,requestSha:sha(args),usesPriorCreatedIds:JSON.stringify(item).includes('"$createdId"'),note:'Reference previews use positive sentinel IDs; actual IDs come only from successful prior creates'};
  });
}

export async function applyBundle({client,bundle,source,receipt,journalFile,approveWrite=false}) {
  if(approveWrite!==true) throw new Error('Explicit write approval required; authoring changes the ContextQA tenant');
  // Keep exactly the approved data through async file/network operations.
  bundle=structuredClone(bundle);source=structuredClone(source);receipt=structuredClone(receipt);
  validateBundle(bundle,source);
  if(receipt?.approved!==true || receipt.bundleSha!==sha(bundle) || receipt.sourceSha!==source.sourceSha) throw new Error('Unchanged source-bound bundle approval required');
  previewBundle(bundle,source,(operationId,args)=>client.validate(operationId,args));
  // A pre-existing journal is never resumed or replayed, including after a crash.
  const handle=await open(journalFile,'wx',0o600),created=new Map();
  const journal={schema:1,sourceSha:source.sourceSha,bundleSha:sha(bundle),reviewer:receipt.reviewer,state:'in-progress',startedAt:new Date().toISOString(),operations:[]};
  const persist=async()=>{
    const bytes=Buffer.from(JSON.stringify(journal,null,2)+'\n');
    await handle.write(bytes,0,bytes.length,0);await handle.truncate(bytes.length);await handle.sync();
  };
  try {
    await persist();
    const parent=await open(dirname(journalFile),'r');
    try {await parent.sync();} finally {await parent.close();}
    for(const item of bundle.operations) {
      const args=references({id:item.id,body:item.body},created);
      const entry={label:item.label,operationId:item.operationId,state:'attempting',requestSha:sha(args),startedAt:new Date().toISOString()};
      journal.operations.push(entry);await persist();
      try {
        const response=await client.request(item.operationId,{...args,approveWrite:true});
        entry.response=response;entry.state='response-recorded';entry.completedAt=new Date().toISOString();
        if(item.operationId.startsWith('create')) {
          if(!positiveId(response?.id)) {entry.state='unresolved-created-id';journal.state='needs-reconciliation';await persist();return journal;}
          created.set(item.label,Number(response.id));entry.createdId=Number(response.id);
        }
        await persist();
      } catch {
        entry.state='unknown-outcome';journal.state='needs-reconciliation';await persist();return journal;
      }
    }
    journal.state='completed';journal.completedAt=new Date().toISOString();await persist();return journal;
  } finally {await handle.close();}
}

export async function readContextQACase(client,{caseId,stepIds=[]}) {
  if(!positiveId(caseId) || !Array.isArray(stepIds) || stepIds.length>100 || stepIds.some(id=>!positiveId(id)) || new Set(stepIds.map(Number)).size!==stepIds.length) throw new Error('Explicit positive case/step IDs required, at most 100 unique steps');
  stepIds=stepIds.map(Number);caseId=Number(caseId);
  const item=await client.request('getTestCase',{id:Number(caseId)});
  if(String(item?.id)!==String(caseId)) throw new Error('ContextQA returned a different case');
  const steps=[];
  for(const id of stepIds) {
    const step=await client.request('getTestStep',{id:Number(id)});
    if(String(step?.id)!==String(id) || String(step?.testCaseId)!==String(caseId)) throw new Error('ContextQA step does not belong to the selected case');
    steps.push(step);
  }
  const raw={case:item,steps};
  return {schema:1,source:normalize('contextqa',raw,`https://server.contextqa.com/test_cases/${Number(caseId)}`),raw};
}

export function portableMapping(source,mapping,reviewer) {
  if(source?.platform!=='contextqa' || mapping?.schema!==1 || mapping.sourceSha!==source.sourceSha) throw new Error('Reviewed mapping must bind the unchanged ContextQA source');
  const contract={schema:1,sourceSha:source.sourceSha,tests:mapping.tests};
  validate(contract);verifySource(contract,source);
  const known=new Set(source.steps.map(step=>step.id)),covered=new Set();
  if(!known.size) throw new Error('Read explicit ContextQA steps before mapping portable tests');
  for(const test of contract.tests) for(const step of test.steps) {
    if(!Array.isArray(step.sourceStepIds) || !step.sourceStepIds.length || step.sourceStepIds.some(id=>typeof id!=='string' || !known.has(id))) throw new Error('Every portable step needs reviewed known sourceStepIds; selectors and actions are never inferred');
    for(const id of step.sourceStepIds) covered.add(id);
  }
  if(covered.size!==known.size) throw new Error('Mapping must account for every selected ContextQA source step');
  return {contract,approval:approve(contract,reviewer,source),mappingSha:sha(mapping),executed:false};
}
