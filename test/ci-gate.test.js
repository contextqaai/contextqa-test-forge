import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runCIGate,validateCIContext} from '../src/ci-gate.js';
const context = {schema:1,provider:'github',repository:'example/app',commit:'a'.repeat(40),deployedCommit:'a'.repeat(40),deploymentId:'preview-1',expectedTotal:2};
const passed = {runId:7,completed:true,verdict:'passed',summary:{totalCount:2},profileSha256:'p',configurationSha256:'c'};
async function fixture(t) {const dir=await mkdtemp(join(tmpdir(),'cqa-ci-'));t.after(()=>rm(dir,{recursive:true,force:true}));return join(dir,'run');}
test('mismatched deployment stops before run',async t=>{let calls=0;await assert.rejects(runCIGate({context:{...context,deployedCommit:'b'.repeat(40)},outputDir:await fixture(t),approveExecution:true,run:()=>calls++}),/does not match/);assert.equal(calls,0)});
test('missing or zero expected scope is rejected',()=>{for(const n of [0,-1,null])assert.throws(()=>validateCIContext({...context,expectedTotal:n}));});
test('positive complete outcome writes one JUnit gate assertion and no raw response',async t=>{const outputDir=await fixture(t);const r=await runCIGate({context,profile:{},outputDir,approveExecution:true,run:async()=>({...passed,summary:{totalCount:2,secret:'do-not-copy'}})});assert.equal(r.verdict,'passed');assert.match(await readFile(join(outputDir,'junit.xml'),'utf8'),/failures="0"/);assert.doesNotMatch(await readFile(join(outputDir,'receipt.json'),'utf8'),/do-not-copy/);});
test('incomplete expected scope cannot pass',async t=>{const r=await runCIGate({context,profile:{},outputDir:await fixture(t),approveExecution:true,run:async()=>({...passed,summary:{totalCount:1}})});assert.equal(r.verdict,'inconclusive')});
test('failed and timed out outcomes remain blocking',async t=>{for(const verdict of ['failed','inconclusive']){const r=await runCIGate({context,profile:{},outputDir:await fixture(t),approveExecution:true,run:async()=>({...passed,verdict})});assert.equal(r.verdict,verdict)}});
test('uncertain start is not retried or leaked',async t=>{let calls=0;const outputDir=await fixture(t);const options={context,profile:{},outputDir,approveExecution:true,run:async()=>{calls++;throw new Error('secret')}};const r=await runCIGate(options);assert.equal(r.verdict,'inconclusive');assert.equal(calls,1);await assert.rejects(runCIGate(options),/EEXIST/);assert.equal(calls,1);assert.doesNotMatch(await readFile(join(outputDir,'receipt.json'),'utf8'),/secret/)});
test('execution approval required',async t=>{await assert.rejects(runCIGate({context,profile:{},outputDir:await fixture(t)}),/approved/)});
