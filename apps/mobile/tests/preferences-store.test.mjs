import test from 'node:test';
import assert from 'node:assert/strict';
import {PreferenceStore,appPreferences} from '../preferences/store.ts';
test('persisted preferences whitelist and normalize fields without storing location or chat',()=>{
 const result=appPreferences({selected:1,activity:99,language:'Hindi',place:'unknown',duration:999,conversation:{questions:false},coordinates:[1,2],transcript:'private'});
 assert.equal(result.selected,1);assert.equal(result.activity,0);assert.equal(result.language,'English');
 assert.equal(result.duration,0);assert.equal(result.conversation.questions,false);
 assert.equal(result.coordinates,undefined);assert.equal(result.transcript,undefined);
});
test('unreadable preferences reject without writes and a later load can retry',async()=>{
 let raw='broken',writes=0;
 const store=new PreferenceStore({getItem:async()=>raw,setItem:async()=>{writes++;}});
 await assert.rejects(store.load());assert.equal(writes,0);
 raw=JSON.stringify({selected:1});assert.equal((await store.load()).selected,1);
 for (const bad of ['null','[]','42']) {raw=bad;await assert.rejects(store.load());}
});
test('reset waits behind an in-flight write and leaves defaults last',async()=>{
 let raw=null,release,started,calls=0;
 const entered=new Promise(resolve=>{started=resolve;});
 const store=new PreferenceStore({getItem:async()=>raw,setItem:async(_,value)=>{
  if(++calls===1){started();await new Promise(resolve=>{release=resolve;});} raw=value;
 }});
 const save=store.save({selected:1});await entered;const reset=store.reset();release();
 await Promise.all([save,reset]);assert.deepEqual(JSON.parse(raw),appPreferences(null));
});
test('failed writes do not block later preference changes',async()=>{
 let fail=true,raw=null;
 const store=new PreferenceStore({getItem:async()=>raw,setItem:async(_,value)=>{if(fail)throw new Error('full');raw=value;}});
 await assert.rejects(store.save({selected:1}));fail=false;
 await store.save({selected:1,place:'Seaside'});assert.equal((await store.load()).place,'Seaside');
});
