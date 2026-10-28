#!/usr/bin/env node
import {readFile, writeFile} from 'node:fs/promises';
import {planSync} from '../src/sync.js';
import {publishSyncPlan} from '../src/github-sync.js';
const args = process.argv.slice(2), command = args.shift();
const option = key => args.includes(`--${key}`) ? args[args.indexOf(`--${key}`) + 1] : undefined;
const load = async key => option(key) ? JSON.parse(await readFile(option(key), 'utf8')) : null;
try {
  if (command === 'plan') {
    const plan = await planSync({profile: await load('profile'), source: await load('source'), contract: await load('contract'), approval: await load('approval'), previous: await load('previous')});
    await writeFile(option('out'), JSON.stringify(plan, null, 2) + '\n', {flag: 'wx', mode: 0o600});
    console.log(JSON.stringify({state: plan.state, files: plan.files.length, externalWrites: 0}));
  } else if (command === 'publish') {
    const receipt = await publishSyncPlan({plan: await load('plan'), token: process.env.GITHUB_SYNC_TOKEN, approveWrite: args.includes('--approve-github-write'), journalFile: option('journal')});
    console.log(JSON.stringify(receipt));
  } else throw new Error('Invalid command');
} catch { console.error('Sync stopped. Inspect the private plan/journal and reconcile any uncertain GitHub writes before retrying; see docs/customization.md.'); process.exitCode = 1; }
