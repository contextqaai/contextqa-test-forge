#!/usr/bin/env node
import {readdir, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {publishSyncPlan} from '../src/github-sync.js';
const args = process.argv.slice(2), index = args.indexOf('--plans'), root = index >= 0 ? args[index + 1] : null;
try {
  if (!root || !args.includes('--approve-github-write')) throw new Error('Explicit publication approval required');
  const files = (await readdir(root)).filter(x => /^[a-z][a-z0-9_-]*\.plan\.json$/.test(x)).sort();
  if (!files.length || files.length > 20) throw new Error('Use a bounded prepared subscription directory');
  for (const file of files) {
    const plan = JSON.parse(await readFile(join(root, file), 'utf8'));
    if (plan.state === 'unchanged') continue;
    const receipt = await publishSyncPlan({plan, token: process.env.GITHUB_SYNC_TOKEN, approveWrite: true, journalFile: join(root, file + '.journal.json')});
    console.log(JSON.stringify(receipt));
  }
} catch { console.error('Publication stopped. Preserve the private journals and reconcile remote state before retrying. No automatic merge was attempted.'); process.exitCode = 1; }
