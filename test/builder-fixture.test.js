import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, rm, symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {builderFixture, assertBuilderFixture} from '../examples/builder-fixture.js';
import {sha} from '../src/sources.js';
import {approve} from '../src/contracts.js';
import {exportProject} from '../src/exporters.js';
import {parseBuilderAcceptanceArgs, builderRunnerConfig, assertBuilderProjectFiles} from '../scripts/verify-builder-lifecycle.js';

const candidate = () => {
  const value = builderFixture();
  return {...value, manifest:{scenario:'repository-owned-synthetic-expense-policy',beforeSha:sha(value.before),afterSha:sha(value.after)}};
};
test('trusted fixture is deterministic, detached and restricted to APP_URL plus exact original assertions', () => {
  const a = builderFixture(), b = builderFixture();
  assert.deepEqual(a,b);assert.equal(assertBuilderFixture(candidate()),true);
  a.before.tests[0].steps[0].env = 'UNREVIEWED_URL';
  assert.equal(b.before.tests[0].steps[0].env,'APP_URL');
  for (const contract of [b.before,b.after]) {
    assert.deepEqual(contract.tests[0].steps[0],{action:'navigate',env:'APP_URL',sourceStepIds:['1001']});
    assert.deepEqual(contract.tests[0].steps.filter(step=>step.action==='assertText').map(step=>step.value),['Manager approval required','Approved']);
  }
});

test('page-object fixture is explicit, deterministic and retains the default business actions and assertions', () => {
  const inline=builderFixture();
  assert.equal(Object.hasOwn(inline.before,'codeStyle'),false);
  assert.deepEqual(builderFixture({pattern:'inline'}),inline);
  for(const indent of [2,4]) {
    const first=builderFixture({pattern:'page-object',indent}),second=builderFixture({pattern:'page-object',indent});
    assert.deepEqual(first,second);assert.deepEqual(first.source,inline.source);assert.deepEqual(first.apps,inline.apps);
    assert.deepEqual(first.before.tests,inline.before.tests);assert.deepEqual(first.after.tests,inline.after.tests);
    assert.deepEqual(first.before.codeStyle,{pattern:'page-object',indent});
    assert.deepEqual(first.after.codeStyle,first.before.codeStyle);
    const input={...first,manifest:{scenario:'repository-owned-synthetic-expense-policy',pattern:'page-object',indent,beforeSha:sha(first.before),afterSha:sha(first.after)}};
    assert.equal(assertBuilderFixture(input,{pageObject:true}),true);
    assert.throws(()=>assertBuilderFixture(input),/explicit page-object/);
  }
  for(const options of [{pattern:'arbitrary'},{pattern:'page-object',indent:8},{pattern:'inline',indent:4}]) assert.throws(()=>builderFixture(options));
});

test('forged pattern and indentation cannot bypass the repository-owned fixture guard', () => {
  for(const pattern of ['page-object','custom','../../outside',{},null]) {
    const input=candidate();input.manifest.pattern=pattern;
    assert.throws(()=>assertBuilderFixture(input));
  }
  const value=builderFixture({pattern:'page-object'}),input={...value,manifest:{scenario:'repository-owned-synthetic-expense-policy',pattern:'page-object',indent:4,beforeSha:sha(value.before),afterSha:sha(value.after)}};
  assert.throws(()=>assertBuilderFixture(input,{pageObject:true}),/unchanged repository-owned/);
  const inline=candidate();assert.throws(()=>assertBuilderFixture(inline,{pageObject:true}),/explicit page-object/);
});

test('recomputed local hashes cannot authorize a different source, target, environment or assertion', () => {
  const mutations = [
    input => {delete input.before.tests[0].steps[0].env; input.before.tests[0].steps[0].value='https://outside.invalid';},
    input => {input.after.tests[0].steps[0].env='CUSTOMER_TARGET';},
    input => {input.before.tests[0].steps[3].value='Approved';},
    input => {input.after.tests[0].steps[2].selector='#anything';},
    input => {input.source.body='A replacement requirement'; const {sourceSha,...payload}=input.source;input.source.sourceSha=sha(payload);input.before.sourceSha=input.source.sourceSha;input.after.sourceSha=input.source.sourceSha;},
  ];
  for (const change of mutations) {
    const input = candidate();change(input);
    input.manifest.beforeSha=sha(input.before);input.manifest.afterSha=sha(input.after);
    assert.throws(()=>assertBuilderFixture(input),/unchanged repository-owned/);
  }
});

test('all HTML bytes are bound, including network techniques outside the former URL regex', () => {
  for (const suffix of ['<img src="//outside.invalid/pixel">','<script>new WebSocket("wss://outside.invalid")</script>','<!-- even a harmless edit needs regeneration -->']) {
    const input=candidate();input.apps['app-after']+=suffix;
    assert.throws(()=>assertBuilderFixture(input),/repository-owned/);
  }
  for (const input of [{...candidate(),apps:{}},{...candidate(),apps:null},{...candidate(),apps:{...candidate().apps,extra:'extra'}}]) assert.throws(()=>assertBuilderFixture(input),/repository-owned/);
});

