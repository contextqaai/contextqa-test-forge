import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {checkContextQAConnection} from '../src/contextqa-connection.js';
import {runConnectionCLI} from '../scripts/contextqa-connection.js';

const env={CONTEXTQA_API_TOKEN:'token_demo.SYNTHETIC_ONLY'};

test('missing credentials and invalid explicit plan choices make no request',async()=>{
  let calls=0;const fetchImpl=async()=>{calls++;throw new Error('Must not be called');};
  const missing=await checkContextQAConnection({planId:17,env:{},fetchImpl});assert.equal(missing.status,'not_configured');assert.equal(missing.configured,false);
  for(const planId of [undefined,0,-1,true,'17/execution','https://example.com',9007199254740992]){
    const checked=await checkContextQAConnection({planId,env,fetchImpl});assert.equal(checked.status,'configuration_invalid');
  }
  const malformed=await checkContextQAConnection({planId:17,env:{CONTEXTQA_API_TOKEN:'SECRET\nDO_NOT_ECHO'},fetchImpl});
  assert.equal(malformed.status,'configuration_invalid');assert.ok(!JSON.stringify(malformed).includes('SECRET'));assert.equal(calls,0);
});

test('one exact plan GET verifies only that selected read and returns no plan contents',async()=>{
  const calls=[];const checked=await checkContextQAConnection({planId:'17',env,fetchImpl:async(url,options)=>{
    calls.push({url,options});return Response.json({id:17,name:'PRIVATE_PLAN_NAME',environmentId:29,artifact:'https://private.example/?signature=PRIVATE'});
  }});
  assert.equal(calls.length,1);assert.equal(calls[0].url,'https://server.contextqa.com/test_plans/17');assert.equal(calls[0].options.method,'GET');assert.equal(calls[0].options.redirect,'manual');assert.equal(calls[0].options.body,undefined);
  assert.equal(checked.status,'read_access_verified');assert.equal(checked.readAccessVerified,true);assert.equal(checked.requestCount,1);assert.equal(checked.requiredPermission,'TEST_PLANS_READ');assert.equal(checked.executionAuthorization,'not_checked');assert.equal(checked.liveResultVerification,'not_checked');assert.equal(checked.paidExecutionStarted,false);
  assert.ok(!JSON.stringify(checked).includes('PRIVATE'));assert.ok(!JSON.stringify(checked).includes(env.CONTEXTQA_API_TOKEN));
});

test('401,403,404,429 have distinct safe statuses and never retry',async()=>{
  for(const [http,status] of [[401,'credential_rejected'],[403,'permission_missing'],[404,'plan_unavailable'],[429,'rate_limited']]){
    let calls=0;const checked=await checkContextQAConnection({planId:17,env,fetchImpl:async()=>{calls++;return new Response('PRIVATE upstream token_demo.SECRET',{status:http,headers:{'retry-after':'8'}});}});
    assert.equal(calls,1);assert.equal(checked.status,status);assert.equal(checked.httpStatus,http);assert.equal(checked.readAccessVerified,false);assert.equal(checked.retryAfterSeconds,http===429?8:null);assert.ok(!JSON.stringify(checked).includes('PRIVATE'));assert.ok(!JSON.stringify(checked).includes('SECRET'));
    if(http===403)assert.ok(checked.message.includes('does not identify'));
  }
});

test('mismatched identity, server failure, redirect and malformed data never verify access',async()=>{
  for(const [response,expected] of [[Response.json({id:18}),'unexpected_response'],[Response.json({id:'17'}),'unexpected_response'],[Response.json({}),'unexpected_response'],[new Response('PRIVATE',{status:500}),'connection_error'],[new Response('PRIVATE',{status:302,headers:{location:'https://private.example/SECRET'}}),'connection_error'],[new Response('PRIVATE not-json'),'connection_error']]){
    const checked=await checkContextQAConnection({planId:17,env,fetchImpl:async()=>response});assert.equal(checked.status,expected);assert.equal(checked.readAccessVerified,false);assert.ok(!JSON.stringify(checked).includes('PRIVATE'));assert.ok(!JSON.stringify(checked).includes('SECRET'));
  }
});

test('transport failures are safe and a timeout signal bounds the single read',async()=>{
  let calls=0;const checked=await checkContextQAConnection({planId:17,env,fetchImpl:async(url,options)=>{calls++;assert.ok(options.signal instanceof AbortSignal);throw new Error('PRIVATE TLS data token_demo.SECRET');}});
  assert.equal(calls,1);assert.equal(checked.status,'connection_error');assert.equal(checked.httpStatus,null);assert.ok(!JSON.stringify(checked).includes('PRIVATE'));
});

test('CLI rejects token/duplicate/unknown flags without echoing their content',async()=>{
  for(const argv of [[],['--token','PRIVATE_TOKEN'],['--plan-id','17','--plan-id','18'],['--plan-id','17','--token','PRIVATE_TOKEN']]){
    let output='';const code=await runConnectionCLI({argv,env,fetchImpl:async()=>{throw new Error('Must not fetch');},write:value=>output+=value,writeError:value=>output+=value});assert.equal(code,2);assert.ok(!output.includes('PRIVATE_TOKEN'));
  }
});

test('CLI JSON and exit codes separate verified, setup/access and transport states',async()=>{
  const fixtures=[{env:{},response:null,code:2,status:'not_configured'},{env,response:Response.json({id:17}),code:0,status:'read_access_verified'},{env,response:new Response('',{status:403}),code:2,status:'permission_missing'},{env,response:new Response('',{status:500}),code:1,status:'connection_error'}];
  for(const fixture of fixtures){let output='';const code=await runConnectionCLI({argv:['--plan-id','17'],env:fixture.env,fetchImpl:async()=>fixture.response,write:value=>output+=value,writeError:value=>output+=value});assert.equal(code,fixture.code);assert.equal(JSON.parse(output).status,fixture.status);}
});

test('tracked environment template has blank credential placeholders and no actual token',async()=>{
  const template=await readFile(new URL('../.env.example',import.meta.url),'utf8');
  for(const key of ['CONTEXTQA_API_TOKEN','OPENAI_API_KEY','ANTHROPIC_API_KEY','AI_API_KEY','GITHUB_TOKEN','LINEAR_API_KEY','JIRA_EMAIL','JIRA_API_TOKEN','TESTRAIL_EMAIL','TESTRAIL_API_KEY','XRAY_BEARER_TOKEN'])assert.match(template,new RegExp('^'+key+'=$','m'));
  assert.ok(!/token_[\w-]+\.[\w-]+/.test(template));
});
