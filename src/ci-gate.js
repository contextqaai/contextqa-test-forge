import {mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {runProject} from './contextqa-project.js';

const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const clean = x => typeof x === 'string' && x.length > 0 && x.length <= 200 && /^[a-zA-Z0-9_.:/@-]+$/.test(x);
export function validateCIContext(context) {
  if (!context || context.schema !== 1 || !['github','gitlab','circleci','jenkins','azure','bitbucket','other'].includes(context.provider)) throw new Error('Invalid CI context provider');
  for (const key of ['repository','commit','deployedCommit','deploymentId']) if (!clean(context[key])) throw new Error(`Missing or invalid CI context: ${key}`);
  if (!/^[a-f0-9]{40,64}$/i.test(context.commit) || context.commit !== context.deployedCommit) throw new Error('Candidate commit does not match deployment attestation');
  if (!Number.isSafeInteger(context.expectedTotal) || context.expectedTotal < 1) throw new Error('CI context needs a positive expectedTotal');
  const keys = ['schema','provider','repository','commit','deployedCommit','deploymentId','expectedTotal'];
  if (Object.keys(context).some(k => !keys.includes(k))) throw new Error('Unknown CI context field');
  return structuredClone(context);
}

// Context is a trusted pipeline attestation, not a claim of server-side build verification.
// Provider adapters do not evaluate PR text or automatically generate/select tests.
export async function runCIGate({client, profile, context, outputDir, approveExecution = false, run = runProject}) {
  context = validateCIContext(context);
  if (approveExecution !== true) throw new Error('CI execution requires approved target and run policy');
  if (typeof outputDir !== 'string' || !outputDir) throw new Error('A new private output directory is required');
  await mkdir(outputDir, {mode: 0o700}); // EEXIST blocks reuse; never replay an uncertain start.
  const receipt = {schema:1, context, profileSha256:digest(profile), verdict:'inconclusive', runId:null, completed:false, liveAcceptanceVerified:false};
  await writeFile(join(outputDir,'receipt.json'),JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
  try {
    const result = await run({client,profile,journalFile:join(outputDir,'intent.json'),approveExecution:true});
    receipt.runId = result.runId;
    receipt.completed = result.completed;
    receipt.verdict = result.verdict;
    receipt.observedTotal = result.summary?.totalCount ?? null;
    if (receipt.verdict === 'passed' && receipt.observedTotal !== context.expectedTotal) receipt.verdict = 'inconclusive';
    receipt.configurationSha256 = result.configurationSha256;
    receipt.profileSha256 = result.profileSha256;
    receipt.contextBinding = 'pipeline-attested; not independently checked against deployed application';
  } catch {
    receipt.error = 'Execution or result collection failed; inspect the private intent journal before any retry.';
  }
  await writeFile(join(outputDir,'receipt.json'),JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
  const failed = receipt.verdict !== 'passed';
  // One gate assertion, deliberately not a fabricated per-case report.
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="ContextQA execution gate" tests="1" failures="${failed ? 1 : 0}"><testcase name="Reviewed plan completed with expected scope">${failed ? '<failure message="ContextQA gate did not pass; see receipt and intent journal"/>' : ''}</testcase></testsuite>\n`;
  await writeFile(join(outputDir,'junit.xml'),xml,{mode:0o600});
  return receipt;
}
