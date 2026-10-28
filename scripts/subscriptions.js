#!/usr/bin/env node
import {readFile, writeFile, mkdir, stat} from 'node:fs/promises';
import {fetchSource} from '../src/sources.js';
import {ContextQAClient} from '../src/contextqa.js';
import {readContextQACase} from '../src/contextqa-workflow.js';
import {prepareSubscriptions, assertSubscriptionCheckout} from '../src/subscriptions.js';
const args = process.argv.slice(2), option = key => args.includes(`--${key}`) ? args[args.indexOf(`--${key}`) + 1] : undefined;
const loadJson = async (path, {optional = false} = {}) => { try { if ((await stat(path)).size > 1_000_000) throw new Error('Input too large'); return JSON.parse(await readFile(path, 'utf8')); } catch (error) { if (optional && error.code === 'ENOENT') return null; throw error; } };
try {
  const out = option('out'); await mkdir(out, {mode: 0o700});
  const profile = await loadJson(option('profile')); assertSubscriptionCheckout(profile);
  let client;
  const results = await prepareSubscriptions({profile, watch: await loadJson(option('watch')), loadJson, readSource: async config => {
    if (config.platform !== 'contextqa') return fetchSource(config);
    client ??= new ContextQAClient();
    return (await readContextQACase(client, {caseId: config.caseId, stepIds: config.stepIds})).source;
  }});
  for (const {key, plan} of results) await writeFile(`${out}/${key}.plan.json`, JSON.stringify(plan, null, 2) + '\n', {flag: 'wx', mode: 0o600});
  console.log(JSON.stringify({items: results.length, changed: results.filter(r => r.plan.state !== 'unchanged').length, remoteWrites: 0, executionStarted: false}));
} catch { console.error('Subscription preparation stopped. Check selected sources, read-only access, relative input paths and a fresh output directory; no automatic retry or publication.'); process.exitCode = 1; }
