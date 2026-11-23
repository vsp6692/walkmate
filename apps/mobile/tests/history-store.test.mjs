import test from 'node:test';
import assert from 'node:assert/strict';
import {HistoryStore} from '../session/historyStore.ts';
const entry = id => ({id, finishedAt:'2026-11-16T00:00:00Z', companion:'Maya', activity:'Walk', seconds:60, meters:70});
function storage(initial=null) {
 let raw=initial;
 return {getItem:async()=>raw, setItem:async(_,value)=>{raw=value;},removeItem:async()=>{raw=null;},raw:()=>raw};
}
test('saving re-reads persisted walks and strips unsolicited private fields', async()=>{
 const disk=storage(JSON.stringify([entry('old')])), store=new HistoryStore(disk);
 const result=await store.save({...entry('new'),coordinates:[1,2],transcript:'private'});
 assert.deepEqual(result.map(x=>x.id),['new','old']);
 assert.doesNotMatch(disk.raw(),/coordinates|transcript|private/);
});
test('failed or malformed reads never overwrite existing history; retry remains possible', async()=>{
 const disk=storage('corrupt'), store=new HistoryStore(disk);
 await assert.rejects(store.save(entry('new')),/left unchanged/);
 assert.equal(disk.raw(),'corrupt');
 await disk.setItem('',JSON.stringify([entry('old')]));
 const read=disk.getItem; disk.getItem=async()=>{throw new Error('storage unavailable');};
 await assert.rejects(store.save(entry('new')),/storage unavailable/);
 disk.getItem=read;
 assert.deepEqual((await store.load()).map(x=>x.id),['old']);
 assert.equal((await store.save(entry('new'))).length,2);
});
test('erase waits for a pending save, so late completion cannot resurrect history', async()=>{
 const disk=storage(); let release, started;
 const entered=new Promise(resolve=>{started=resolve;});
 const write=disk.setItem;
 disk.setItem=async(...args)=>{started(); await new Promise(resolve=>{release=resolve;}); await write(...args);};
 const store=new HistoryStore(disk);
 const save=store.save(entry('one'));
 await entered;
 const erase=store.erase();
 release(); await Promise.all([save,erase]);
 assert.equal(disk.raw(),null);
});
test('concurrent saves retain both walks and deduplicate repeated saves',async()=>{
 const store=new HistoryStore(storage());
 await Promise.all([store.save(entry('one')),store.save(entry('two')),store.save(entry('one'))]);
 assert.deepEqual((await store.load()).map(x=>x.id),['one','two']);
});
