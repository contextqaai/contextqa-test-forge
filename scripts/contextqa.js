#!/usr/bin/env node
import {readFile, open} from 'node:fs/promises';
import {ContextQAClient, catalog, executePlanOnce} from '../src/contextqa.js';
import {inspectProject, runProject} from '../src/contextqa-project.js';

const args = process.argv.slice(2), command = args.shift();
const opt = name => args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined;
const save = async (path, value) => {
  if (!path) throw new Error('Supply --out in a private directory');
  const f = await open(path, 'wx', 0o600);
  try { await f.writeFile(JSON.stringify(value, null, 2) + '\n'); await f.sync(); } finally { await f.close(); }
};
const json = async name => opt(name) ? JSON.parse(await readFile(opt(name), 'utf8')) : undefined;
try {
  if (command === 'operations') {
    console.log(JSON.stringify({source: catalog.source, sourceSha256: catalog.sourceSha256, operations: catalog.operations.map(({operationId, method, path, permission, effect}) => ({operationId, method, path, permission, effect}))}, null, 2));
  } else {
    const client = new ContextQAClient();
    let result;
    if (command === 'request') {
      const operationId = opt('operation');
      const operation = catalog.operations.find(x => x.operationId === operationId);
      if (operation?.effect === 'execute') throw new Error('Use run with a fresh journal for non-idempotent execution');
      if (!opt('out')) throw new Error('Supply --out for private API output');
      // Reserve output before a mutation so a reused output path cannot cause duplicate writes.
      const output = await open(opt('out'), 'wx', 0o600);
      try {
        result = await client.request(operationId, {id: opt('id'), query: await json('query') || {}, body: await json('body'), approveWrite: args.includes('--approve-write')});
        await output.writeFile(JSON.stringify({operationId, result, metrics: client.metrics}, null, 2) + '\n'); await output.sync();
      } finally { await output.close(); }
      console.log(JSON.stringify({saved: true, operationId, requests: client.metrics.requests, paidExecutionStarted: false}));
    } else if (command === 'run') {
      result = await executePlanOnce({client, planId: opt('plan'), query: await json('query') || {}, journalFile: opt('journal'), approveExecution: args.includes('--approve-execution')});
      console.log(JSON.stringify({...result, state: 'accepted', requests: client.metrics.requests, billingCost: null, modelTokens: null}));
    } else if (command === 'project-check' || command === 'project-run') {
      if (!opt('profile') || !opt('out')) throw new Error('Supply --profile and a fresh private --out file');
      const profile = await json('profile');
      const output = await open(opt('out'), 'wx', 0o600);
      try {
        result = command === 'project-check' ? await inspectProject(client, profile) : await runProject({client,profile,journalFile:opt('journal'),approveExecution:args.includes('--approve-execution')});
        await output.writeFile(JSON.stringify(result,null,2)+'\n');await output.sync();
      } finally {await output.close();}
      console.log(JSON.stringify({saved:true,projectName:profile.name,checked:true,...(result.runId ? {runId:result.runId,completed:result.completed,verdict:result.verdict} : {paidExecutionStarted:false})}));
      if (result.verdict && result.verdict !== 'passed') process.exitCode = 2;
    } else if (command === 'wait') {
      if (!opt('out')) throw new Error('Supply --out for private results');
      result = await client.waitForRun(opt('run'), {maxPolls: opt('max-polls') === undefined ? 30 : Number(opt('max-polls')), intervalMs: opt('interval-ms') === undefined ? 1000 : Number(opt('interval-ms'))});
      await save(opt('out'), {...result, metrics: client.metrics});
      console.log(JSON.stringify({runId: result.runId, completed: result.completed, verdict: result.verdict, polls: result.polls, saved: true}));
      if (result.verdict !== 'passed') process.exitCode = 2;
    } else throw new Error('Commands: operations; request --operation NAME [--id N] [--query JSON_FILE] [--body JSON_FILE] [--approve-write] --out PRIVATE_FILE; run --plan N --journal NEW_PRIVATE_FILE --approve-execution; wait --run N --out NEW_PRIVATE_FILE');
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
