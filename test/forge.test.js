import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {normalize,fetchSource} from '../src/sources.js';
import {validate,approve,changes,navigation} from '../src/contracts.js';
import {exportProject} from '../src/exporters.js';
const source=normalize('json',{id:'demo',title:'Synthetic test requirement',description:'Save preferences'});
const contract={schema:1,sourceSha:source.sourceSha,tests:[{id:'demo',title:'Value "quote"; untrusted input',steps:[{action:'navigate',env:'BASE_URL'},{action:'fill',selector:'#name',value:'`; process.exit(1); //'},{action:'assertText',selector:'#result',value:'Saved'}]}]};
for(const platform of ['github','jira','linear','testrail','xray','json']) test(`normalizes ${platform} fixture`,async()=>{
  const raw=JSON.parse(await readFile(`examples/fixtures/${platform}.json`)); const result=normalize(platform,raw);
  assert.ok(result.id);assert.match(result.sourceSha,/^[a-f0-9]{64}$/);assert.equal(result.platform,platform);
});
test('rejects PRs, GraphQL errors, missing selectors, missing assertions and arbitrary code',()=>{
  assert.throws(()=>normalize('github',{pull_request:{}}),/Pull requests/);
  assert.throws(()=>normalize('linear',{errors:[{message:'no'}]}),/errors/);
  for(const step of [{action:'eval',value:'evil'}, {action:'click'}, {action:'navigate',value:'javascript:evil'}]) {
    const copy=structuredClone(contract);copy.tests[0].steps[0]=step;assert.throws(()=>validate(copy));
  }
  const noAssert=structuredClone(contract);noAssert.tests[0].steps.pop();assert.throws(()=>validate(noAssert),/assertion/);
});
test('approval verifies source content and binds the contract to that snapshot',()=>{
  assert.throws(()=>approve(contract,'reviewer'),/snapshot/);
  const changed=structuredClone(source);changed.description='A different requirement';
  assert.throws(()=>approve(contract,'reviewer',changed),/hash/);
  const other=normalize('json',{id:'other',title:'Different source'});
  assert.throws(()=>approve(contract,'reviewer',other),/does not match/);
  const scoped=normalize('json',{id:'demo',title:'Synthetic'},'https://example.test/item/demo');
  assert.equal(approve({...contract,sourceSha:scoped.sourceSha},'reviewer',scoped).sourceLocator,scoped.locator);
});
test('navigation and environment references reject empty and unsafe values',()=>{
  for(const step of [{action:'navigate',value:''},{action:'navigate',env:''},{action:'fill',selector:'#name',env:''},{action:'navigate',value:'data:text/html;base64'}]) {
    const copy=structuredClone(contract);copy.tests[0].steps[0]=step;assert.throws(()=>validate(copy));
  }
  for(const url of ['file:///etc/passwd','javascript:alert(1)','ftp://example.test/file','data:text/plain,hello']) assert.throws(()=>navigation(url),/Navigation/);
  for(const url of ['https://example.test/path','http://127.0.0.1:9000/','data:text/html,<p>Fixture</p>','data:text/html;charset=utf-8;base64,SGk=']) assert.equal(navigation(url),url);
  const blank=structuredClone(contract);blank.tests[0].steps[1].value='';assert.equal(validate(blank),blank);
});
for(const framework of ['playwright','selenium','webdriverio']) test(`exports ${framework} with approval and literal escaping`,async()=>{
  const temp=await mkdtemp(join(tmpdir(),'forge-'));try {
    const receipt=approve(contract,'test reviewer',source);
    await assert.rejects(exportProject(contract,{},framework,join(temp,'unapproved')),/approval/);
    const changed=structuredClone(contract);changed.tests[0].title='changed';
    await assert.rejects(exportProject(changed,receipt,framework,join(temp,'changed')),/approval/);
    const out=join(temp,'project');await exportProject(contract,receipt,framework,out);
    const code=await readFile(join(out,'tests.spec.js'),'utf8');
    assert.ok(code.includes(JSON.stringify('`; process.exit(1); //')));
    const syntax=spawnSync(process.execPath,['--check',join(out,'tests.spec.js')],{encoding:'utf8'});
    assert.equal(syntax.status,0,syntax.stderr);
    const helper=code.slice(code.indexOf('function navigation('),code.indexOf('\ntest('));
    assert.equal(typeof runInNewContext(helper+'; navigation',{URL}),'function');
    assert.throws(()=>runInNewContext(helper+'; navigation(process.env.BASE_URL)',{URL,process:{env:{BASE_URL:'file:///etc/passwd'}}}),/Navigation/);
    assert.match(code,/navigation\(required\("BASE_URL"\)\)/);
    assert.equal(JSON.parse(await readFile(join(out,'traceability.json'))).executed,false);
    await assert.rejects(exportProject(contract,receipt,framework,out),/EEXIST/);
  } finally {await rm(temp,{recursive:true,force:true});}
});
for(const platform of ['jira','testrail','linear','xray']) test(`fetches ${platform} using its expected endpoint and authentication`,async()=>{
  const raw=JSON.parse(await readFile(`examples/fixtures/${platform}.json`));
  const id={jira:raw.key,testrail:String(raw.id),linear:raw.data?.issue?.identifier,xray:raw.data?.getTest?.issueId}[platform];
  const config={platform,id,baseUrl:'https://workspace.example',tokenEnv:'TOKEN',emailEnv:'EMAIL'};
  let request;
  const result=await fetchSource(config,{env:{TOKEN:'fake-test-token',EMAIL:'reviewer@example.test'},transport:async(url,options)=>{request={url,options};return new Response(JSON.stringify(raw));}});
  assert.equal(result.id,id);assert.equal(request.options.redirect,'error');
  if(platform==='jira' || platform==='testrail') {
    assert.equal(request.options.method,'GET');
    assert.equal(request.options.headers.Authorization,'Basic '+Buffer.from('reviewer@example.test:fake-test-token').toString('base64'));
    assert.equal(request.url,platform==='jira'?`https://workspace.example/rest/api/3/issue/${id}?fields=summary,description,updated`:`https://workspace.example/index.php?/api/v2/get_case/${id}`);
  } else {
    assert.equal(request.url,platform==='linear'?'https://api.linear.app/graphql':'https://xray.cloud.getxray.app/api/v2/graphql');
    assert.equal(request.options.method,'POST');
    assert.equal(request.options.headers.Authorization,platform==='linear'?'fake-test-token':'Bearer fake-test-token');
    assert.equal(JSON.parse(request.options.body).variables.id,id);
    assert.match(JSON.parse(request.options.body).query,platform==='linear'?/issue\(id: \$id\)/:/getTest\(issueId: \$id\)/);
  }
});
test('Linear OAuth and HTTP-200 GraphQL errors fail safely',async()=>{
  const config={platform:'linear',id:'DEMO-42',tokenEnv:'TOKEN',oauth:true};
  let header;
  await assert.rejects(fetchSource(config,{env:{TOKEN:'fake'},transport:async(url,options)=>{header=options.headers.Authorization;return new Response(JSON.stringify({errors:[{message:'secret source detail'}]}));}}),/Source request failed/);
  assert.equal(header,'Bearer fake');
});
test('source identity participates in approval hashes',()=>{
  const raw={number:42,title:'Identical issue body',body:'Same text'};
  const first=normalize('github',raw,'https://github.com/demo/first/issues/42');
  const second=normalize('github',raw,'https://github.com/demo/second/issues/42');
  assert.notEqual(first.sourceSha,second.sourceSha);
  assert.throws(()=>approve({...contract,sourceSha:first.sourceSha},'reviewer',second),/does not match/);
});
for(const platform of ['github','jira','testrail','linear','xray']) test(`rejects mismatched ${platform} resource response`,async()=>{
  const raw=JSON.parse(await readFile(`examples/fixtures/${platform}.json`));
  await assert.rejects(fetchSource({platform,id:'OTHER-999',owner:'demo',repo:'demo',baseUrl:'https://workspace.example',tokenEnv:'TOKEN',emailEnv:'EMAIL'},{env:{TOKEN:'fake',EMAIL:'reviewer@example.test'},transport:async()=>new Response(JSON.stringify(raw))}),/^Error: Source request failed \(HTTP 200\)/);
});
test('source adapters pin endpoints, disable redirects and reject excluded owner',async()=>{
  await assert.rejects(fetchSource({platform:'github',id:'1',owner:'indivatools',repo:'anything',tokenEnv:'TOKEN'},{env:{TOKEN:'fake'}}),/excluded/);
  let options;
  const source=await fetchSource({platform:'github',owner:'demo',repo:'demo',id:'42',tokenEnv:'TOKEN'},{env:{TOKEN:'fake'},transport:async(url,o)=>{assert.equal(url,'https://api.github.com/repos/demo/demo/issues/42');options=o;return new Response(JSON.stringify({number:42,title:'Demo'}));}});
  assert.equal(source.id,'42');assert.equal(options.redirect,'error');
});
test('diff retains added/removed/changed and review gate',()=>{
  const after=structuredClone(contract);after.tests[0].title='updated';after.sourceSha='b'.repeat(64);
  const result=changes(contract,after);assert.deepEqual(result.changed,['demo']);assert.equal(result.reviewRequired,true);assert.equal(result.sourceChanged,true);
});
