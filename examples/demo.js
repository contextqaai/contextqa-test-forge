import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {normalize} from '../src/sources.js';
import {approve} from '../src/contracts.js';
import {exportProject} from '../src/exporters.js';
const start=performance.now();
const out=process.argv[2] || 'output/demo-'+Date.now();
await mkdir(out,{recursive:true,mode:0o700});
const html=`<!doctype html><title>Disposable account preferences</title><label>Name<input id="name"></label><select id="theme"><option value="light">Light</option><option value="dark">Dark</option></select><label><input id="notify" type="checkbox">Notify</label><button id="save" onclick="document.querySelector('#result').textContent='Saved'">Save</button><p id="result">Unsaved</p>`;
const results=[];
for(const platform of ['github','jira','linear','testrail','xray','json']) {
  const source=normalize(platform,JSON.parse(await readFile(`examples/fixtures/${platform}.json`,'utf8')));
  await writeFile(`${out}/${platform}.source.json`,JSON.stringify(source,null,2)+'\n');
  const contract={schema:1,sourceSha:source.sourceSha,tests:[{id:'preferences-save',title:'Save preferences in a disposable fixture',steps:[
    {action:'navigate',value:'data:text/html,'+encodeURIComponent(html)},
    {action:'fill',selector:'#name',value:'Demo reviewer'},
    {action:'select',selector:'#theme',value:'dark'},
    {action:'check',selector:'#notify'},
    {action:'click',selector:'#save'},
    {action:'assertVisible',selector:'#result'},
    {action:'assertText',selector:'#result',value:'Saved'}
  ]}]};
  // Only the repository-owned synthetic fixture receives this scripted approval.
  const receipt=approve(contract,'Repository synthetic example; not customer approval',source);
  await writeFile(`${out}/${platform}.contract.json`,JSON.stringify(contract,null,2)+'\n');
  await writeFile(`${out}/${platform}.approval.json`,JSON.stringify(receipt,null,2)+'\n');
  for(const framework of ['playwright','selenium','webdriverio']) results.push(await exportProject(contract,receipt,framework,`${out}/${platform}-${framework}`));
}
const metrics={schema:1,generatedAt:new Date().toISOString(),scenario:'Synthetic source fixtures; no customer API, model or browser execution',durationMs:Math.round(performance.now()-start),sources:6,projects:results.length,modelCalls:0,inputTokens:0,outputTokens:0,usageSource:'no-model-calls',executed:false,results};
await writeFile(`${out}/metrics.json`,JSON.stringify(metrics,null,2)+'\n');
console.log(JSON.stringify({output:out,...metrics,results:undefined}));
