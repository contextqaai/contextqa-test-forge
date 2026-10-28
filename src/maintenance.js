// Reviewed portable locator maintenance. No implicit ContextQA heal or network call.
import {validate, verifySource, approve} from './contracts.js';
import {sha} from './sources.js';
import {exportProject} from './exporters.js';

const classifications = new Set(['locator-drift', 'behavior-change', 'data-environment', 'unknown']);
const label = value => typeof value === 'string' && value.trim() && value.length <= 500 && !/[\u0000-\u001f]/.test(value);
function evidenceCheck(evidence) {
  if (!Array.isArray(evidence) || !evidence.length || evidence.length > 30) throw new Error('Supply 1–30 reviewed evidence references');
  for (const item of evidence) {
    if (!item || Object.keys(item).some(key => !['kind', 'ref'].includes(key)) || !['contextqa-step-result', 'contextqa-case-result', 'local-artifact'].includes(item.kind) || !label(item.ref)) throw new Error('Use bounded evidence kind/ref pairs');
    if (item.kind.startsWith('contextqa-') && !/^[1-9]\d*$/.test(item.ref)) throw new Error('ContextQA evidence references must be explicit numeric result IDs');
    if (item.kind === 'local-artifact' && (/^[a-z][a-z0-9+.-]*:/i.test(item.ref) || /[?\r\n]/.test(item.ref) || /\bBearer\s+\S+|\b(?:sk|sk-ant)-[A-Za-z0-9_-]{8,}|\btoken_[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|\b(?:api[_-]?key|access[_-]?token|password|secret)\s*[:=]/i.test(item.ref))) throw new Error('Use a private local evidence label, never a signed URL or credential');
  }
}
function intent(contract) {
  const copy = structuredClone(contract);
  // Version can advance after review; ownership, business criteria and native mappings stay bound.
  if (copy.builder) delete copy.builder.version;
  for (const test of copy.tests) for (const step of test.steps) delete step.selector;
  return copy;
}
export function proposeMaintenance({before, after, source, evidence, classification, reason}) {
  before = structuredClone(before); after = structuredClone(after); source = structuredClone(source);
  evidence = structuredClone(evidence);
  validate(before); validate(after); verifySource(before, source); verifySource(after, source);
  evidenceCheck(evidence);
  if (!classifications.has(classification) || !label(reason)) throw new Error('Choose a failure classification and bounded review reason');
  const sameIntent = sha(intent(before)) === sha(intent(after));
  const changes = [];
  if (sameIntent) before.tests.forEach((test, i) => test.steps.forEach((step, j) => {
    const next = after.tests[i].steps[j];
    if (step.selector !== next.selector) changes.push({testId: test.id, stepIndex: j + 1, action: step.action, before: step.selector ?? null, after: next.selector ?? null, sourceStepIds: step.sourceStepIds ?? []});
  }));
  const eligible = classification === 'locator-drift' && sameIntent && changes.length > 0;
  return {
    schema: 1, kind: 'portable-locator-maintenance', classification, reason,
    sourceSha: source.sourceSha, beforeSha: sha(before), afterSha: sha(after),
    state: eligible ? 'proposal-needs-review' : 'escalated',
    decision: !sameIntent ? 'Action, assertion, target, data, mapping or business intent changed; review as a new requirement' : classification !== 'locator-drift' ? 'Investigate behavior or data/environment; no locator repair approval' : !changes.length ? 'No locator change proposed' : 'Review the new locators against evidence and preserve original assertions',
    changes, evidence, evidenceStatus: 'references-supplied-not-independently-verified',
    contextqaHealingVerified: false, executed: false, before, after, source
  };
}
function rebuild(proposal) {
  const checked = proposeMaintenance(proposal);
  if (sha(proposal) !== sha(checked)) throw new Error('Maintenance proposal changed; regenerate it before review');
  if (checked.state !== 'proposal-needs-review') throw new Error('Escalated changes cannot be approved as locator repairs');
  return checked;
}
export function approveMaintenance(proposal, reviewer) {
  const checked = rebuild(proposal);
  const approval = approve(checked.after, reviewer, checked.source);
  return {...approval, kind: 'portable-locator-maintenance', proposalSha: sha(checked), beforeSha: checked.beforeSha, revalidationRequired: true};
}
export async function exportMaintenance(proposal, receipt, out) {
  const checked = rebuild(proposal);
  if (receipt?.kind !== checked.kind || receipt.approved !== true || receipt.proposalSha !== sha(checked) || receipt.beforeSha !== checked.beforeSha || receipt.contractSha !== checked.afterSha || receipt.sourceSha !== checked.sourceSha || !label(receipt.reviewer)) throw new Error('An unchanged proposal and its human review receipt are required');
  const exported = await exportProject(checked.after, receipt, 'playwright', out);
  return {...exported, state: 'reviewed-awaiting-rerun', proposalSha: sha(checked), contextqaHealingVerified: false, revalidationRequired: true};
}
