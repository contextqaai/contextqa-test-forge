import {open} from 'node:fs/promises';
import {dirname} from 'node:path';
import {sha} from './sources.js';
import {boundedJSON} from './transport.js';

const origin='https://api.github.com';
const digest=/^[a-f0-9]{64}$/;
const gitSha=/^[a-f0-9]{40}$/;
const secretPattern=/-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9_]{12,}|github_pat_[A-Za-z0-9_]{12,}|sk-(?:proj-|ant-)?[A-Za-z0-9_-]{12,}|token_contextqa-[A-Za-z0-9_.-]{8,})/;
const fail=message=>{throw new Error(message);};
function object(value,keys) {
  if(!value || typeof value!=='object' || Array.isArray(value) || ![Object.prototype,null].includes(Object.getPrototypeOf(value)) || Object.keys(value).some(key=>!keys.includes(key))) fail('Invalid GitHub sync plan structure');
}
function text(value,max) {
  if(typeof value!=='string' || !value.trim() || Buffer.byteLength(value)>max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value) || secretPattern.test(value)) fail('Invalid or sensitive GitHub sync plan text');
}
function path(value) {
  if(typeof value!=='string' || value.length>240 || !/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(value)) fail('Invalid generated file path');
  const parts=value.split('/');
  if(parts.some(part=>part==='.' || part==='..' || ['.github','.git','node_modules'].includes(part.toLowerCase()))) fail('Excluded generated file path');
  return value;
}
function branch(value,{prefix=false}={}) {
  if(typeof value!=='string' || !value.length || value.length>180 || !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(value) || value.includes('..') || value.includes('//') || value.split('/').some(part=>part.startsWith('.') || part.endsWith('.') || part.endsWith('.lock')) || (!prefix && /[/.]$/.test(value))) fail('Invalid GitHub branch');
}
function validatePlan(plan) {
  object(plan,['schema','state','event','repository','branch','title','body','files','sourceSha','contractSha','planSha']);
  if(plan.schema!==1 || !['ready','review-required'].includes(plan.state) || !['test.created','test.updated'].includes(plan.event)) fail('Only a ready or review-required GitHub sync plan can be published');
  object(plan.repository,['owner','repo','baseBranch','branchPrefix','filePrefix','generatedDirectory','customDirectory','autoMerge']);
  const repository=plan.repository;
  if(typeof repository.owner!=='string' || !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(repository.owner) || repository.owner.toLowerCase()==='indivatools' || typeof repository.repo!=='string' || !/^[A-Za-z0-9_.-]{1,100}$/.test(repository.repo) || ['.','..'].includes(repository.repo) || repository.autoMerge!==false) fail('Invalid or excluded private GitHub repository');
  branch(repository.baseBranch);branch(repository.branchPrefix,{prefix:true});branch(plan.branch);
  if(repository.filePrefix!==undefined && (typeof repository.filePrefix!=='string' || !/^[a-z][a-z0-9_-]{0,39}-$/.test(repository.filePrefix))) fail('Invalid generated file prefix');
  if(!plan.branch.startsWith(repository.branchPrefix) || plan.branch===repository.branchPrefix || plan.branch===repository.baseBranch) fail('Sync branch must be distinct and match the reviewed prefix');
  path(repository.generatedDirectory);path(repository.customDirectory);
  if(!digest.test(plan.sourceSha || '') || !(plan.contractSha===null || digest.test(plan.contractSha || '')) || !digest.test(plan.planSha || '')) fail('GitHub sync source, contract and plan hashes are required');
  const {planSha,...payload}=plan;
  if(sha(payload)!==planSha) fail('GitHub sync plan hash has changed');
  text(plan.title,200);text(plan.body,16000);
  if(!Array.isArray(plan.files) || !plan.files.length || plan.files.length>30) fail('GitHub sync requires 1–30 generated files');
  let total=0;const paths=new Set(),reviewDirectories=new Set();
  for(const file of plan.files) {
    object(file,['path','content']);path(file.path);
    if(!file.path.startsWith(repository.generatedDirectory+'/') || file.path===repository.customDirectory || file.path.startsWith(repository.customDirectory+'/') || paths.has(file.path)) fail('Only distinct generated-directory children may be written');
    paths.add(file.path);
    const leaf=file.path.split('/').at(-1);
    if((leaf.startsWith('.env') && leaf!=='.env.example') || !(leaf==='.env.example' || leaf==='.gitignore' || /\.(?:[cm]?js|json|md|txt|html|css|svg|ya?ml|vtt)$/.test(leaf))) fail('Only reviewed generated text files may be written');
    if(plan.state==='review-required') {
      const parts=file.path.slice(repository.generatedDirectory.length+1).split('/');
      if(parts.length!==2 || !['source.json','sync-state.json','UPDATE.md'].includes(parts[1]) || (repository.filePrefix!==undefined && (!parts[0].startsWith(repository.filePrefix) || parts[0]===repository.filePrefix))) fail('Review-required sync only writes one source review packet');
      reviewDirectories.add(parts[0]);
      if(reviewDirectories.size>1) fail('Review-required sync only writes one source review packet');
    }
    if(typeof file.content!=='string' || Buffer.byteLength(file.content)>1_000_000 || /\u0000/u.test(file.content) || secretPattern.test(file.content)) fail('Invalid or sensitive generated content');
    total+=Buffer.byteLength(file.content);
    if(total>2_000_000) fail('Generated content exceeds the total size limit');
  }
  return plan;
}
function acceptedSha(data) {
  if(!gitSha.test(data?.sha || '')) fail('GitHub returned an invalid object reference');
  return data.sha;
}
function pullURL(data,repository) {
  let url;
  try {url=new URL(data.html_url);} catch {fail('GitHub returned an invalid pull request reference');}
  if(url.origin!=='https://github.com' || url.username || url.password || url.search || url.hash || !Number.isSafeInteger(data.number) || data.number<1 || url.pathname!==`/${repository.owner}/${repository.repo}/pull/${data.number}` || data.merged===true) fail('GitHub returned an invalid pull request reference');
  return url.href;
}
function matchingExistingPull(data,existing,plan) {
  if(!Array.isArray(data) || data.length!==1) fail('An existing branch needs one matching open pull request');
  const pull=data[0],fullName=`${plan.repository.owner}/${plan.repository.repo}`;
  if(existing.ref!==`refs/heads/${plan.branch}` || pull.state!=='open' || pull.title!==plan.title || pull.body!==plan.body || pull.head?.ref!==plan.branch || pull.head?.sha!==acceptedSha(existing.object) || pull.base?.ref!==plan.repository.baseBranch || pull.head?.repo?.full_name!==fullName || pull.base?.repo?.full_name!==fullName || pull.head?.repo?.private!==true || pull.base?.repo?.private!==true || pull.auto_merge!=null) fail('Existing pull request does not match the reviewed sync plan');
  return pullURL(pull,plan.repository);
}

