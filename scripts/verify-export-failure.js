#!/usr/bin/env node
// Acceptance control for repository-owned synthetic examples only. No live source/model calls.
import {readFile,writeFile,mkdtemp,realpath,symlink} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {approve,requireApproval} from '../src/contracts.js';
import {normalize} from '../src/sources.js';
import {exportProject} from '../src/exporters.js';

const marker='CQA_DELIBERATE_NEGATIVE_CONTROL_MUST_NOT_MATCH';
const args=process.argv.slice(2);
const option=name=>args.includes(name)?args[args.indexOf(name)+1]:undefined;
const save=(file,value)=>writeFile(file,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
try {
  const framework=option('--framework'),demo=option('--demo');
  if(!demo || !['playwright','selenium','webdriverio'].includes(framework)) throw new Error('Usage: node scripts/verify-export-failure.js --demo NEW_DEMO_DIRECTORY --framework playwright|selenium|webdriverio');
  const root=resolve(demo),positive=join(root,`github-${framework}`);
  const load=async filename=>JSON.parse(await readFile(join(root,filename),'utf8'));
  const source=await load('github.source.json'),contract=await load('github.contract.json'),receipt=await load('github.approval.json');
  const fixture=JSON.parse(await readFile(fileURLToPath(new URL('../examples/fixtures/github.json',import.meta.url)),'utf8'));
  if(source.sourceSha!==normalize('github',fixture).sourceSha || contract.tests.length!==1 || contract.tests[0].id!=='preferences-save' || contract.tests[0].steps.some(step=>step.env || step.action==='navigate' && !step.value?.startsWith('data:text/html,'))) throw new Error('This acceptance control only supports the repository-owned demo fixture');
  requireApproval(contract,receipt);
  // Keep the original successful assertions; append one deliberately impossible expectation.
  const negative=structuredClone(contract);
  negative.tests[0].title+=' — deliberately failing assertion';
  negative.tests[0].steps.push({action:'assertText',selector:'#result',value:marker});
  const review=approve(negative,'Repository synthetic negative control; not customer approval',source);
  const control=await mkdtemp(join(root,`negative-${framework}-`)),project=join(control,'project');
  await save(join(control,'contract.json'),negative);
  await save(join(control,'approval.json'),review);
  await exportProject(negative,review,framework,project);
  // Reuse the already installed, pinned framework. No second install or API key is needed.
  await symlink(await realpath(join(positive,'node_modules')),join(project,'node_modules'),process.platform==='win32'?'junction':'dir');
  const code=await readFile(join(project,'tests.spec.js'),'utf8');
  const assertionLine=code.split('\n').findIndex(line=>line.includes(marker))+1;
  const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['test'],{cwd:project,encoding:'utf8',timeout:120_000,maxBuffer:4*1024*1024,env:{...process.env,CI:'true',NO_COLOR:'1',FORCE_COLOR:'0'}});
  const log=(result.stdout || '')+(result.stderr || '');
  await writeFile(join(control,'runner.log'),log,{flag:'wx',mode:0o600});
  const reachedAssertion=new RegExp(`tests\\.spec\\.js:${assertionLine}(?::|\\b)`).test(log);
  const passed=result.status!==null && result.status!==0 && !result.error && reachedAssertion;
  await save(join(control,'result.json'),{schema:1,framework,checkedAt:new Date().toISOString(),expected:'failure at appended text assertion after original assertions',runnerExitCode:result.status,runnerSignal:result.signal,assertionLine,reachedAssertion,negativeControlPassed:passed,modelCalls:0,sourceApiCalls:0,output:control});
  process.stdout.write(log);
  if(!passed) throw new Error(`Negative control did not establish the expected assertion failure; inspect ${join(control,'runner.log')}`);
  console.log(JSON.stringify({framework,negativeControlPassed:true,runnerExitCode:result.status,assertionLine,output:control}));
} catch(error) {console.error(error.message);process.exitCode=1;}
