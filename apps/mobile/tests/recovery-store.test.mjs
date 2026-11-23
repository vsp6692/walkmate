import test from 'node:test';
import assert from 'node:assert/strict';
import {RecoveryStore} from '../session/recoveryStore.ts';
const point={version:1,savedAt:'2026-11-16T00:00:00Z',companion:0,activity:0,seconds:60,meters:70};
function disk(initial=null){let raw=initial;return {getItem:async()=>raw,setItem:async(_,v)=>{raw=v;},removeItem:async()=>{raw=null;},raw:()=>raw};}
test('unreadable recovery is reported and explicit erase can clear it',async()=>{
 const storage=disk('broken'),store=new RecoveryStore(storage);
 await assert.rejects(store.load(),/unreadable/);assert.equal(storage.raw(),'broken');
 await store.erase();assert.equal(await store.load(),null);
});
test('restore fails if deletion fails and leaves the recovery available to retry',async()=>{
 const storage=disk(JSON.stringify(point)),remove=storage.removeItem;
 storage.removeItem=async()=>{throw new Error('storage unavailable');};
 const store=new RecoveryStore(storage);
 await assert.rejects(store.consume(),/storage unavailable/);
 assert.deepEqual(await store.load(),point);
 storage.removeItem=remove;assert.deepEqual(await store.consume(),point);
 assert.equal(storage.raw(),null);await assert.rejects(store.consume(),/No recovery/);
});
test('queued save and restore use the latest whitelisted snapshot once',async()=>{
 const storage=disk(),store=new RecoveryStore(storage);
 const save=store.save({...point,seconds:120,coordinates:[1,2],transcript:'private'});
 const consume=store.consume();await save;
 const restored=await consume;assert.equal(restored.seconds,120);
 assert.equal(restored.coordinates,undefined);assert.equal(restored.transcript,undefined);
 assert.equal(storage.raw(),null);
});
