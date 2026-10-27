// Bound response memory while streaming; abort at the first excessive chunk.
export async function boundedJSON(response, limit=1_000_000) {
  const declared=Number(response.headers.get('content-length'));
  if(Number.isFinite(declared) && declared>limit) { await response.body?.cancel(); throw new Error('Response too large'); }
  const reader=response.body?.getReader();
  if(!reader) throw new Error('Missing response body');
  const chunks=[];let size=0;
  try {
    for(;;) {
      const {done,value}=await reader.read();if(done) break;
      size+=value.byteLength;
      if(size>limit) {await reader.cancel();throw new Error('Response too large');}
      chunks.push(Buffer.from(value));
    }
  } finally {reader.releaseLock();}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