/** Publish reviewed generated files as one private-repository branch and PR.
 * No checkout, code execution, author override, merge or automatic retry occurs.
 * A fresh journal is a one-attempt control; inspect remote state after any stop.
 */
export async function publishSyncPlan({plan,token,approveWrite=false,journalFile,fetchImpl=globalThis.fetch}={}) {
  if(approveWrite!==true) fail('GitHub sync requires explicit write approval');
  plan=validatePlan(structuredClone(plan));
  if(typeof token!=='string' || !token.trim() || token.length>8192 || /[\r\n]/.test(token)) fail('A valid GitHub token is required in the server or CLI environment');
  if(typeof journalFile!=='string' || !journalFile || journalFile.length>4096 || journalFile.includes('\0') || typeof fetchImpl!=='function') fail('A fresh private GitHub sync journal is required');
  const repository=plan.repository,base=`/repos/${repository.owner}/${repository.repo}`;
  const journal={schema:1,provider:'github',planSha:plan.planSha,sourceSha:plan.sourceSha,contractSha:plan.contractSha,event:plan.event,plannedState:plan.state,repository:{owner:repository.owner,repo:repository.repo,baseBranch:repository.baseBranch},branch:plan.branch,files:plan.files.map(file=>({path:file.path,sha256:sha(file.content),bytes:Buffer.byteLength(file.content)})),state:'preflight',startedAt:new Date().toISOString(),operations:[],pullRequestUrl:null,merged:false,autoMerge:false};
  let handle;
  try {handle=await open(journalFile,'wx',0o600);} catch {fail('A fresh private GitHub sync journal is required; existing journals cannot be replayed');}
  const persist=async()=>{
    const bytes=Buffer.from(JSON.stringify(journal,null,2)+'\n');
    let offset=0;
    while(offset<bytes.length) {
      const {bytesWritten}=await handle.write(bytes,offset,bytes.length-offset,offset);
      if(!bytesWritten) fail('Could not durably record GitHub sync intent');
      offset+=bytesWritten;
    }
    await handle.truncate(bytes.length);await handle.sync();
  };
  let writeStarted=false,reconciliationRequired=false;
  const request=async(method,endpoint,body,{allowMissing=false}={})=>{
    let response;
    try {
      response=await fetchImpl(origin+endpoint,{method,headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'manual',signal:AbortSignal.timeout(15_000)});
      if(allowMissing && response.status===404) {await response.body?.cancel();return null;}
      if(response.status!==(method==='GET'?200:201)) {await response.body?.cancel();throw new Error('HTTP status');}
      return await boundedJSON(response,1_000_000);
    } catch {fail(`GitHub sync request failed${response?` (HTTP ${response.status})`:''}; no response content logged`);}
  };
  const write=async(stage,endpoint,body,accept)=>{
    const operation={stage,state:'attempting',startedAt:new Date().toISOString()};
    journal.state='attempting';journal.operations.push(operation);await persist();
    writeStarted=true;
    const result=await request('POST',endpoint,body);
    const reference=accept(result);
    operation.state='accepted';operation.reference=reference;operation.acceptedAt=new Date().toISOString();
    await persist();return reference;
  };
  try {
    await persist();
    const parent=await open(dirname(journalFile),'r');
    try {await parent.sync();} finally {await parent.close();}
    const remote=await request('GET',base);
    if(remote.private!==true || remote.full_name!==`${repository.owner}/${repository.repo}` || remote.archived===true || remote.disabled===true) fail('The selected repository must be the exact writable private repository');
    const baseRef=await request('GET',`${base}/git/ref/heads/${encodeURIComponent(repository.baseBranch)}`);
    if(baseRef.ref!==`refs/heads/${repository.baseBranch}`) fail('GitHub base reference does not match the reviewed branch');
    const baseSha=acceptedSha(baseRef.object);
    const existing=await request('GET',`${base}/git/ref/heads/${encodeURIComponent(plan.branch)}`,undefined,{allowMissing:true});
    if(existing!==null) {
      reconciliationRequired=true;
      const pulls=await request('GET',`${base}/pulls?state=open&head=${encodeURIComponent(repository.owner+':'+plan.branch)}&base=${encodeURIComponent(repository.baseBranch)}&per_page=2`);
      const pullRequestUrl=matchingExistingPull(pulls,existing,plan),existingSha=acceptedSha(existing.object);
      journal.baseSha=baseSha;journal.commitSha=existingSha;journal.pullRequestUrl=pullRequestUrl;
      journal.state='existing-pr-needs-review';journal.remoteWrites=0;journal.generatedFilesVerified=false;journal.completedAt=new Date().toISOString();await persist();
      return {schema:1,provider:'github',state:'existing-pr-needs-review',plannedState:plan.state,reviewRequired:true,planSha:plan.planSha,sourceSha:plan.sourceSha,contractSha:plan.contractSha,branch:plan.branch,commitSha:existingSha,pullRequestUrl,remoteWrites:0,generatedFilesVerified:false,merged:false,autoMerge:false};
    }
    const commit=await request('GET',`${base}/git/commits/${baseSha}`);
    if(acceptedSha(commit)!==baseSha) fail('GitHub base commit does not match the reviewed reference');
    const baseTree=acceptedSha(commit.tree);
    journal.baseSha=baseSha;journal.baseTree=baseTree;await persist();
    const treeSha=await write('create-tree',`${base}/git/trees`,{base_tree:baseTree,tree:plan.files.map(file=>({path:file.path,mode:'100644',type:'blob',content:file.content}))},acceptedSha);
    const commitSha=await write('create-commit',`${base}/git/commits`,{message:plan.title,tree:treeSha,parents:[baseSha]},acceptedSha);
    await write('create-branch',`${base}/git/refs`,{ref:`refs/heads/${plan.branch}`,sha:commitSha},data=>{
      if(data.ref!==`refs/heads/${plan.branch}` || acceptedSha(data.object)!==commitSha) fail('GitHub returned a mismatched branch reference');
      return data.ref;
    });
    const pullRequestUrl=await write('create-pull-request',`${base}/pulls`,{title:plan.title,body:plan.body,head:plan.branch,base:repository.baseBranch,draft:false},data=>pullURL(data,repository));
    journal.pullRequestUrl=pullRequestUrl;journal.commitSha=commitSha;journal.state='pull-request-created';journal.completedAt=new Date().toISOString();await persist();
    return {schema:1,provider:'github',state:'pull-request-created',plannedState:plan.state,reviewRequired:plan.state==='review-required',planSha:plan.planSha,sourceSha:plan.sourceSha,contractSha:plan.contractSha,branch:plan.branch,commitSha,pullRequestUrl,merged:false,autoMerge:false};
  } catch(error) {
    journal.state=writeStarted || reconciliationRequired?'reconcile-required':'rejected';
    journal.stoppedAt=new Date().toISOString();
    try {await persist();} catch {}
    // Do not reflect token, plan contents, remote error bodies or caller paths.
    fail(writeStarted?'GitHub sync stopped; remote writes may exist. Reconcile the private journal before any new attempt.':reconciliationRequired?'GitHub sync stopped; existing remote state needs review. Reconcile the private journal before any new attempt.':'GitHub sync preflight failed; inspect the private journal and repository configuration before another attempt.');
  } finally {await handle.close();}
}
