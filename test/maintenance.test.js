import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {normalize} from '../src/sources.js';
import {proposeMaintenance, approveMaintenance, exportMaintenance} from '../src/maintenance.js';
const source = normalize('json', {id: 'REQ-1', title: 'Save request', steps: ['Save and observe confirmation']});
const before = {schema: 1, sourceSha: source.sourceSha, tests: [{id: 'save', title: 'Save request', steps: [{action: 'navigate', env: 'APP_URL'}, {action: 'click', selector: '#save', sourceStepIds: ['101']}, {action: 'assertText', selector: '#result', value: 'Saved', sourceStepIds: ['102']}]}]};
function input() { const after = structuredClone(before); after.tests[0].steps[1].selector = '[data-action="save"]'; return {before, after, source, evidence: [{kind: 'contextqa-step-result', ref: '1001'}], classification: 'locator-drift', reason: 'Reviewed result and current locator against the unchanged Save requirement'}; }
test('locator repair binds complete evidence, original assertions, native mappings and approval before Playwright export', async () => {
  const proposal = proposeMaintenance(input());
  assert.equal(proposal.state, 'proposal-needs-review'); assert.equal(proposal.contextqaHealingVerified, false);
  assert.equal(proposal.changes.length, 1); assert.deepEqual(proposal.changes[0].sourceStepIds, ['101']);
  const receipt = approveMaintenance(proposal, 'Human fixture reviewer');
  const root = await mkdtemp(join(tmpdir(), 'forge-repair-'));
  try {
    const result = await exportMaintenance(proposal, receipt, join(root, 'project'));
    assert.equal(result.state, 'reviewed-awaiting-rerun'); assert.equal(result.executed, false);
    assert.match(await readFile(join(root, 'project/tests.spec.js'), 'utf8'), /toHaveText\("Saved"\)/);
    const changed = structuredClone(proposal); changed.evidence[0].ref = '1002';
    await assert.rejects(exportMaintenance(changed, receipt, join(root, 'stale')), /unchanged/);
    await assert.rejects(exportMaintenance(proposal, {...receipt, reviewer: ''}, join(root, 'anonymous')), /human review/);
  } finally { await rm(root, {recursive: true, force: true}); }
});
test('behavior changes, assertion weakening, skipped steps, wrong targets and native remapping escalate', () => {
  const mutations = [
    x => { x.after.tests[0].steps[2].value = 'Whatever'; },
    x => { x.after.tests[0].steps[2] = {action: 'assertVisible', selector: '#result'}; },
    x => { x.after.tests[0].steps.splice(1, 1); },
    x => { x.after.tests[0].steps[0].env = 'PRODUCTION_URL'; },
    x => { x.after.tests[0].steps[1].sourceStepIds = ['999']; },
    x => { x.classification = 'behavior-change'; },
    x => { x.classification = 'data-environment'; },
    x => { x.classification = 'unknown'; },
    x => { x.after = structuredClone(before); }
  ];
  for (const mutate of mutations) { const next = input(); mutate(next); const proposal = proposeMaintenance(next); assert.equal(proposal.state, 'escalated'); assert.throws(() => approveMaintenance(proposal, 'Reviewer'), /Escalated/); }
});
test('forged eligible flags, missing source/evidence and signed artifact URLs are rejected', () => {
  const next = input(); next.classification = 'unknown'; const forged = proposeMaintenance(next); forged.state = 'proposal-needs-review';
  assert.throws(() => approveMaintenance(forged, 'Reviewer'), /changed/);
  assert.throws(() => proposeMaintenance({...input(), evidence: []}), /evidence/);
  assert.throws(() => proposeMaintenance({...input(), evidence: [{kind: 'local-artifact', ref: 'https://storage.example/artifact?token=secret'}]}), /URL/);
  const drift = input(); drift.after.sourceSha = '0'.repeat(64); assert.throws(() => proposeMaintenance(drift), /sourceSha/);
});