test('inline and page-object generator outputs match the same guard without launching browsers or using any account', async t => {
  const root=await mkdtemp(join(tmpdir(),'forge-fixture-'));t.after(()=>rm(root,{recursive:true,force:true}));
  for(const pattern of ['inline','page-object']) {
    const out=join(root,pattern),pageObject=pattern==='page-object';
    const result=await promisify(execFile)(process.execPath,['examples/builder-lifecycle.js',out,...(pageObject?['--page-object']:[])],{cwd:process.cwd()});
    assert.equal(JSON.parse(result.stdout).executed,false);assert.equal(JSON.parse(result.stdout).pattern,pattern);
    const input={};for(const name of ['manifest','source','before','after']) input[name]=JSON.parse(await readFile(join(out,`${name}.json`),'utf8'));
    input.apps=Object.fromEntries(await Promise.all(['app-before','app-after','app-defect'].map(async name=>[name,await readFile(join(out,`${name}.html`),'utf8')])));
    assert.equal(assertBuilderFixture(input,{pageObject}),true);
    for(const name of ['baseline','negative-rule','stale-locator','repaired','behavior-defect']) {
      const contract=structuredClone(['repaired','behavior-defect'].includes(name)?input.after:input.before);
      if(name==='negative-rule')contract.tests[0].steps[3].value='Approved';
      const traceability=JSON.parse(await readFile(join(out,name,'traceability.json'),'utf8'));
      assert.deepEqual(await assertBuilderProjectFiles(join(out,name),contract,traceability.review),pageObject?['tests.spec.js','pages/workflow-1.js']:['tests.spec.js']);
    }
  }
});

test('page-object verification rejects changed, extra, missing and symlinked page code before execution', async t => {
  const root=await mkdtemp(join(tmpdir(),'forge-pom-guard-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const fixture=builderFixture({pattern:'page-object'}),receipt=approve(fixture.before,'Synthetic fixture reviewer',fixture.source),project=join(root,'project');
  await exportProject(fixture.before,receipt,'playwright',project);
  const path=join(project,'pages/workflow-1.js'),original=await readFile(path,'utf8');
  assert.deepEqual(await assertBuilderProjectFiles(project,fixture.before,receipt),['tests.spec.js','pages/workflow-1.js']);
  await writeFile(path,original+'\nthrow new Error("untrusted extra code");\n');
  await assert.rejects(assertBuilderProjectFiles(project,fixture.before,receipt),/Generated tests changed/);
  await writeFile(path,original);await writeFile(join(project,'pages/extra.js'),'throw new Error("extra");');
  await assert.rejects(assertBuilderProjectFiles(project,fixture.before,receipt),/Generated page files changed/);
  await rm(join(project,'pages/extra.js'));await rm(path);
  await assert.rejects(assertBuilderProjectFiles(project,fixture.before,receipt),/Generated page files changed/);
  await writeFile(join(root,'outside.js'),original);await symlink(join(root,'outside.js'),path);
  await assert.rejects(assertBuilderProjectFiles(project,fixture.before,receipt),/Generated page files changed/);
});

test('acceptance runner permits only default Chromium or the explicit installed Chrome channel', () => {
  assert.equal(parseBuilderAcceptanceArgs(['fixture']).browserChannel,'chromium');
  assert.equal(parseBuilderAcceptanceArgs(['fixture','--channel','chromium']).browserChannel,'chromium');
  assert.equal(parseBuilderAcceptanceArgs(['fixture','--channel','chrome']).browserChannel,'chrome');
  assert.deepEqual(parseBuilderAcceptanceArgs(['fixture','--page-object','--channel','chrome']),{root:parseBuilderAcceptanceArgs(['fixture']).root,browserChannel:'chrome',pageObject:true});
  assert.equal(parseBuilderAcceptanceArgs(['fixture','--channel','chrome','--page-object']).pageObject,true);
  const standard=builderRunnerConfig(), chrome=builderRunnerConfig('chrome');
  assert.equal(Object.hasOwn(standard.use,'channel'),false);
  assert.equal(chrome.use.channel,'chrome');assert.equal(chrome.retries,0);assert.equal(chrome.workers,1);
  assert.equal(Object.hasOwn(chrome.use,'storageState'),false);
  assert.equal(Object.hasOwn(chrome.use,'launchOptions'),false);
  for (const args of [[],['--channel','chrome'],['fixture','--channel','firefox'],['fixture','--channel','/custom/executable'],['fixture','--channel','chrome','--token','hidden'],['fixture','extra'],['fixture','--page-object','--page-object'],['fixture','--channel','chrome','--channel','chromium']]) assert.throws(()=>parseBuilderAcceptanceArgs(args));
  assert.throws(()=>builderRunnerConfig('custom'));
});
