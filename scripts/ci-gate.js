#!/usr/bin/env node
import {readFile} from 'node:fs/promises';
import {ContextQAClient} from '../src/contextqa.js';
import {runCIGate} from '../src/ci-gate.js';
try {
  const profile = JSON.parse(await readFile(process.env.CONTEXTQA_PROFILE_FILE,'utf8'));
  const context = JSON.parse(await readFile(process.env.CONTEXTQA_CONTEXT_FILE,'utf8'));
  const receipt = await runCIGate({client:new ContextQAClient(),profile,context,outputDir:process.env.CONTEXTQA_OUTPUT_DIR,approveExecution:process.env.CONTEXTQA_APPROVE_EXECUTION === 'true'});
  console.log(JSON.stringify({verdict:receipt.verdict,runId:receipt.runId,completed:receipt.completed}));
  process.exitCode = receipt.verdict === 'passed' ? 0 : 2;
} catch { console.error('ContextQA CI configuration or execution failed; inspect protected configuration and private receipts.'); process.exitCode = 2; }
