import test from 'node:test';
import assert from 'node:assert/strict';
import {providerJson,MAX_PROVIDER_BYTES} from '../provider-response.mjs';
const signal=()=>new AbortController().signal;
test('streamed provider JSON assembles split UTF-8 correctly',async()=>{
 const bytes=new TextEncoder().encode(JSON.stringify({text:'வணக்கம் 😀'}));
 const body=new ReadableStream({start(c){c.enqueue(bytes.slice(0,12));c.enqueue(bytes.slice(12));c.close();}});
 assert.deepEqual(await providerJson(new Response(body),signal()),{text:'வணக்கம் 😀'});
});
test('declared and streamed oversized provider bodies are cancelled',async()=>{
 let cancelled=0;
 const make=()=>new ReadableStream({start(c){c.enqueue(new Uint8Array(MAX_PROVIDER_BYTES+1));},cancel(){cancelled++;}});
 await assert.rejects(providerJson(new Response(make(),{headers:{'content-length':String(MAX_PROVIDER_BYTES+1)}}),signal()),/too large/);
 await assert.rejects(providerJson(new Response(make()),signal()),/too large/);
 assert.equal(cancelled,2);
});
test('cancellation while reading interrupts delivery and releases the stream',async()=>{
 const controller=new AbortController();let entered,cancelled=false;
 const reading=new Promise(resolve=>{entered=resolve;});
 const body=new ReadableStream({pull(){entered();},cancel(){cancelled=true;}});
 const request=providerJson(new Response(body),controller.signal);
 await reading;controller.abort();
 await assert.rejects(request,/interrupted/);assert.equal(cancelled,true);
});
test('late injected JSON and null provider data are handled without leaking contents',async()=>{
 const controller=new AbortController();
 await assert.rejects(providerJson({ok:true,json:async()=>{controller.abort();return {secret:'private'};}},controller.signal),/interrupted/);
 await assert.rejects(providerJson(new Response('private provider detail',{status:500}),signal()),/^Error: Provider request failed$/);
 await assert.rejects(providerJson({ok:true,json:async()=>({text:'x'.repeat(MAX_PROVIDER_BYTES)})},signal()),/too large/);
 assert.equal(await providerJson(new Response('null'),signal()),null);
});
test('already-cancelled requests dispose provider bodies without reading them',async()=>{
 let cancelled=false;
 const response=new Response(new ReadableStream({cancel(){cancelled=true;}}));
 const controller=new AbortController();controller.abort();
 await assert.rejects(providerJson(response,controller.signal),/interrupted/);
 assert.equal(cancelled,true);
});
