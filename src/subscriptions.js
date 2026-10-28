import {validateProfile} from './profile.js';
import {planSync, sourceStatePath} from './sync.js';
export function assertSubscriptionCheckout(profile, env = process.env) {
  validateProfile(profile);
  if (env.GITHUB_ACTIONS === 'true' && (env.GITHUB_REPOSITORY !== `${profile.repository.owner}/${profile.repository.repo}` || env.GITHUB_REF !== `refs/heads/${profile.repository.baseBranch}`)) throw new Error('Subscription state must be read from the selected target repository and base branch');
}
const path = value => typeof value === 'string' && value.length < 240 && value.endsWith('.json') && value.split('/').every(part => /^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(part) && !part.includes('..'));
export function validateWatch(watch) {
  if (watch?.schema !== 1 || !Array.isArray(watch.items) || !watch.items.length || watch.items.length > 20 || Object.keys(watch).some(k => !['schema', 'items'].includes(k))) throw new Error('Use 1–20 explicit watch items');
  const seen = new Set();
  for (const item of watch.items) {
    if (!item || !/^[a-z][a-z0-9_-]{0,63}$/.test(item.key ?? '') || seen.has(item.key) || !item.source || Object.keys(item).some(k => !['key', 'source', 'contract', 'approval', 'previous'].includes(k))) throw new Error('Watch keys must be unique and bounded');
    seen.add(item.key);
    for (const k of ['contract', 'approval', 'previous']) if (item[k] !== undefined && !path(item[k])) throw new Error('Watch file references must be relative JSON paths without traversal');
    if (Boolean(item.contract) !== Boolean(item.approval)) throw new Error('Watch contract and approval must be supplied together');
    if (!['github', 'jira', 'linear', 'testrail', 'xray', 'contextqa'].includes(item.source.platform)) throw new Error('Unsupported subscription source');
    if (item.source.platform === 'contextqa' && (!Array.isArray(item.source.stepIds) || item.source.stepIds.length > 20)) throw new Error('ContextQA watches require at most 20 explicit step IDs');
  }
  return watch;
}
export async function prepareSubscriptions({profile, watch, readSource, loadJson}) {
  profile = structuredClone(profile); watch = structuredClone(watch);
  validateProfile(profile); validateWatch(watch);
  const results = [];
  for (const item of watch.items) {
    // Read a selected source once. Fail the batch instead of silently skipping a failed item.
    const source = await readSource(item.source);
    const [contract, approval] = await Promise.all(['contract', 'approval'].map(key => item[key] ? loadJson(item[key]) : null));
    // Merged per-source state is present in the base checkout. Missing state means first observation.
    const previous = item.previous ? await loadJson(item.previous) : await loadJson(sourceStatePath(profile, source), {optional: true});
    results.push({key: item.key, plan: await planSync({profile, source, contract, approval, previous})});
  }
  return results;
}
