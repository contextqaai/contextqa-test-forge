import test from 'node:test';
import assert from 'node:assert/strict';
import {draft, configuration} from '../src/ai.js';
const env = {AI_PROVIDER:'openai',AI_MODEL:'operator-selected-model',OPENAI_API_KEY:'fake-test-only'};
test('data sharing is opt in and unknown/custom hosts are blocked',async()=>{
  await assert.rejects(draft({input:'data',purpose:'draft',env}),/approval/);
  assert.throws(()=>configuration({...env,AI_BASE_URL:'https://other.example/v1/'}),/official/);
  assert.throws(()=>configuration({...env,AI_PROVIDER:'openai-compatible',AI_BASE_URL:'https://other.example/v1/'}),/matching/);
});
for (const provider of ['openai','anthropic','openai-compatible']) test(`uses ${provider} wire format and preserves reported usage`,async()=>{
  let request;
  const localEnv = {...env,AI_PROVIDER:provider,AI_API_KEY:'fake-test-only',...(provider==='openai-compatible'?{AI_BASE_URL:'https://provider.example/v1/',AI_ALLOW_CUSTOM_HOST:'provider.example'}:{})};
  const wire = provider==='openai' ? {output:[{content:[{type:'output_text',text:'draft'}]}],usage:{input_tokens:12,output_tokens:3,input_tokens_details:{cached_tokens:2}}} : provider==='anthropic' ? {content:[{type:'text',text:'draft'}],usage:{input_tokens:12,output_tokens:3,cache_read_input_tokens:2}} : {choices:[{message:{content:'draft'}}],usage:{prompt_tokens:12,completion_tokens:3}};
  const result = await draft({input:'reviewed data',purpose:'test',approved:true,env:localEnv,transport:async(url, options)=>{request={url,options,body:JSON.parse(options.body)};return new Response(JSON.stringify(wire));}});
  assert.equal(result.draft,'draft'); assert.equal(result.metrics.inputTokens,12); assert.equal(result.metrics.outputTokens,3);
  assert.equal(request.options.redirect,'error'); assert.equal(result.executed,false);
  if(provider==='openai') assert.equal(request.body.store,false);
  if(provider==='anthropic') assert.equal(request.options.headers['x-api-key'],'fake-test-only');
  assert.ok(!JSON.stringify(result).includes('fake-test-only'));
});
test('failures do not echo provider body, secrets or source',async()=>{
  await assert.rejects(draft({input:'private source',purpose:'test',approved:true,env,transport:async()=>new Response('fake-test-only private source',{status:401})}),/^Error: AI request failed \(HTTP 401\)/);
});
test('absent usage remains unknown',async()=>{
  const result=await draft({input:'data',purpose:'test',approved:true,env,transport:async()=>new Response(JSON.stringify({output:[{content:[{type:'output_text',text:'draft'}]}]}))});
  assert.equal(result.metrics.inputTokens,null); assert.equal(result.metrics.usageSource,'provider-incomplete');
});
test('missing key/model, non-HTTPS and unsafe credential header fail before transport',()=>{
  assert.throws(()=>configuration({...env,AI_MODEL:''}),/required/);
  assert.throws(()=>configuration({...env,OPENAI_API_KEY:''}),/required/);
  assert.throws(()=>configuration({...env,OPENAI_API_KEY:'bad\nheader'}),/required/);
  assert.throws(()=>configuration({...env,AI_BASE_URL:'http://api.openai.com/v1/'}),/HTTPS/);
});
test('oversized source, network timeout, invalid JSON and empty response never become drafts',async()=>{
  await assert.rejects(draft({input:'x'.repeat(128001),purpose:'test',approved:true,env}),/128000/);
  for(const transport of [async()=>{throw new DOMException('private','TimeoutError');},async()=>new Response('invalid private'),async()=>new Response('{}')]) {
    await assert.rejects(draft({input:'data',purpose:'test',approved:true,env,transport}));
  }
});
