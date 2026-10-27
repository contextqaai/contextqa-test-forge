import {createHash} from 'node:crypto';
import {boundedJSON} from './transport.js';
export const sha = value => createHash('sha256').update(typeof value === 'string'?value:JSON.stringify(value)).digest('hex');
function text(value) {
  if(typeof value==='string') return value;
  if(Array.isArray(value)) return value.map(text).join('\n');
  if(value && typeof value==='object') return [value.text || '',text(value.content || [])].filter(Boolean).join('\n');
  return '';
}
export function normalize(platform, raw, locator = null) {
  let id,title,description,revision,steps=[];
  if(platform==='github') {
    if(raw.pull_request) throw new Error('Pull requests are not test requirements');
    id=String(raw.number ?? ''); title=raw.title; description=raw.body || ''; revision=raw.updated_at;
  } else if(platform==='jira') {
    id=raw.key; title=raw.fields?.summary; description=text(raw.fields?.description); revision=raw.fields?.updated;
  } else if(platform==='linear') {
    if(raw.errors?.length) throw new Error('Linear returned GraphQL errors');
    const issue=raw.data?.issue ?? raw;
    id=issue.identifier || issue.id; title=issue.title; description=issue.description || ''; revision=issue.updatedAt;
  } else if(platform==='testrail') {
    id=String(raw.id ?? ''); title=raw.title; description=[raw.custom_preconds,raw.custom_steps,raw.custom_expected].filter(Boolean).join('\n'); revision=raw.updated_on || raw.version;
    steps=(raw.custom_steps_separated || []).map(s=>({action:s.content || '',expected:s.expected || ''}));
  } else if(platform==='xray') {
    if(raw.errors?.length) throw new Error('Xray returned GraphQL errors');
    const item=raw.data?.getTest ?? raw;
    id=item.issueId; title=item.title || `Xray test ${id}`; description=item.gherkin || ''; revision=item.lastModified;
    steps=(item.steps || []).map(s=>({action:s.action || '',data:s.data || '',expected:s.result || ''}));
  } else if(platform==='json') {
    id=raw.id;title=raw.title;description=raw.description || '';revision=raw.revision;steps=raw.steps || [];
  } else throw new Error('Supported sources: github, jira, linear, testrail, xray, json');
  if(!id || typeof title!=='string' || !title.trim()) throw new Error('Source requires a stable ID and title');
  const result={schema:1,platform,id:String(id),title,description,revision:revision ?? null,steps,locator};
  if(Buffer.byteLength(JSON.stringify(result))>256_000) throw new Error('Source exceeds 256 KB');
  return {...result,sourceSha:sha(result)};
}
function httpsOrigin(value) {
  const u=new URL(value);
  if(u.protocol!=='https:' || u.username || u.password || u.pathname!=='/' || u.search || u.hash) throw new Error('Source baseUrl must be an HTTPS origin without credentials/path/query');
  return u.origin;
}
export async function fetchSource(config, {env=process.env,transport=fetch}={}) {
  const p=config.platform;
  const id=String(config.id || '');
  if(!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('Explicit alphanumeric resource ID required');
  const key=env[config.tokenEnv];
  if(!key || /[\r\n]/.test(key)) throw new Error('Configured token environment variable is missing or invalid');
  let url, body, headers={Accept:'application/json'};
  if(p==='github') {
    if(!/^[A-Za-z0-9_.-]+$/.test(config.owner || '') || !/^[A-Za-z0-9_.-]+$/.test(config.repo || '') || config.owner.toLowerCase()==='indivatools') throw new Error('Invalid or excluded repository owner');
    url=`https://api.github.com/repos/${config.owner}/${config.repo}/issues/${id}`;
    headers.Authorization=`Bearer ${key}`;headers['X-GitHub-Api-Version']='2022-11-28';
  } else if(p==='jira' || p==='testrail') {
    const origin=httpsOrigin(config.baseUrl);
    if(!env[config.emailEnv]) throw new Error('Email environment variable required for Basic API authentication');
    headers.Authorization='Basic '+Buffer.from(`${env[config.emailEnv]}:${key}`).toString('base64');
    url=p==='jira'?`${origin}/rest/api/3/issue/${id}?fields=summary,description,updated`:`${origin}/index.php?/api/v2/get_case/${id}`;
  } else if(p==='linear') {
    url='https://api.linear.app/graphql'; headers.Authorization=config.oauth?`Bearer ${key}`:key;
    body={query:'query($id: String!) { issue(id: $id) { id identifier title description updatedAt } }',variables:{id}};
  } else if(p==='xray') {
    url='https://xray.cloud.getxray.app/api/v2/graphql';headers.Authorization=`Bearer ${key}`;
    body={query:'query($id: String!) { getTest(issueId: $id) { issueId gherkin steps { action data result } } }',variables:{id}};
  } else throw new Error('Live source must be github, jira, linear, testrail or xray');
  if(body) headers['Content-Type']='application/json';
  let response;
  try {
    response=await transport(url,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(30_000)});
    if(!response.ok) throw new Error('status');
    const raw=await boundedJSON(response);
    const locator=p==='github'?`https://github.com/${config.owner}/${config.repo}/issues/${id}`:p==='jira'?`${httpsOrigin(config.baseUrl)}/browse/${id}`:p==='testrail'?`${httpsOrigin(config.baseUrl)}/index.php?/cases/view/${id}`:p==='linear'?`linear:issue:${id}`:`xray-cloud:issue:${id}`;
    const result=normalize(p,raw,locator);
    const item=raw.data?.issue ?? raw;
    if(p==='linear' ? item.id!==id && item.identifier!==id : result.id!==id) throw new Error('Mismatched resource');
    return result;
  } catch {throw new Error(`Source request failed${response?` (HTTP ${response.status})`:''}; no response content logged`);}
}
