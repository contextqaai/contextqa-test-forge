import {sha} from './sources.js';
const actions=new Set(['navigate','click','fill','select','check','assertText','assertVisible','assertUrl']);
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
}
export function changes(before,after) {
  validate(before);validate(after);
  const old=new Map(before.tests.map(t=>[t.id,t])); const current=new Map(after.tests.map(t=>[t.id,t]));
  return {sourceChanged:before.sourceSha!==after.sourceSha, added:[...current.keys()].filter(id=>!old.has(id)), removed:[...old.keys()].filter(id=>!current.has(id)), changed:[...current.keys()].filter(id=>old.has(id)&&sha(old.get(id))!==sha(current.get(id))),reviewRequired:true};
}
