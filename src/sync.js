import {mkdtemp, readFile, readdir, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {sha} from './sources.js';
import {verifySource, requireApproval} from './contracts.js';
import {exportProject} from './exporters.js';
import {validateProfile} from './profile.js';

export function sourceStatePath(profile, source) {
  validateProfile(profile); verifySource({sourceSha: source?.sourceSha}, source);
  const identity = sha({platform: source.platform, id: source.id, locator: source.locator ?? null});
  const slug = `${source.platform}-${source.id}`.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 50) + '-' + identity.slice(0, 12);
  return `${profile.repository.generatedDirectory}/${profile.repository.filePrefix}${slug}/sync-state.json`;
}

export async function planSync({profile, source, contract = null, approval = null, previous = null}) {
  profile = structuredClone(profile); source = structuredClone(source); contract = structuredClone(contract); approval = structuredClone(approval); previous = structuredClone(previous);
  validateProfile(profile); verifySource({sourceSha: source?.sourceSha}, source);
  // IDs such as GitHub #42 are unique only within their source repository.
  const sourceIdentity = sha({platform: source.platform, id: source.id, locator: source.locator ?? null});
  const sourceId = `${source.platform}:${source.id}:${sourceIdentity}`;
  if (previous !== null && (previous?.schema !== 1 || previous.sourceId !== sourceId || !/^[a-f0-9]{64}$/.test(previous.sourceSha ?? '') || previous.contractSha !== null && !/^[a-f0-9]{64}$/.test(previous.contractSha ?? ''))) throw new Error('Previous state must identify this source and its published hashes');
  let approved = false;
  if (contract && approval) {
    try { requireApproval(contract, approval); verifySource(contract, source); approved = true; } catch { /* Changed inputs require a fresh review packet. */ }
    if (approved && (sha(contract.builder) !== sha(profile.builder) || sha(contract.codeStyle ?? {pattern: 'inline', indent: 2}) !== sha(profile.codeStyle))) throw new Error('Approved contract builder/style must match the selected profile; change then reapprove');
  }
  const contractSha = approved ? sha(contract) : null;
  const event = previous ? 'test.updated' : 'test.created';
  const fingerprint = sha({sourceSha: source.sourceSha, contractSha, profile});
  const same = previous?.sourceSha === source.sourceSha && previous?.contractSha === contractSha && previous?.fingerprint === fingerprint;
  const state = same || !profile.subscriptions.events.includes(event) ? 'unchanged' : approved ? 'ready' : 'review-required';
  const slug = `${source.platform}-${source.id}`.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 50) + '-' + sourceIdentity.slice(0, 12);
  const directory = sourceStatePath(profile, source).replace(/\/sync-state\.json$/, '');
  const files = [];
  if (state !== 'unchanged') {
    files.push({path: `${directory}/source.json`, content: JSON.stringify(source, null, 2) + '\n'});
    files.push({path: `${directory}/sync-state.json`, content: JSON.stringify({schema: 1, sourceId, sourceSha: source.sourceSha, contractSha, fingerprint, builder: profile.builder, state}, null, 2) + '\n'});
    if (approved) {
      const root = await mkdtemp(join(tmpdir(), 'forge-sync-'));
      try {
        await exportProject(contract, approval, 'playwright', join(root, 'project'));
        const visit = async (path = '') => {
          for (const item of await readdir(join(root, 'project', path), {withFileTypes: true})) {
            const relative = path ? `${path}/${item.name}` : item.name;
            if (item.isDirectory()) await visit(relative);
            else if (!['.gitignore', '.env.example'].includes(relative)) files.push({path: `${directory}/${relative}`, content: await readFile(join(root, 'project', relative), 'utf8')});
          }
        }; await visit();
      } finally { await rm(root, {recursive: true, force: true}); }
      files.push({path: `${directory}/contract.json`, content: JSON.stringify(contract, null, 2) + '\n'});
    }
    files.push({path: `${directory}/UPDATE.md`, content: `# ${state === 'ready' ? 'Reviewed Playwright update' : 'Source change needs review'}\n\nSource: ${source.platform}:${source.id}\nSource SHA: ${source.sourceSha}\nContract SHA: ${contractSha ?? 'none approved for this source'}\nAgent version: ${profile.builder.version}\n\n${approved ? 'Inspect the generated code and traceability. Run the approved target separately; generation is not execution.' : 'The new source has no matching approved contract. Existing generated code, if present on the base branch, is stale until a reviewed replacement is merged. Read the source, resolve ambiguities, update assertions and mappings, record a fresh approval, then plan again.'}\n\nNo automatic merge, live ContextQA execution or external notification occurs. Custom code is outside this generated directory.\n`});
  }
  const plan = {schema: 1, state, event, repository: profile.repository, branch: `${profile.repository.branchPrefix}${slug}-${fingerprint.slice(0, 12)}`, title: `[${profile.repository.filePrefix.replace(/-$/, '')}] ${state === 'ready' ? 'Update reviewed test' : 'Review changed source'} ${slug}`, body: `Test Forge ${state}. Source SHA: ${source.sourceSha}. Contract SHA: ${contractSha ?? 'awaiting approval'}. Builder version: ${profile.builder.version}.\n\nReview source privacy, business intent, code, mappings and evidence before merging. No execution or business outcome is claimed.`, files, sourceSha: source.sourceSha, contractSha};
  return {...plan, planSha: sha(plan)};
}

