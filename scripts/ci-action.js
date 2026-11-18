import {readFile,appendFile} from 'node:fs/promises';
import {ContextQAClient} from '../src/contextqa.js';
import {runCIGate} from '../src/ci-gate.js';
try {
  const profile = JSON.parse(await readFile(process.env['INPUT_PROFILE-FILE'],'utf8'));
  const context = JSON.parse(await readFile(process.env['INPUT_CONTEXT-FILE'],'utf8'));
  const receipt = await runCIGate({client:new ContextQAClient({token:process.env.INPUT_TOKEN}),profile,context,outputDir:process.env['INPUT_OUTPUT-DIRECTORY'],approveExecution:process.env['INPUT_APPROVE-EXECUTION'] === 'true'});
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT,`verdict=${receipt.verdict}\nrun-id=${receipt.runId ?? ''}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY,`ContextQA: **${receipt.verdict}**. Run: ${receipt.runId ?? 'not available'}. Build context is pipeline-attested.\n`);
  process.exitCode = receipt.verdict === 'passed' ? 0 : 2;
} catch { console.error('ContextQA action did not pass; inspect protected configuration and private receipts.'); process.exitCode = 2; }
