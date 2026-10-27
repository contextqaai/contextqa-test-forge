#!/usr/bin/env node
import {readFile,writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {normalize,fetchSource} from './sources.js';
import {approve,changes} from './contracts.js';
import {exportProject} from './exporters.js';
const args=process.argv.slice(2),command=args.shift();
const opt=name=>args.includes(`--${name}`)?args[args.indexOf(`--${name}`)+1]:undefined;
const load=async name=>JSON.parse(await readFile(opt(name),'utf8'));
const save=async(file,value)=>writeFile(file,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
const start=performance.now();
try {
  let result;
  if(command==='import') result=normalize(opt('platform'),await load('input'));
  else if(command==='fetch') result=await fetchSource(await load('config'));
  else if(command==='approve') {
    if(!args.includes('--confirm-reviewed')) throw new Error('Read the contract and source before --confirm-reviewed');
    if(!opt('source')) throw new Error('Supply --source with the normalized source snapshot you reviewed');
    result=approve(await load('contract'),opt('reviewer'),await load('source'));
  } else if(command==='diff') result=changes(await load('before'),await load('after'));
  else if(command==='export') result=await exportProject(await load('contract'),await load('approval'),opt('framework'),opt('out'));
  else throw new Error('Commands: import, fetch, approve, export, diff. See README for required options.');
  if(command!=='export') await save(opt('out'),result);
  console.log(JSON.stringify({command,saved:true,durationMs:Math.round(performance.now()-start),modelCalls:0,inputTokens:0,outputTokens:0,usageSource:'no-model-calls',executed:false}));
} catch(error) {console.error(error.message);process.exitCode=1;}
