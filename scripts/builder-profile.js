#!/usr/bin/env node
import {readFile, writeFile} from 'node:fs/promises';
import {defaultProfile, validateProfile, recommendVersion} from '../src/profile.js';
import {subscriptionWorkflow} from '../src/sync.js';
const args = process.argv.slice(2), command = args.shift();
const option = key => args.includes(`--${key}`) ? args[args.indexOf(`--${key}`) + 1] : undefined;
try {
  const profile = command === 'init' ? structuredClone(defaultProfile) : validateProfile(JSON.parse(await readFile(option('profile'), 'utf8')));
  if (command === 'init') { if (option('name')) profile.builder.ownerName = option('name'); if (option('agent')) profile.builder.agentName = option('agent'); validateProfile(profile); }
  const result = command === 'workflow' ? subscriptionWorkflow(profile, {publishPullRequests: args.includes('--include-publish-step'), sourcePlatforms: option('sources') ? option('sources').split(',') : ['contextqa']}) : command === 'version' ? recommendVersion(profile.builder.version, option('change'), profile) : ['init', 'validate'].includes(command) ? profile : null;
  if (!result) throw new Error('Invalid command');
  if (option('out')) await writeFile(option('out'), typeof result === 'string' ? result : JSON.stringify(result, null, 2) + '\n', {flag: 'wx', mode: 0o600});
  console.log(JSON.stringify({command, valid: true, saved: Boolean(option('out')), ...(command === 'version' ? result : {}), scheduleEnabled: false}));
} catch { console.error('Profile failed. Check documented settings and use a fresh output path; see docs/customization.md.'); process.exitCode = 1; }
