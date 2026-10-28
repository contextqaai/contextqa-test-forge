#!/usr/bin/env node
// Runs only regenerated, repository-owned synthetic projects. Never uses customer targets or keys.
import {readFile, writeFile, realpath, symlink, lstat, readdir} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {sha} from '../src/sources.js';
import {renderProjectFiles} from '../src/exporters.js';
import {requireApproval} from '../src/contracts.js';
import {approveMaintenance} from '../src/maintenance.js';
import {assertBuilderFixture} from '../examples/builder-fixture.js';

export function parseBuilderAcceptanceArgs(argv) {
  if (!Array.isArray(argv) || typeof argv[0] !== 'string' || !argv[0] || argv[0].startsWith('--')) throw new Error('Use one fixture directory and supported fixture options');
  let browserChannel = 'chromium', pageObject = false, channelSet = false;
  for (let index = 1; index < argv.length; index++) {
    if (argv[index] === '--page-object' && !pageObject) pageObject = true;
    else if (argv[index] === '--channel' && !channelSet && ['chromium', 'chrome'].includes(argv[index + 1])) {browserChannel = argv[++index];channelSet = true;}
    else throw new Error('Use optional --page-object and --channel chromium|chrome once each');
  }
  return {root:resolve(argv[0]), browserChannel, pageObject};
}
export function builderRunnerConfig(browserChannel = 'chromium') {
  if (!['chromium', 'chrome'].includes(browserChannel)) throw new Error('Unsupported synthetic browser channel');
  return {testMatch:'tests.spec.js',timeout:8000,workers:1,retries:0,expect:{timeout:1200},use:{headless:true,actionTimeout:1200,...(browserChannel === 'chrome' ? {channel:'chrome'} : {})},reporter:'json'};
}

