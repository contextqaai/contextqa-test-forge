import {validateMetadata} from './contracts.js';
export const defaultProfile = {
  schema: 1,
  builder: {agentName: 'My QA Agent', ownerName: 'Your name', version: '0.1.0'},
  codeStyle: {pattern: 'inline', indent: 2},
  repository: {owner: 'contextqaai', repo: 'contextqa-test-forge', baseBranch: 'main', branchPrefix: 'qa/', filePrefix: 'qa-', generatedDirectory: 'tests/generated', customDirectory: 'tests/custom', autoMerge: false},
  subscriptions: {events: ['test.created', 'test.updated'], mode: 'manual'},
  versioning: {newTest: 'minor', locatorRepair: 'patch', behaviorChange: 'major'},
  notifications: {events: ['test.failed', 'maintenance.escalated'], channels: ['artifact'], format: 'markdown', include: ['summary', 'reproduction', 'expected', 'actual', 'environment', 'evidence', 'owner', 'severity']}
};
const plain = x => x && typeof x === 'object' && !Array.isArray(x);
const safeSegment = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(value);
export const safeRelativePath = value => typeof value === 'string' && value.length <= 180 && value.split('/').every(safeSegment);
const enumList = (value, choices) => Array.isArray(value) && value.length > 0 && value.length <= choices.length && new Set(value).size === value.length && value.every(x => choices.includes(x));
function keys(value, allowed) { if (!plain(value) || Object.keys(value).some(key => !allowed.includes(key))) throw new Error('Unknown profile settings; secrets and arbitrary templates do not belong in the profile'); }
export function validateProfile(profile) {
  keys(profile, ['schema', 'builder', 'codeStyle', 'repository', 'subscriptions', 'versioning', 'notifications']);
  if (profile.schema !== 1) throw new Error('Use profile schema 1');
  keys(profile.builder, ['agentName', 'ownerName', 'version', 'aiProvider']);
  if (!/^\d+\.\d+\.\d+$/.test(profile.builder.version ?? '')) throw new Error('Builder version must be major.minor.patch');
  validateMetadata({builder: profile.builder, codeStyle: profile.codeStyle, tests: []});
  keys(profile.codeStyle, ['pattern', 'indent']);
  const r = profile.repository; keys(r, ['owner', 'repo', 'baseBranch', 'branchPrefix', 'filePrefix', 'generatedDirectory', 'customDirectory', 'autoMerge']);
  if (!safeSegment(r.owner) || !safeSegment(r.repo) || r.owner.toLowerCase() === 'indivatools' || !safeRelativePath(r.baseBranch) || !/^[a-z][a-z0-9_-]{0,39}\/$/.test(r.branchPrefix) || !/^[a-z][a-z0-9_-]{0,39}-$/.test(r.filePrefix) || r.autoMerge !== false) throw new Error('Use an allowed explicit repository, safe prefixes and autoMerge:false');
  if (!safeRelativePath(r.generatedDirectory) || !safeRelativePath(r.customDirectory) || r.generatedDirectory === r.customDirectory || r.generatedDirectory.startsWith(r.customDirectory + '/') || r.customDirectory.startsWith(r.generatedDirectory + '/')) throw new Error('Generated and custom directories must be safe separate paths');
  const s = profile.subscriptions; keys(s, ['events', 'mode', 'schedule']);
  if (!enumList(s.events, ['test.created', 'test.updated']) || !['manual', 'github-dispatch', 'scheduled'].includes(s.mode)) throw new Error('Choose supported subscription events and mode');
  if (s.mode === 'scheduled' ? !['0 9 * * 1-5', '0 9 * * *', '0 9 * * 1'].includes(s.schedule) : s.schedule !== undefined) throw new Error('Choose a supported daily/weekday/weekly UTC schedule only in scheduled mode');
  keys(profile.versioning, ['newTest', 'locatorRepair', 'behaviorChange']);
  if (['newTest', 'locatorRepair', 'behaviorChange'].some(key => !['major', 'minor', 'patch'].includes(profile.versioning[key]))) throw new Error('Version recommendations must be major, minor or patch');
  const n = profile.notifications; keys(n, ['events', 'channels', 'format', 'include']);
  if (!enumList(n.events, ['test.created', 'test.updated', 'test.passed', 'test.failed', 'maintenance.proposed', 'maintenance.escalated', 'sync.review-required', 'sync.pr-created']) || !enumList(n.channels, ['artifact', 'slack', 'email', 'webhook']) || !['markdown', 'json'].includes(n.format) || !enumList(n.include, ['summary', 'reproduction', 'expected', 'actual', 'environment', 'evidence', 'owner', 'severity'])) throw new Error('Use supported notification events, channels, format and report fields');
  return profile;
}
export function recommendVersion(current, change, profile = defaultProfile) {
  validateProfile(profile);
  if (!/^\d+\.\d+\.\d+$/.test(current ?? '') || !Object.hasOwn(profile.versioning, change)) throw new Error('Supply a semantic version and classified change');
  const parts = current.split('.').map(Number), index = {major: 0, minor: 1, patch: 2}[profile.versioning[change]];
  if (parts.some(x => !Number.isSafeInteger(x)) || parts[index] === Number.MAX_SAFE_INTEGER) throw new Error('Version out of range');
  parts[index]++; for (let i = index + 1; i < 3; i++) parts[i] = 0;
  return {previous: current, recommended: parts.join('.'), change, bump: profile.versioning[change], requiresHumanApproval: true};
}
