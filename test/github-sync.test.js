import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {publishSyncPlan} from '../src/github-sync.js';
import {normalize,sha} from '../src/sources.js';
import {approve} from '../src/contracts.js';
import {defaultProfile} from '../src/profile.js';
import {planSync} from '../src/sync.js';

const token='synthetic-github-token-not-a-real-credential';
const baseSha='1'.repeat(40),baseTree='2'.repeat(40),treeSha='3'.repeat(40),commitSha='4'.repeat(40);
const sign=payload=>{const {planSha,...rest}=payload;return {...rest,planSha:sha(rest)};};
function sample() {
  return sign({schema:1,state:'ready',event:'test.created',repository:{owner:'contextqaai',repo:'private-sample',baseBranch:'main',branchPrefix:'qa/',filePrefix:'qa-',generatedDirectory:'tests/generated',customDirectory:'tests/custom',autoMerge:false},branch:'qa/github-42-example',title:'Review synthetic QA update',body:'Synthetic generated code; review before merging.',files:[{path:'tests/generated/qa-github-42/tests.spec.js',content:'// Synthetic, never executed by the publisher.\n'}],sourceSha:'a'.repeat(64),contractSha:'b'.repeat(64)});
}
async function directory(t) {
  const dir=await mkdtemp(join(tmpdir(),'forge-github-sync-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));return dir;
}
function matchingPull(plan) {
  const repo={full_name:`${plan.repository.owner}/${plan.repository.repo}`,private:true};
  return {number:7,html_url:`https://github.com/${repo.full_name}/pull/7`,state:'open',title:plan.title,body:plan.body,merged:false,auto_merge:null,head:{ref:plan.branch,sha:commitSha,repo},base:{ref:plan.repository.baseBranch,repo}};
}
function transport(plan,{journalFile,onRequest,privateRepo=true,fullName,existing=false,pulls=[],pullStatus=200,failStage,badPullURL,badRef=false,oversized=false}={}) {
  const calls=[],repo=plan.repository,root=`/repos/${repo.owner}/${repo.repo}`;
  const request=async(url,options)=>{
    const endpoint=new URL(url).pathname,body=options.body?JSON.parse(options.body):null;
    calls.push({url,endpoint,method:options.method,body});
    assert.equal(new URL(url).origin,'https://api.github.com');assert.equal(options.redirect,'manual');
    assert.equal(options.headers.Authorization,`Bearer ${token}`);assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.headers['X-GitHub-Api-Version'],'2022-11-28');
    if(options.method==='POST') {
      const journal=JSON.parse(await readFile(journalFile,'utf8'));
      assert.equal(journal.state,'attempting');assert.equal(journal.operations.at(-1).state,'attempting');
      if(process.platform!=='win32') assert.equal((await stat(journalFile)).mode & 0o777,0o600);
      if(journal.operations.at(-1).stage===failStage) throw new Error('PRIVATE_PROVIDER_BODY '+token);
    }
    if(onRequest) await onRequest({url,options,body,calls});
    if(options.method==='GET' && endpoint===root) return Response.json({private:privateRepo,full_name:fullName ?? `${repo.owner}/${repo.repo}`});
    if(options.method==='GET' && endpoint===`${root}/git/ref/heads/${encodeURIComponent(repo.baseBranch)}`) return Response.json({ref:badRef?'refs/heads/wrong':`refs/heads/${repo.baseBranch}`,object:{sha:baseSha}});
    if(options.method==='GET' && endpoint===`${root}/git/ref/heads/${encodeURIComponent(plan.branch)}`) return existing?Response.json({ref:`refs/heads/${plan.branch}`,object:{sha:commitSha}}):new Response('PRIVATE missing branch',{status:404});
    if(options.method==='GET' && endpoint===`${root}/pulls`) {
      const query=new URL(url).searchParams;
      assert.equal(query.get('state'),'open');assert.equal(query.get('head'),`${repo.owner}:${plan.branch}`);
      assert.equal(query.get('base'),repo.baseBranch);assert.equal(query.get('per_page'),'2');
      return pullStatus===200?Response.json(pulls):new Response('PRIVATE lookup failure '+token,{status:pullStatus});
    }
    if(options.method==='GET' && endpoint===`${root}/git/commits/${baseSha}`) return Response.json({sha:baseSha,tree:{sha:baseTree}});
    if(options.method==='POST' && endpoint===`${root}/git/trees`) return oversized?new Response('private',{status:201,headers:{'content-length':'1000001'}}):Response.json({sha:treeSha},{status:201});
    if(options.method==='POST' && endpoint===`${root}/git/commits`) return Response.json({sha:commitSha},{status:201});
    if(options.method==='POST' && endpoint===`${root}/git/refs`) return Response.json({ref:`refs/heads/${plan.branch}`,object:{sha:commitSha}},{status:201});
    if(options.method==='POST' && endpoint===`${root}/pulls`) return Response.json({number:7,html_url:badPullURL ?? `https://github.com/${repo.owner}/${repo.repo}/pull/7`,merged:false},{status:201});
    throw new Error('Unexpected mock endpoint');
  };
  return {fetchImpl:request,calls};
}

test('publishes one tree, commit, new branch and private PR with durable intent and no author/merge override',async t=>{
  const dir=await directory(t),journalFile=join(dir,'intent.json'),plan=sample(),mock=transport(plan,{journalFile});
  const result=await publishSyncPlan({plan,token,approveWrite:true,journalFile,fetchImpl:mock.fetchImpl});
  assert.equal(result.state,'pull-request-created');assert.equal(result.pullRequestUrl,'https://github.com/contextqaai/private-sample/pull/7');
  assert.equal(result.merged,false);assert.equal(result.autoMerge,false);assert.equal(result.reviewRequired,false);
  assert.deepEqual(mock.calls.map(call=>[call.method,call.endpoint]),[
    ['GET','/repos/contextqaai/private-sample'],['GET','/repos/contextqaai/private-sample/git/ref/heads/main'],
    ['GET','/repos/contextqaai/private-sample/git/ref/heads/qa%2Fgithub-42-example'],['GET',`/repos/contextqaai/private-sample/git/commits/${baseSha}`],
    ['POST','/repos/contextqaai/private-sample/git/trees'],['POST','/repos/contextqaai/private-sample/git/commits'],
    ['POST','/repos/contextqaai/private-sample/git/refs'],['POST','/repos/contextqaai/private-sample/pulls']
  ]);
  assert.deepEqual(mock.calls[4].body,{base_tree:baseTree,tree:[{path:plan.files[0].path,mode:'100644',type:'blob',content:plan.files[0].content}]});
  assert.deepEqual(mock.calls[5].body,{message:plan.title,tree:treeSha,parents:[baseSha]});
  assert.deepEqual(mock.calls[6].body,{ref:`refs/heads/${plan.branch}`,sha:commitSha});
  assert.deepEqual(mock.calls[7].body,{title:plan.title,body:plan.body,head:plan.branch,base:'main',draft:false});
  const journal=JSON.parse(await readFile(journalFile,'utf8'));
  assert.equal(journal.state,'pull-request-created');assert.equal(journal.operations.length,4);
  assert.ok(journal.operations.every(operation=>operation.state==='accepted'));
  assert.ok(!JSON.stringify(journal).includes(token));assert.ok(!JSON.stringify(journal).includes(plan.files[0].content));
  const count=mock.calls.length;
  await assert.rejects(publishSyncPlan({plan,token,approveWrite:true,journalFile,fetchImpl:mock.fetchImpl}),/cannot be replayed/);
  assert.equal(mock.calls.length,count);
});

test('requires explicit approval, unchanged hash and safe generated-only paths before any network or journal',async t=>{
  const dir=await directory(t);let calls=0;
  const invoke=async(plan,approveWrite=true)=>publishSyncPlan({plan,token,approveWrite,journalFile:join(dir,'must-not-exist.json'),fetchImpl:async()=>{calls++;throw new Error('Must not run');}});
  await assert.rejects(invoke(sample(),false),/explicit write approval/);
  const stale=sample();stale.files[0].content='Changed after approval';await assert.rejects(invoke(stale),/hash has changed/);
  for(const mutate of [
    p=>{p.repository.owner='InDiVaToOlS';},p=>{p.repository.autoMerge=true;},
    p=>{p.repository.generatedDirectory='../generated';},p=>{p.branch='main';},
    p=>{p.branch='qa/../escape';},p=>{p.branch='qa/unsafe.lock';},p=>{p.branch='other/update';},
    p=>{p.files[0].path='tests/custom/handwritten.js';},p=>{p.files[0].path='tests/generated/../escape.js';},
    p=>{p.files[0].path='tests/generated/.github/workflows/run.yml';},p=>{p.files[0].path='tests/generated/.env';},
    p=>{p.files[0].path='tests/generated/run.sh';},p=>{p.files[0].path='tests/generated/file.js\\evil';},
    p=>{p.files.push({...p.files[0]});},p=>{p.files[0].content='x'.repeat(1_000_001);},
    p=>{p.files=Array.from({length:31},(_,i)=>({path:`tests/generated/file-${i}.js`,content:'x'}));},
    p=>{p.files=Array.from({length:3},(_,i)=>({path:`tests/generated/file-${i}.js`,content:'x'.repeat(700_000)}));},
    p=>{p.files[0].content='token_contextqa-synthetic.ABCDEFGHIJKLMNOP';},
    p=>{p.repository.author={name:'Forged author'};},p=>{p.state='unchanged';}
  ]) {
    const plan=sample();mutate(plan);await assert.rejects(invoke(sign(plan)),Error,mutate.toString());
  }
  assert.equal(calls,0);await assert.rejects(stat(join(dir,'must-not-exist.json')),{code:'ENOENT'});
});

test('private identity, matching base ref and absent new branch are mandatory before writes',async t=>{
  const dir=await directory(t);
  for(const [index,settings] of [{privateRepo:false},{fullName:'different/private-sample'},{badRef:true}].entries()) {
    const plan=sample(),journalFile=join(dir,`preflight-${index}.json`),mock=transport(plan,{journalFile,...settings});
    await assert.rejects(publishSyncPlan({plan,token,approveWrite:true,journalFile,fetchImpl:mock.fetchImpl}),/preflight failed/);
    assert.ok(mock.calls.every(call=>call.method==='GET'));
    assert.equal(JSON.parse(await readFile(journalFile,'utf8')).state,'rejected');
  }
});

test('every ambiguous write stops once and requires reconciliation without replay or secret output',async t=>{
  const dir=await directory(t);
  for(const [index,stage] of ['create-tree','create-commit','create-branch','create-pull-request'].entries()) {
    const plan=sample(),journalFile=join(dir,`ambiguous-${index}.json`),mock=transport(plan,{journalFile,failStage:stage});
    await assert.rejects(publishSyncPlan({plan,token,approveWrite:true,journalFile,fetchImpl:mock.fetchImpl}),error=>{
      assert.match(error.message,/remote writes may exist/);assert.ok(!error.message.includes(token));assert.ok(!error.message.includes('PRIVATE_PROVIDER_BODY'));return true;
    });
    const journal=JSON.parse(await readFile(journalFile,'utf8'));
    assert.equal(journal.state,'reconcile-required');assert.equal(journal.operations.at(-1).stage,stage);
    assert.equal(mock.calls.filter(call=>call.method==='POST').length,index+1);
    assert.ok(!JSON.stringify(journal).includes(token));
    const count=mock.calls.length;
    await assert.rejects(publishSyncPlan({plan,token,approveWrite:true,journalFile,fetchImpl:mock.fetchImpl}),/cannot be replayed/);
    assert.equal(mock.calls.length,count);
  }
});

test('redirects, oversized write responses and foreign pull URLs cannot become successful receipts',async t=>{
  const dir=await directory(t);
  for(const [index,settings] of [{oversized:true},{badPullURL:'https://github.com/another/repo/pull/7'},{badPullURL:'https://github.com/contextqaai/private-sample/pull/7?token=private'}].entries()) {
    const plan=sample(),journalFile=join(dir,`invalid-${index}.json`),mock=transport(plan,{journalFile,...settings});
    await assert.rejects(publishSyncPlan({plan,token,approveWrite:true,journalFile,fetchImpl:mock.fetchImpl}),/Reconcile/);
    const journal=JSON.parse(await readFile(journalFile,'utf8'));
    assert.equal(journal.state,'reconcile-required');assert.equal(journal.pullRequestUrl,null);
  }
  const plan=sample(),journalFile=join(dir,'redirect.json');let calls=0;
  await assert.rejects(publishSyncPlan({plan,token,approveWrite:true,journalFile,fetchImpl:async(url,options)=>{calls++;assert.equal(options.redirect,'manual');return new Response('PRIVATE',{status:302,headers:{location:'https://untrusted.example'}});}}),/preflight failed/);
  assert.equal(calls,1);
});

test('review-required plans only publish one prefixed source packet and never scripts',async t=>{
  const dir=await directory(t),plan=sample();
  plan.state='review-required';plan.contractSha=null;plan.files=['source.json','sync-state.json','UPDATE.md'].map(name=>({path:`tests/generated/qa-github-42/${name}`,content:'Synthetic review packet\n'}));
  const signed=sign(plan),journalFile=join(dir,'review.json'),mock=transport(signed,{journalFile});
  const result=await publishSyncPlan({plan:signed,token,approveWrite:true,journalFile,fetchImpl:mock.fetchImpl});
  assert.equal(result.reviewRequired,true);assert.equal(result.plannedState,'review-required');
  for(const badPath of ['tests/generated/qa-github-42/tests.spec.js','tests/generated/source.json','tests/generated/qa-github-42/deeper/source.json','tests/generated/other/source.json']) {
    const invalid=structuredClone(signed);invalid.files[0].path=badPath;
    await assert.rejects(publishSyncPlan({plan:sign(invalid),token,approveWrite:true,journalFile:join(dir,'unused.json'),fetchImpl:async()=>{throw Error('Must not fetch');}}),/source review packet/);
  }
  const invalid=structuredClone(signed);invalid.files[1].path='tests/generated/qa-other/sync-state.json';
  await assert.rejects(publishSyncPlan({plan:sign(invalid),token,approveWrite:true,journalFile:join(dir,'unused.json'),fetchImpl:async()=>{throw Error('Must not fetch');}}),/source review packet/);
});

test('real default-profile planSync packets hand off to the publisher for reviewed and source-only PRs',async t=>{
  const dir=await directory(t),source=normalize('github',{number:42,title:'Synthetic approval requirement',body:'Approved requests show Approved.'});
  for(const mode of ['review-required','ready']) {
    const profile=structuredClone(defaultProfile);profile.repository.repo='private-sample';profile.codeStyle={pattern:'page-object',indent:4};
    const contract={schema:1,sourceSha:source.sourceSha,builder:profile.builder,codeStyle:profile.codeStyle,tests:[{id:'approve',title:'Synthetic approval',steps:[{action:'navigate',env:'STAGING_URL'},{action:'assertText',selector:'#status',value:'Approved'}]}]};
    const plan=await planSync({profile,source,...(mode==='ready'?{contract,approval:approve(contract,'Synthetic reviewer',source)}:{})});
    assert.equal(plan.state,mode);assert.equal(plan.repository.filePrefix,'qa-');
    assert.ok(plan.files.every(file=>/^tests\/generated\/qa-github-42-[a-f0-9]{12}\//.test(file.path)));
    const journalFile=join(dir,`${mode}.json`),mock=transport(plan,{journalFile});
    const result=await publishSyncPlan({plan,token,approveWrite:true,journalFile,fetchImpl:mock.fetchImpl});
    assert.equal(result.reviewRequired,mode==='review-required');
    const tree=mock.calls.find(call=>call.endpoint.endsWith('/git/trees')).body.tree;
    assert.equal(tree.length,plan.files.length);
    if(mode==='ready') assert.ok(tree.some(file=>file.path.endsWith('/pages/workflow-1.js')));
    else assert.deepEqual(tree.map(file=>file.path.split('/').at(-1)),['source.json','sync-state.json','UPDATE.md']);
  }
});

test('publisher snapshots the complete approved plan before any asynchronous step',async t=>{
  const dir=await directory(t),plan=sample(),expected=structuredClone(plan),journalFile=join(dir,'snapshot.json');
  const mock=transport(expected,{journalFile,onRequest:async({calls})=>{if(calls.length===1){plan.files[0].content='Changed during preflight';plan.repository.repo='other';plan.branch='qa/replaced';}}});
  const result=await publishSyncPlan({plan,token,approveWrite:true,journalFile,fetchImpl:mock.fetchImpl});
  assert.equal(result.planSha,expected.planSha);assert.equal(result.branch,expected.branch);
  assert.equal(mock.calls.find(call=>call.endpoint.endsWith('/git/trees')).body.tree[0].content,expected.files[0].content);
  assert.ok(mock.calls.every(call=>call.endpoint.startsWith('/repos/contextqaai/private-sample')));
});

test('repeated planning returns the one matching open PR for review with no duplicate or overwrite',async t=>{
  const dir=await directory(t),plan=sample(),firstJournal=join(dir,'first.json'),first=transport(plan,{journalFile:firstJournal});
  assert.equal((await publishSyncPlan({plan,token,approveWrite:true,journalFile:firstJournal,fetchImpl:first.fetchImpl})).state,'pull-request-created');
  assert.equal(first.calls.filter(call=>call.method==='POST').length,4);
  const journalFile=join(dir,'second.json'),repeat=transport(plan,{journalFile,existing:true,pulls:[matchingPull(plan)]});
  const result=await publishSyncPlan({plan,token,approveWrite:true,journalFile,fetchImpl:repeat.fetchImpl});
  assert.equal(result.state,'existing-pr-needs-review');assert.equal(result.pullRequestUrl,'https://github.com/contextqaai/private-sample/pull/7');
  assert.equal(result.reviewRequired,true);assert.equal(result.remoteWrites,0);assert.equal(result.generatedFilesVerified,false);
  assert.equal(result.merged,false);assert.equal(result.commitSha,commitSha);
  assert.equal(repeat.calls.filter(call=>call.method==='POST').length,0);
  assert.deepEqual(repeat.calls.map(call=>call.endpoint),[
    '/repos/contextqaai/private-sample','/repos/contextqaai/private-sample/git/ref/heads/main',
    '/repos/contextqaai/private-sample/git/ref/heads/qa%2Fgithub-42-example','/repos/contextqaai/private-sample/pulls'
  ]);
  const journal=JSON.parse(await readFile(journalFile,'utf8'));
  assert.equal(journal.state,'existing-pr-needs-review');assert.equal(journal.operations.length,0);
  assert.equal(journal.remoteWrites,0);assert.equal(journal.generatedFilesVerified,false);
  // A genuinely changed, newly reviewed plan uses a different safe branch.
  const changed=structuredClone(plan);changed.sourceSha='c'.repeat(64);changed.branch='qa/github-42-newhash';changed.files[0].content='// A changed approved generated file.\n';
  const next=sign(changed),nextJournal=join(dir,'next.json'),newMock=transport(next,{journalFile:nextJournal});
  assert.equal((await publishSyncPlan({plan:next,token,approveWrite:true,journalFile:nextJournal,fetchImpl:newMock.fetchImpl})).state,'pull-request-created');
  assert.equal(newMock.calls.filter(call=>call.method==='POST').length,4);
});

test('existing branches with absent, mismatched or unverifiable PRs hold for reconciliation without writes',async t=>{
  const dir=await directory(t),plan=sample();
  const cases=[
    [],[matchingPull(plan),matchingPull(plan)],
    ...[
      p=>{p.state='closed';},p=>{p.head.sha='5'.repeat(40);},p=>{p.head.ref='qa/other';},
      p=>{p.base.ref='other';},p=>{p.title='Unexpected title';},p=>{p.body='Different reviewed scope';},
      p=>{p.head.repo.full_name='other/private-sample';},p=>{p.base.repo.private=false;},
      p=>{p.html_url='https://github.com/other/private-sample/pull/7';},p=>{p.auto_merge={merge_method:'squash'};}
    ].map(mutate=>{const pull=structuredClone(matchingPull(plan));mutate(pull);return [pull];})
  ];
  for(const [index,pulls] of cases.entries()) {
    const journalFile=join(dir,`hold-${index}.json`),mock=transport(plan,{journalFile,existing:true,pulls});
    await assert.rejects(publishSyncPlan({plan,token,approveWrite:true,journalFile,fetchImpl:mock.fetchImpl}),/existing remote state needs review.*Reconcile/);
    assert.ok(mock.calls.every(call=>call.method==='GET'));
    const journal=JSON.parse(await readFile(journalFile,'utf8'));
    assert.equal(journal.state,'reconcile-required');assert.equal(journal.pullRequestUrl,null);assert.equal(journal.operations.length,0);
  }
  const journalFile=join(dir,'failed-lookup.json'),mock=transport(plan,{journalFile,existing:true,pullStatus:503});
  await assert.rejects(publishSyncPlan({plan,token,approveWrite:true,journalFile,fetchImpl:mock.fetchImpl}),error=>{
    assert.match(error.message,/Reconcile/);assert.ok(!error.message.includes(token));assert.ok(!error.message.includes('PRIVATE'));return true;
  });
  assert.equal(mock.calls.filter(call=>call.endpoint.endsWith('/pulls')).length,1);
  assert.equal(mock.calls.filter(call=>call.method==='POST').length,0);
});
