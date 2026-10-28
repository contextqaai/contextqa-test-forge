import {sha} from './sources.js';
const actions=new Set(['navigate','click','fill','select','check','assertText','assertVisible','assertUrl']);
const safeId=/^[A-Za-z0-9_-]{1,120}$/;
const nativeId=id=>typeof id==='string' && /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id));
function metadataObject(value,keys,label) {
  if(!value || typeof value!=='object' || Array.isArray(value) || ![Object.prototype,null].includes(Object.getPrototypeOf(value)) || Object.keys(value).some(key=>!keys.includes(key))) throw new Error(`Invalid ${label} fields`);
}
function metadataText(value,max,label) {
  if(typeof value!=='string' || !value.trim() || value.length>max || /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u.test(value)) throw new Error(`Invalid ${label}`);
}
function idList(value,known,label) {
  if(!Array.isArray(value) || !value.length || value.length>100 || new Set(value).size!==value.length || value.some(id=>typeof id!=='string' || !safeId.test(id) || (known && !known.has(id)))) throw new Error(`Invalid ${label}`);
}
// Optional, additive metadata. These are reviewed declarations, never identity or run proof.
export function validateMetadata(contract) {
  if(contract.codeStyle!==undefined) {
    metadataObject(contract.codeStyle,['pattern','indent'],'code style');
    if(!['inline','page-object'].includes(contract.codeStyle.pattern) || (contract.codeStyle.indent!==undefined && ![2,4].includes(contract.codeStyle.indent))) throw new Error('Code style requires inline or page-object and optional indent 2 or 4');
  }
  if(contract.builder!==undefined) {
    metadataObject(contract.builder,['agentName','ownerName','version','aiProvider'],'builder');
    for(const name of ['agentName','ownerName']) metadataText(contract.builder[name],120,`builder ${name}`);
    metadataText(contract.builder.version,80,'builder version');
    if(contract.builder.aiProvider!==undefined) metadataText(contract.builder.aiProvider,80,'builder aiProvider');
  }
  if(contract.businessGoal!==undefined) metadataText(contract.businessGoal,4000,'business goal');
  const criteria=new Set();
  if(contract.criteria!==undefined) {
    if(!Array.isArray(contract.criteria) || !contract.criteria.length || contract.criteria.length>100) throw new Error('Criteria require 1–100 reviewed entries');
    for(const criterion of contract.criteria) {
      metadataObject(criterion,['id','text','sourceReferences'],'criterion');
      if(typeof criterion.id!=='string' || !safeId.test(criterion.id) || criteria.has(criterion.id)) throw new Error('Criteria need unique safe IDs');
      criteria.add(criterion.id);
      metadataText(criterion.text,4000,'criterion text');
      if(criterion.sourceReferences!==undefined) {
        if(!Array.isArray(criterion.sourceReferences) || !criterion.sourceReferences.length || criterion.sourceReferences.length>20 || new Set(criterion.sourceReferences).size!==criterion.sourceReferences.length) throw new Error('Invalid criterion source references');
        for(const reference of criterion.sourceReferences) metadataText(reference,1000,'criterion source reference');
      }
    }
  }
  for(const test of contract.tests || []) {
    if(test.contextqa!==undefined) {
      metadataObject(test.contextqa,['caseId'],'test ContextQA reference');
      if(!nativeId(test.contextqa.caseId)) throw new Error('ContextQA caseId must be a positive native ID string');
    }
    for(const step of test.steps || []) {
      if(step.contextqa!==undefined) {
        metadataObject(step.contextqa,['stepId'],'step ContextQA reference');
        if(!nativeId(step.contextqa.stepId)) throw new Error('ContextQA stepId must be a positive native ID string');
        if(!test.contextqa) throw new Error('ContextQA step references require a test case reference');
        if(step.sourceStepIds && !step.sourceStepIds.includes(step.contextqa.stepId)) throw new Error('ContextQA stepId must match a reviewed sourceStepIds reference');
      }
      if(step.criterionIds!==undefined) {
        if(!['assertText','assertVisible','assertUrl'].includes(step.action)) throw new Error('Only assertions may link acceptance criteria');
        idList(step.criterionIds,criteria,'assertion criterion IDs');
      }
    }
  }
  return contract;
}
export function navigation(value) {
  if(typeof value!=='string' || !value.trim()) throw new Error('Navigation requires HTTP(S) or a synthetic HTML data URL');
  let url;
  try {url=new URL(value);} catch {throw new Error('Navigation requires a valid URL');}
  if((url.protocol==='http:' || url.protocol==='https:') && url.hostname) return value;
  if(url.protocol==='data:' && /^data:text\/html(?:;[^,]*)?,/i.test(value)) return value;
  throw new Error('Navigation requires HTTP(S) or a synthetic HTML data URL');
}
export function validate(contract) {
  if(contract.schema!==1 || !Array.isArray(contract.tests) || !contract.tests.length || contract.tests.length>100) throw new Error('Schema 1 requires 1–100 tests');
  if(!/^[a-f0-9]{64}$/.test(contract.sourceSha || '')) throw new Error('Bind the contract to the normalized sourceSha');
  validateMetadata(contract);
  const ids=new Set();
  for(const test of contract.tests) {
    if(!/^[A-Za-z0-9_-]+$/.test(test.id || '') || ids.has(test.id) || typeof test.title!=='string') throw new Error('Tests need unique safe IDs and titles');
    ids.add(test.id);
    if(!Array.isArray(test.steps) || !test.steps.length || test.steps.length>100) throw new Error('Tests require 1–100 structured steps');
    if(!test.steps.some(s=>s.action?.startsWith('assert'))) throw new Error('Every test needs a real assertion');
    for(const step of test.steps) {
      if(!actions.has(step.action)) throw new Error('Unsupported action; arbitrary code is not accepted');
      if(step.sourceStepIds!==undefined && (!Array.isArray(step.sourceStepIds) || !step.sourceStepIds.length || step.sourceStepIds.some(id=>typeof id!=='string' || !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))))) throw new Error('Traceability sourceStepIds must be positive native step ID strings');
      if(step.action!=='navigate' && step.action!=='assertUrl' && (typeof step.selector!=='string' || !step.selector.trim() || step.selector.length>1000)) throw new Error('A reviewed CSS selector is required');
      if(['fill','select','assertText','assertUrl','navigate'].includes(step.action)) {
        if((typeof step.value!=='string') === (typeof step.env!=='string')) throw new Error('Provide exactly one literal value or environment reference');
        if(typeof step.env==='string' && !/^[A-Z][A-Z0-9_]*$/.test(step.env)) throw new Error('Invalid environment reference');
        if(typeof step.value==='string' && step.value.length>16000) throw new Error('Literal too long');
      }
      if(step.action==='navigate' && typeof step.value==='string') navigation(step.value);
    }
  }
  return contract;
}
export function verifySource(contract, source) {
  if(!source || typeof source!=='object' || Array.isArray(source)) throw new Error('A normalized source snapshot is required for approval');
  const {sourceSha,...payload}=source;
  if(source.schema!==1 || typeof source.id!=='string' || !source.id || typeof source.platform!=='string' || !/^[a-f0-9]{64}$/.test(sourceSha || '') || sha(payload)!==sourceSha) throw new Error('Source snapshot hash is missing or has changed');
  if(contract.sourceSha!==sourceSha) throw new Error('Contract sourceSha does not match the supplied source snapshot');
}
export function approve(contract, reviewer, source) {
  validate(contract);
  verifySource(contract,source);
  if(typeof reviewer!=='string' || !reviewer.trim() || reviewer.length>120) throw new Error('Reviewer name required');
  return {schema:1,contractSha:sha(contract),sourceSha:contract.sourceSha,...(source.locator?{sourceLocator:source.locator}:{}),reviewer,reviewedAt:new Date().toISOString(),approved:true};
}
export function requireApproval(contract, receipt) {
  validate(contract);
  if(receipt?.approved!==true || receipt.contractSha!==sha(contract) || receipt.sourceSha!==contract.sourceSha) throw new Error('An unchanged reviewed contract and matching approval receipt are required');
  if(typeof receipt.reviewer!=='string' || !receipt.reviewer.trim() || receipt.reviewer.length>120 || typeof receipt.reviewedAt!=='string' || !Number.isFinite(Date.parse(receipt.reviewedAt))) throw new Error('Approval requires a recorded reviewer label and timestamp');
}
export function changes(before,after) {
  validate(before);validate(after);
  const old=new Map(before.tests.map(t=>[t.id,t])); const current=new Map(after.tests.map(t=>[t.id,t]));
  return {sourceChanged:before.sourceSha!==after.sourceSha, added:[...current.keys()].filter(id=>!old.has(id)), removed:[...old.keys()].filter(id=>!current.has(id)), changed:[...current.keys()].filter(id=>old.has(id)&&sha(old.get(id))!==sha(current.get(id))),reviewRequired:true};
}
