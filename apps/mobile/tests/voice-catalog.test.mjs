import test from 'node:test';
import assert from 'node:assert/strict';
import {VoiceCatalog} from '../audio/voiceCatalog.ts';
const voice = id => ({identifier:id,language:'en-US'});
const deferred = () => {let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
test('newest voice lookup wins even if the initial lookup finishes last',async()=>{
 const first=deferred(),second=deferred();let calls=0;
 const catalog=new VoiceCatalog(()=> ++calls===1?first.promise:second.promise);
 catalog.activate();
 const a=catalog.refresh(),b=catalog.refresh();
 second.resolve([voice('new')]);await b;
 first.resolve([voice('old')]);await a;
 assert.deepEqual(catalog.snapshot(),{voices:[voice('new')],loading:false,error:''});
});
test('stale failure cannot erase voices from a newer successful refresh',async()=>{
 const first=deferred();let calls=0;
 const catalog=new VoiceCatalog(()=>++calls===1?first.promise:Promise.resolve([voice('new')]));
 catalog.activate();const a=catalog.refresh();await catalog.refresh();
 first.reject(new Error('stale'));await a;
 assert.equal(catalog.snapshot().voices[0].identifier,'new');
 assert.equal(catalog.snapshot().error,'');
});
test('unmount suppresses updates and effect reactivation cannot revive old results',async()=>{
 const first=deferred(),second=deferred();let calls=0,notifications=0;
 const catalog=new VoiceCatalog(()=>++calls===1?first.promise:second.promise);
 const unsubscribe=catalog.subscribe(()=>notifications++);
 catalog.activate();const a=catalog.refresh();catalog.dispose();
 first.resolve([voice('late')]);await a;
 assert.equal(notifications,1);
 catalog.activate();const b=catalog.refresh();second.resolve([voice('current')]);await b;
 assert.equal(catalog.snapshot().voices[0].identifier,'current');
 unsubscribe();catalog.dispose();await catalog.refresh();assert.equal(calls,2);
});
test('current lookup failure clears stale voices and supports retry',async()=>{
 let fail=false;
 const catalog=new VoiceCatalog(async()=>{if(fail)throw new Error('unavailable');return [voice('installed')];});
 catalog.activate();await catalog.refresh();fail=true;await catalog.refresh();
 assert.deepEqual(catalog.snapshot().voices,[]);
 assert.equal(catalog.snapshot().loading,false);assert.match(catalog.snapshot().error,/text chat/);
 fail=false;await catalog.refresh();assert.equal(catalog.snapshot().error,'');
});