// Produces an opt-in consumer workflow; never installs or enables a schedule by itself.
export function subscriptionWorkflow(profile, {publishPullRequests = false, sourcePlatforms = ['contextqa']} = {}) {
  validateProfile(profile);
  const secrets = {contextqa: ['CONTEXTQA_API_TOKEN'], github: ['GITHUB_SOURCE_TOKEN'], jira: ['JIRA_EMAIL', 'JIRA_API_TOKEN'], linear: ['LINEAR_API_KEY'], testrail: ['TESTRAIL_EMAIL', 'TESTRAIL_API_KEY'], xray: ['XRAY_BEARER_TOKEN']};
  if (!Array.isArray(sourcePlatforms) || !sourcePlatforms.length || sourcePlatforms.length > 6 || new Set(sourcePlatforms).size !== sourcePlatforms.length || sourcePlatforms.some(x => !Object.hasOwn(secrets, x))) throw new Error('Select supported source platforms for secret injection');
  const schedule = profile.subscriptions.mode === 'scheduled' ? `\n  schedule:\n    - cron: '${profile.subscriptions.schedule}'` : '';
  const dispatch = profile.subscriptions.mode === 'github-dispatch' ? '\n  repository_dispatch:\n    types: [contextqa-test-changed]' : '';
  const env = sourcePlatforms.flatMap(name => secrets[name]).map(name => `          ${name}: \u0024{{ secrets.${name} }}`).join('\n');
  const publish = publishPullRequests ? `  publish:
    needs: prepare
    runs-on: ubuntu-latest
    timeout-minutes: 10
    environment: qa-sync-publication
    steps:
      - uses: actions/checkout@v4
        with:
          ref: \u0024{{ github.sha }}
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - uses: actions/download-artifact@v4
        with:
          name: review-required-qa-updates
          path: output/subscribed
      - name: Publish the reviewed private plans
        env:
          GITHUB_SYNC_TOKEN: \u0024{{ secrets.GITHUB_SYNC_TOKEN }}
        run: node scripts/publish-subscriptions.js --plans output/subscribed --approve-github-write
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: qa-publication-journals
          path: output/subscribed/*.journal.json
          retention-days: 3
` : '';
  return `name: Prepare subscribed QA updates
on:
  workflow_dispatch:${schedule}${dispatch}
permissions:
  contents: read
concurrency:
  group: forge-subscription-sync
  cancel-in-progress: false
jobs:
  prepare:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Read explicitly subscribed sources and prepare review packets
        env:
${env}
        run: node scripts/subscriptions.js --profile forge.profile.json --watch forge.watch.json --out output/subscribed
      - uses: actions/upload-artifact@v4
        with:
          name: review-required-qa-updates
          path: output/subscribed
          retention-days: 3
${publish}`;
}
