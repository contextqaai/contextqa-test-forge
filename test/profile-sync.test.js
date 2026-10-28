import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultProfile, validateProfile, recommendVersion} from '../src/profile.js';
import {planSync, subscriptionWorkflow} from '../src/sync.js';
import {prepareSubscriptions, validateWatch, assertSubscriptionCheckout} from '../src/subscriptions.js';
import {normalize, sha} from '../src/sources.js';
import {approve} from '../src/contracts.js';
const source = normalize('json', {id: 'REQ-1', title: 'Approval rule', description: 'Manager approval is required', revision: 1});
const profile = () => structuredClone(defaultProfile);
function fixture() { const p = profile(); const contract = {schema: 1, sourceSha: source.sourceSha, builder: p.builder, codeStyle: p.codeStyle, tests: [{id: 'approval', title: 'Approval required', steps: [{action: 'navigate', env: 'APP_URL'}, {action: 'assertText', selector: '#result', value: 'Manager approval required'}]}]}; return {profile: p, source, contract, approval: approve(contract, 'Fixture reviewer', source)}; }
test('defaults keep private PR updates, no schedule/auto merge, separate custom code and real version recommendations', () => {
  assert.equal(validateProfile(profile()).repository.autoMerge, false);
  assert.deepEqual(recommendVersion('1.2.3', 'locatorRepair'), {previous: '1.2.3', recommended: '1.2.4', change: 'locatorRepair', bump: 'patch', requiresHumanApproval: true});
  assert.equal(recommendVersion('1.2.3', 'newTest').recommended, '1.3.0');
  assert.equal(recommendVersion('1.2.3', 'behaviorChange').recommended, '2.0.0');
  for (const change of [p => p.repository.autoMerge = true, p => p.repository.owner = 'indivatools', p => p.repository.generatedDirectory = '../private', p => p.repository.generatedDirectory = p.repository.customDirectory, p => p.notifications.token = 'secret', p => p.codeStyle.pattern = 'arbitrary-code']) { const p = profile(); change(p); assert.throws(() => validateProfile(p)); }
});
test('workflow creation stays opt-in, has scoped secret steps and does not use untrusted event payload', () => {
  const p = profile(), manual = subscriptionWorkflow(p);
  assert.match(manual, /workflow_dispatch:/); assert.doesNotMatch(manual, /schedule:|GITHUB_SYNC_TOKEN|github.event.client_payload/);
  p.subscriptions.mode = 'scheduled'; p.subscriptions.schedule = '0 9 * * 1-5';
  const optIn = subscriptionWorkflow(p, {publishPullRequests: true});
  assert.match(optIn, /cron: '0 9 \* \* 1-5'/); assert.match(optIn, /environment: qa-sync-publication/); assert.match(optIn, /GITHUB_SYNC_TOKEN/); assert.match(optIn, /cancel-in-progress: false/);
  assert.match(optIn, /publish:\n    needs: prepare/);
  assert.match(optIn, /actions\/download-artifact/);
  assert.doesNotMatch(manual, /JIRA_API_TOKEN|LINEAR_API_KEY|GITHUB_SOURCE_TOKEN/);
  const githubOnly = subscriptionWorkflow(profile(), {sourcePlatforms: ['github']}); assert.match(githubOnly, /GITHUB_SOURCE_TOKEN/); assert.doesNotMatch(githubOnly, /CONTEXTQA_API_TOKEN/);
  p.subscriptions.schedule = "* * * * *\nrun: something"; assert.throws(() => subscriptionWorkflow(p));
});
test('source changes make review packets, matching approvals make prefixed POM code, and unchanged fingerprints deduplicate', async () => {
  const input = fixture(); input.profile.codeStyle.pattern = 'page-object'; input.contract.codeStyle = input.profile.codeStyle; input.approval = approve(input.contract, 'Fixture reviewer', source);
  const ready = await planSync(input);
  assert.equal(ready.state, 'ready'); assert.match(ready.branch, /^qa\/json-req-1-[a-f0-9]{12}-[a-f0-9]{12}$/);
  assert(ready.files.some(f => /^tests\/generated\/qa-json-req-1-[a-f0-9]{12}\/pages\/workflow-1.js$/.test(f.path)));
  assert(ready.files.every(f => !f.path.startsWith('tests/custom/')));
  const previous = JSON.parse(ready.files.find(f => f.path.endsWith('/sync-state.json')).content);
  assert.equal((await planSync({...input, previous})).state, 'unchanged');
  const moved = structuredClone(input); moved.profile.repository.filePrefix = 'owned-';
  assert.equal((await planSync({...moved, previous})).state, 'ready');
  const updated = normalize('json', {id: 'REQ-1', title: 'Approval rule', description: 'New policy needs review', revision: 2});
  const pending = await planSync({...input, source: updated, previous});
  assert.equal(pending.state, 'review-required'); assert.equal(pending.contractSha, null);
  assert.deepEqual(pending.files.map(f => f.path.split('/').at(-1)), ['source.json', 'sync-state.json', 'UPDATE.md']);
  assert.match(pending.files.at(-1).content, /stale/);
  const {planSha, ...payload} = ready; assert.equal(planSha, sha(payload));
});
test('same issue numbers in different repositories and case-folded IDs cannot overwrite source directories', async () => {
  const first = normalize('github', {number: 42, title: 'A'}, 'https://github.com/example/first/issues/42');
  const second = normalize('github', {number: 42, title: 'B'}, 'https://github.com/example/second/issues/42');
  const a = await planSync({profile: profile(), source: first}), b = await planSync({profile: profile(), source: second});
  assert.notEqual(a.files[0].path, b.files[0].path);
  const previous = JSON.parse(a.files.find(f => f.path.endsWith('/sync-state.json')).content);
  await assert.rejects(planSync({profile: profile(), source: second, previous}), /source/);
  const c = await planSync({profile: profile(), source: normalize('json', {id: 'req-1', title: 'lowercase'})});
  const d = await planSync({profile: profile(), source}); assert.notEqual(c.files[0].path, d.files[0].path);
});
test('profile changes cannot replace reviewed builder identity/style; subscriptions read only selected items', async () => {
  const input = fixture(); input.profile.builder = {...input.profile.builder, ownerName: 'New owner'};
  await assert.rejects(planSync(input), /reapprove/);
  const calls = [], watch = {schema: 1, items: [{key: 'approval', source: {platform: 'github', owner: 'example', repo: 'private', id: '42', tokenEnv: 'GITHUB_SOURCE_TOKEN'}}]};
  const results = await prepareSubscriptions({profile: profile(), watch, readSource: async config => { calls.push(config); return source; }, loadJson: async (path, options) => { assert.match(path, /^tests\/generated\/qa-/); assert.equal(options.optional, true); return null; }});
  assert.equal(calls.length, 1); assert.equal(results[0].plan.state, 'review-required');
  assert.throws(() => validateWatch({...watch, items: [...watch.items, ...watch.items]}), /unique/);
  assert.throws(() => validateWatch({schema: 1, items: [{...watch.items[0], previous: '../secret.json'}]}), /relative/);
});
test('subscription reads merged source state automatically and suppresses an unchanged repeat', async () => {
  const first = await planSync({profile: profile(), source});
  const previous = JSON.parse(first.files.find(file => file.path.endsWith('/sync-state.json')).content);
  const watch = {schema: 1, items: [{key: 'approval', source: {platform: 'github', owner: 'example', repo: 'private', id: '42', tokenEnv: 'GITHUB_SOURCE_TOKEN'}}]};
  const result = await prepareSubscriptions({profile: profile(), watch, readSource: async () => source, loadJson: async (path, options) => { assert.match(path, /sync-state\.json$/); assert.equal(options.optional, true); return previous; }});
  assert.equal(result[0].plan.state, 'unchanged');
});
test('Actions subscription reads require the target repository and base checkout before source access', () => {
  assert.doesNotThrow(() => assertSubscriptionCheckout(profile(), {GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'contextqaai/contextqa-test-forge', GITHUB_REF: 'refs/heads/main'}));
  assert.throws(() => assertSubscriptionCheckout(profile(), {GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'example/other', GITHUB_REF: 'refs/heads/main'}), /selected target/);
  assert.throws(() => assertSubscriptionCheckout(profile(), {GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'contextqaai/contextqa-test-forge', GITHUB_REF: 'refs/heads/other'}), /selected target/);
});
