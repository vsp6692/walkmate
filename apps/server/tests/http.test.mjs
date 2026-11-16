import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../http.mjs';
import {validateAudio,transcribe} from '../transcription.mjs';
async function serving(config,fn,fetcher){const server=createServer(config,fetcher);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));try{await fn(`http://127.0.0.1:${server.address().port}`);}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}}
test('unconfigured server reports honest health and rejects transcription',async()=>{
 await serving({},async url=>{const health=await(await fetch(url+'/health')).json();assert.equal(health.transcription,false);assert.equal(health.configured,false);assert.equal((await fetch(url+'/transcribe?language=en',{method:'POST',headers:{'Content-Type':'audio/mp4'},body:new Uint8Array([1,2])})).status,503);assert.equal((await fetch(url+'/health',{headers:{Origin:'https://untrusted.example'}})).status,403);});
});
test('audio validation rejects unsupported types, languages and oversized uploads',()=>{assert.throws(()=>validateAudio(new Uint8Array(0),'audio/mp4','en'));assert.throws(()=>validateAudio(new Uint8Array(1),'text/plain','en'));assert.throws(()=>validateAudio(new Uint8Array(1),'audio/mp4','xx'));assert.throws(()=>validateAudio(new Uint8Array(8388609),'audio/mp4','en'));assert.equal(validateAudio(new Uint8Array(1),'audio/webm;codecs=opus','ta'),'audio/webm');});
test('Whisper-compatible adapter forwards multipart audio without GPS or prompts',async()=>{const result=await transcribe(new Uint8Array([1,2]),'audio/mp4','en',{baseUrl:'http://local/v1',model:'whisper'},new AbortController().signal,async(url,options)=>{assert.equal(url,'http://local/v1/audio/transcriptions');assert.deepEqual([...options.body.keys()],['file','model','language','response_format']);return {ok:true,json:async()=>({text:' hello '})};});assert.equal(result,'hello');});
test('HTTP transcription roundtrip and malformed JSON handled',async()=>{
 await serving({speech:{baseUrl:'http://provider/v1',model:'whisper'}},async url=>{const res=await fetch(url+'/transcribe?language=en',{method:'POST',headers:{'Content-Type':'audio/webm'},body:new Uint8Array([1])});assert.deepEqual(await res.json(),{text:'A test transcript'});assert.equal((await fetch(url+'/conversation',{method:'POST',body:'invalid'})).status,400);},async()=>({ok:true,json:async()=>({text:'A test transcript'})}));
});