export async function assertBuilderProjectFiles(project, contract, receipt) {
  const expected = renderProjectFiles(contract, 'playwright', receipt);
  const pageNames = Object.keys(expected).filter(name => name.startsWith('pages/')).map(name => name.slice('pages/'.length)).sort();
  let pageEntries = [];
  try {
    const info = await lstat(join(project, 'pages'));
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Generated page directory changed');
    pageEntries = await readdir(join(project, 'pages'), {withFileTypes:true});
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (pageEntries.length !== pageNames.length || pageEntries.some(entry => !entry.isFile() || entry.isSymbolicLink()) || JSON.stringify(pageEntries.map(entry => entry.name).sort()) !== JSON.stringify(pageNames)) throw new Error('Generated page files changed; regenerate the fixture');
  for (const [name, content] of Object.entries(expected)) {
    const info = await lstat(join(project, name));
    if (!info.isFile() || info.isSymbolicLink() || info.size !== Buffer.byteLength(content) || await readFile(join(project, name), 'utf8') !== content) throw new Error('Generated tests changed; regenerate the fixture');
  }
  return Object.keys(expected);
}

export function assessScenario(report, exitCode, expected, marker) {
  const specs = [];
  const visit = suites => { for (const suite of suites ?? []) { specs.push(...suite.specs ?? []); visit(suite.suites); } };
  visit(report?.suites);
  if (report?.errors?.length || specs.length !== 1 || specs[0].tests?.length !== 1) return false;
  const trial = specs[0].tests[0], results = trial.results ?? [];
  if (results.length !== 1 || trial.expectedStatus !== 'passed') return false;
  const result = results[0], error = result.error?.message ?? '';
  return expected === 'passed' ? exitCode === 0 && result.status === 'passed' : exitCode !== 0 && exitCode !== null && result.status === 'failed' && error.includes(marker);
}
async function main() {
  const {root, browserChannel, pageObject} = parseBuilderAcceptanceArgs(process.argv.slice(2)), load = async name => JSON.parse(await readFile(join(root, `${name}.json`), 'utf8'));
  const manifest = await load('manifest'), before = await load('before'), after = await load('after'), source = await load('source');
  const apps = Object.fromEntries(await Promise.all(['app-before', 'app-after', 'app-defect'].map(async name => [name, await readFile(join(root, `${name}.html`), 'utf8')])));
  assertBuilderFixture({manifest, before, after, source, apps}, {pageObject});
  const modulePath = await realpath(join(root, 'baseline/node_modules'));
  const plans = [['baseline', 'app-before', 'passed', ''], ['negative-rule', 'app-before', 'failed', 'toHaveText'], ['stale-locator', 'app-after', 'failed', "locator('#submit')"], ['repaired', 'app-after', 'passed', ''], ['behavior-defect', 'app-defect', 'failed', 'toHaveText']];
  const checks = [], started = performance.now();
  for (const [name, app, expected, marker] of plans) {
    const project = join(root, name), targetContract = structuredClone(name === 'repaired' || name === 'behavior-defect' ? after : before);
    if (name === 'negative-rule') targetContract.tests[0].steps[3].value = 'Approved';
    // Inspect generated code before execution; no edited code, custom config, or app URLs are accepted.
    const traceability = JSON.parse(await readFile(join(project, 'traceability.json'), 'utf8'));
    requireApproval(targetContract, traceability.review);
    const verifiedCodeFiles = await assertBuilderProjectFiles(project, targetContract, traceability.review);
    if (name !== 'baseline') await symlink(modulePath, join(project, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
    // Use the already verified snapshot; do not re-read replaceable HTML after validation.
    const html = apps[app];
    const config = join(project, 'acceptance.config.js');
    await writeFile(config, `export default ${JSON.stringify(builderRunnerConfig(browserChannel))};\n`, {flag: 'wx', mode: 0o600});
    const time = performance.now();
    // Only environment needed to launch the pinned runner/browser; no account keys inherited.
    const env = Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'PLAYWRIGHT_BROWSERS_PATH', 'SystemRoot'].filter(key => process.env[key]).map(key => [key, process.env[key]]));
    const result = spawnSync(process.execPath, [join(modulePath, '@playwright/test/cli.js'), 'test', '--config', config], {cwd: project, env: {...env, APP_URL: 'data:text/html,' + encodeURIComponent(html), CI: 'true', NO_COLOR: '1'}, encoding: 'utf8', timeout: 30000, maxBuffer: 4_000_000});
    if (result.error || result.signal) throw new Error('Runner failed to complete; this is not an expected business failure');
    let report; try { report = JSON.parse(result.stdout); } catch { throw new Error('Runner did not emit a complete JSON report'); }
    await writeFile(join(root, `${name}.runner.json`), result.stdout, {flag: 'wx', mode: 0o600});
    const accepted = assessScenario(report, result.status, expected, marker);
    checks.push({name, expected, runnerExitCode: result.status, accepted, durationMs: Math.round(performance.now() - time), contractSha: sha(targetContract), verifiedCodeFiles, report: `${name}.runner.json`});
    if (!accepted) throw new Error(`Synthetic scenario did not show its expected outcome: ${name}`);
  }
  const escalation = await load('behavior-escalation');
  let blocked = false; try { approveMaintenance(escalation, 'Fixture reviewer'); } catch { blocked = true; }
  if (!blocked || escalation.state !== 'escalated') throw new Error('Behavior change was not escalated');
  const receipt = {schema: 1, checkedAt: new Date().toISOString(), executionBackend: 'local-playwright-synthetic', browserChannel, pattern:manifest.pattern ?? 'inline', checks, behaviorWeakeningBlocked: true, totalExecutionDurationMs: Math.round(performance.now() - started), generationDurationMs: manifest.generationDurationMs, reviewTimeMs: null, modelCalls: 0, inputTokens: 0, outputTokens: 0, usageSource: 'no-model-calls', contextqaCalls: 0, contextqaHealingVerified: false, businessOutcome: 'not-measured'};
  await writeFile(join(root, 'acceptance.json'), JSON.stringify(receipt, null, 2) + '\n', {flag: 'wx', mode: 0o600});
  console.log(JSON.stringify(receipt));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => { console.error('Builder acceptance failed. Inspect the private runner reports; no ContextQA healing or business outcome is claimed.'); process.exitCode = 1; });
