// Deterministic, repository-owned fixture shared by generation and acceptance.
// No caller-provided target, app HTML or requirement becomes executable here.
import {normalize, sha} from '../src/sources.js';

export function builderFixture({pattern = 'inline', indent = 2} = {}) {
  if (!['inline', 'page-object'].includes(pattern) || ![2, 4].includes(indent) || pattern === 'inline' && indent !== 2) throw new Error('Use the repository inline fixture or supported page-object style');
  const source = normalize('github', {number:42, title:'Expense approval policy', updated_at:'2026-10-27T00:00:00Z', body:'Synthetic example: an expense over $500 requires manager approval. AC-1: submitting $1,000 without manager approval shows Manager approval required. AC-2: after a manager approves, submitting shows Approved. Ambiguities resolved for this fixture: USD only; exactly $500 does not require approval; each page load resets state.'});
  const before = {
    schema:1, sourceSha:source.sourceSha,
    builder:{agentName:'Expense Policy Guardian', ownerName:'Example SDET (fictional)', version:'1.0.0'},
    businessGoal:'Protect the expense approval policy without hiding meaningful failures',
    criteria:[{id:'AC-1', text:'Over $500 without manager approval is blocked', sourceReferences:['body: AC-1']}, {id:'AC-2', text:'Manager approval permits submission', sourceReferences:['body: AC-2']}],
    tests:[{id:'expense-policy', title:'Enforce manager approval for a $1,000 expense', contextqa:{caseId:'501'}, steps:[
      {action:'navigate', env:'APP_URL', sourceStepIds:['1001']},
      {action:'fill', selector:'#amount', value:'1000', sourceStepIds:['1002']},
      {action:'click', selector:'#submit', sourceStepIds:['1003']},
      {action:'assertText', selector:'#result', value:'Manager approval required', criterionIds:['AC-1'], sourceStepIds:['1004']},
      {action:'check', selector:'#manager', sourceStepIds:['1005']},
      {action:'click', selector:'#submit', sourceStepIds:['1006']},
      {action:'assertText', selector:'#result', value:'Approved', criterionIds:['AC-2'], sourceStepIds:['1007']}
    ]}]
  };
  // Preserve the original default contract bytes; page-object style is opt-in.
  if (pattern === 'page-object') before.codeStyle = {pattern, indent};
  const after = structuredClone(before); after.builder.version = '1.0.1';
  for (const step of after.tests[0].steps) if (step.selector === '#submit') step.selector = '#request-review';
  const html = (buttonId, defect = false) => `<!doctype html><title>Synthetic expense policy</title><h1>Expense approval</h1><label>Amount (USD)<input type="number" id="amount"></label><label><input type="checkbox" id="manager">Manager approved</label><button id="${buttonId}" onclick="document.querySelector('#result').textContent=${defect ? "'Approved'" : "Number(document.querySelector('#amount').value)>500&&!document.querySelector('#manager').checked?'Manager approval required':'Approved'"}">Submit expense</button><p id="result">Not submitted</p>`;
  return {source, before, after, apps:{'app-before':html('submit'), 'app-after':html('request-review'), 'app-defect':html('request-review',true)}};
}

/** Compare against source-owned values, not hashes supplied by the candidate directory. */
export function assertBuilderFixture({manifest, before, after, source, apps}, {pageObject = false} = {}) {
  const pattern = manifest?.pattern === undefined ? 'inline' : manifest.pattern, indent = manifest?.indent === undefined ? 2 : manifest.indent;
  const selectedPattern = pageObject === true ? 'page-object' : 'inline';
  if (typeof pageObject !== 'boolean' || pattern !== selectedPattern || ![2, 4].includes(indent) || pattern === 'inline' && indent !== 2) throw new Error('Fixture pattern must match the explicit page-object selection');
  const expected = builderFixture({pattern, indent});
  if (manifest?.scenario !== 'repository-owned-synthetic-expense-policy' ||
      sha(source) !== sha(expected.source) || sha(before) !== sha(expected.before) || sha(after) !== sha(expected.after) ||
      manifest.beforeSha !== sha(expected.before) || manifest.afterSha !== sha(expected.after) ||
      !apps || typeof apps !== 'object' || Array.isArray(apps) ||
      Object.keys(apps).length !== Object.keys(expected.apps).length ||
      Object.entries(expected.apps).some(([name, html]) => apps[name] !== html)) {
    throw new Error('Only the unchanged repository-owned builder fixture can be executed');
  }
  return true;
}
