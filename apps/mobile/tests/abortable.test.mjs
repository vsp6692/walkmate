import test from 'node:test';
import assert from 'node:assert/strict';
import {abortable} from '../conversation/abortable.ts';
import {ConversationClient} from '../conversation/client.ts';
import {serverHealth} from '../conversation/endpoint.ts';
import {requestTranscription} from '../audio/transcription.ts';
const pending=()=>new Promise(()=>{});
test('cancelled operations reject immediately even if transport never settles',async()=>{
 const controller=new AbortController();
 const operation=abortable(pending,controller.signal,'Cancelled');controller.abort();
 await assert.rejects(operation,/Cancelled/);
 let calls=0;await assert.rejects(abortable(async()=>{calls++;},controller.signal,'Cancelled'));
 assert.equal(calls,0);
});
test('conversation cancellation releases a stalled fetch and permits the next reply',async()=>{
 const client=new ConversationClient(), messages=[{role:'user',content:'Hi'}];
 const first=client.reply('http://local','maya','English',messages,pending);client.cancel();
 await assert.rejects(first,/interrupted/);
 assert.equal(await client.reply('http://local','maya','English',messages,async()=>({ok:true,json:async()=>({reply:'Hello'})})),'Hello');
});
test('health JSON and transcription transport cannot hold cancellation open',async()=>{
 const controller=new AbortController();
 const health=serverHealth('http://local',controller.signal,async()=>({ok:true,json:pending}));
 const transcript=requestTranscription('http://local',new Uint8Array([1]),'audio/mp4','en',controller.signal,pending);
 await new Promise(resolve=>setImmediate(resolve));controller.abort();
 await assert.rejects(health,/cancelled/);await assert.rejects(transcript,/cancelled/);
});
test('late rejection after cancellation is consumed, and synchronous errors still propagate',async()=>{
 const controller=new AbortController();let fail;
 const operation=abortable(()=>new Promise((_,reject)=>{fail=reject;}),controller.signal,'Cancelled');
 controller.abort();await assert.rejects(operation,/Cancelled/);fail(new Error('late failure'));
 await new Promise(resolve=>setImmediate(resolve));
 await assert.rejects(abortable(()=>{throw new Error('sync');},new AbortController().signal,'Cancelled'),/sync/);
});

import {checkSpeechStatus} from '../audio/speechStatus.ts';
test('microphone setup health fetch can be cancelled without waiting for transport',async()=>{
 const controller=new AbortController();
 const request=checkSpeechStatus('http://local','English',controller.signal,pending);
 controller.abort();await assert.rejects(request,/cancelled/);
});
test('late microphone capability JSON cannot proceed after cancellation',async()=>{
 const controller=new AbortController();let release;
 const request=checkSpeechStatus('http://local','English',controller.signal,async()=>({ok:true,json:()=>new Promise(resolve=>{release=resolve;})}));
 await new Promise(resolve=>setImmediate(resolve));controller.abort();
 await assert.rejects(request,/cancelled/);
 release({transcription:true,acceptedLanguageHints:['en']});
 assert.equal(await checkSpeechStatus('http://local','English',new AbortController().signal,async()=>({ok:true,json:async()=>({transcription:true,acceptedLanguageHints:['en']})})),'en');
});
