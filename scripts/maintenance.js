#!/usr/bin/env node
import {readFile, writeFile} from 'node:fs/promises';
import {proposeMaintenance, approveMaintenance, exportMaintenance} from '../src/maintenance.js';
const args = process.argv.slice(2), command = args.shift();
const option = name => args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined;
const load = async name => JSON.parse(await readFile(option(name), 'utf8'));
try {
  let result;
  if (command === 'propose') result = proposeMaintenance({before: await load('before'), after: await load('after'), source: await load('source'), evidence: await load('evidence'), classification: option('classification'), reason: option('reason')});
  else if (command === 'approve') {
    if (!args.includes('--confirm-reviewed')) throw new Error('Inspect the complete before/after proposal and evidence before --confirm-reviewed');
    result = approveMaintenance(await load('proposal'), option('reviewer'));
  } else if (command === 'export') result = await exportMaintenance(await load('proposal'), await load('approval'), option('out'));
  else throw new Error('Commands: propose, approve, export. See docs/maintenance.md');
  if (command !== 'export') await writeFile(option('out'), JSON.stringify(result, null, 2) + '\n', {flag: 'wx', mode: 0o600});
  console.log(JSON.stringify({command, state: result.state ?? 'reviewed-awaiting-rerun', saved: true, executed: false, contextqaHealingVerified: false}));
} catch { console.error('Maintenance failed. Check paths, contract/source hashes, classification and unchanged human approval; see docs/maintenance.md.'); process.exitCode = 1; }
