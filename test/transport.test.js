import test from 'node:test';
import assert from 'node:assert/strict';
import {boundedJSON} from '../src/transport.js';
test('response memory is bounded even without content length',async()=>{
  let cancelled=false;
  const response=new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('xxxxxxxxxx'));},cancel(){cancelled=true;}}));
  await assert.rejects(boundedJSON(response,5),/too large/);assert.equal(cancelled,true);
});
test('bounded JSON accepts ordinary responses and rejects announced excess',async()=>{
  assert.deepEqual(await boundedJSON(new Response('{"ok":true}')),{ok:true});
  await assert.rejects(boundedJSON(new Response('{}',{headers:{'content-length':'100'}}),5),/too large/);
});
