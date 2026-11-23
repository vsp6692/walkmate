import test from "node:test";
import assert from "node:assert/strict";
import { SessionClock } from "../session/clock.ts";
import { segmentMeters, validFix } from "../session/location.ts";
test("20-minute session excludes pauses and duplicate pause/resume calls", () => {
  const c = new SessionClock();
  c.start(0);
  c.pause(600000);
  c.pause(700000);
  c.resume(900000);
  c.resume(950000);
  assert.equal(c.finish(1500000), 1200000);
  c.resume(1600000);
  assert.equal(c.read(2000000), 1200000);
});
test("clock never counts a negative interval", () => {
  const c = new SessionClock();
  c.start(100);
  assert.equal(c.read(50), 0);
});
const fix = (time, longitude, accuracy = 5) => ({
  timestamp: time,
  coords: { latitude: 0, longitude, accuracy },
});
test("GPS counts plausible movement and rejects gaps, stale fixes and teleports", () => {
  assert.ok(
    Math.abs(segmentMeters(fix(0, 0), fix(10000, 0.0001)) - 11.119) < 0.01,
  );
  assert.equal(segmentMeters(fix(0, 0), fix(31000, 0.0001)), 0);
  assert.equal(segmentMeters(fix(10000, 0), fix(10000, 0.0001)), 0);
  assert.equal(segmentMeters(fix(0, 0), fix(10000, 1)), 0);
});
test("GPS rejects missing, nonfinite and inaccurate coordinates", () => {
  assert.equal(validFix(fix(0, NaN)), false);
  assert.equal(validFix(fix(0, 181)), false);
  assert.equal(validFix(fix(0, 0, null)), false);
  assert.equal(validFix(fix(0, 0, 50)), false);
});
import { cleanSummary, readHistory } from "../session/history.ts";
test("saved summaries strip location and conversation data", () => {
  const v = {
    id: "1",
    finishedAt: "2026-11-16T00:00:00Z",
    companion: "Maya",
    activity: "Walk",
    seconds: 1200,
    meters: 1500,
    coordinates: [1, 2],
    transcript: "private",
  };
  assert.deepEqual(Object.keys(cleanSummary(v)).sort(), [
    "activity",
    "companion",
    "finishedAt",
    "id",
    "meters",
    "seconds",
  ]);
  assert.equal(readHistory("corrupt").length, 0);
  assert.equal(readHistory("{}").length, 0);
  assert.equal(cleanSummary({ ...v, meters: NaN }), null);
  assert.equal(readHistory(JSON.stringify(Array(80).fill(v))).length, 50);
});
import { evaluateFix } from "../session/location.ts";
test("cached and out-of-order GPS never poison accepted location anchor", () => {
  const anchor = fix(100000, 0);
  assert.equal(evaluateFix(anchor, fix(90000, 0.0001), 100000).accepted, false);
  assert.equal(evaluateFix(null, fix(1000, 0), 20000).accepted, false);
  assert.equal(evaluateFix(null, fix(30000, 0), 20000).accepted, false);
  const rejected = evaluateFix(anchor, fix(110000, 1), 110000);
  assert.equal(rejected.accepted, false);
  assert.equal(rejected.anchor, anchor);
  assert.ok(
    evaluateFix(rejected.anchor, fix(120000, 0.0001), 120000).meters > 10,
  );
});

import { WatchOwner } from "../session/watch.ts";
test("stop releases a late native watcher and invalidates its callbacks", async () => {
  const owner = new WatchOwner();
  let resolve, current, removed = 0;
  const setup = owner.start(check => {
    current = check;
    return new Promise(done => {resolve = done;});
  }, () => assert.fail("unexpected error"));
  owner.stop();
  assert.equal(current(), false);
  resolve({remove: () => removed++});
  await setup;
  assert.equal(removed, 1);
  owner.stop();
  assert.equal(removed, 1);
});
test("resume keeps only the newest watcher even if old setup finishes last", async () => {
  const owner = new WatchOwner();
  let resolve, oldRemoved = 0, newRemoved = 0;
  const first = owner.start(() => new Promise(done => {resolve = done;}), () => assert.fail());
  await owner.start(async () => ({remove: () => newRemoved++}), () => assert.fail());
  resolve({remove: () => oldRemoved++});
  await first;
  assert.equal(oldRemoved, 1);
  assert.equal(newRemoved, 0);
  owner.stop();
  owner.stop();
  assert.equal(newRemoved, 1);
});
test("stale permission failures do not overwrite current GPS status", async () => {
  const owner = new WatchOwner();
  let reject, errors = 0;
  const first = owner.start(() => new Promise((_, fail) => {reject = fail;}), () => errors++);
  owner.stop();
  reject(new Error("old request"));
  await first;
  assert.equal(errors, 0);
  await owner.start(async () => {throw new Error("current request");}, () => errors++);
  assert.equal(errors, 1);
});

import { recoveryPoint, readRecovery } from "../session/recovery.ts";
test("recovery saves counters only, excluding destination, GPS, chat and audio", () => {
  const candidate = {version:1, savedAt:"2026-11-16T05:00:00Z", companion:0, activity:0, seconds:600.9, meters:700, coordinates:[1,2], transcript:"private", audio:"private", destination:"home"};
  assert.deepEqual(recoveryPoint(candidate), {version:1, savedAt:candidate.savedAt, companion:0, activity:0, seconds:600, meters:700});
  for (const raw of ["corrupt", "null", JSON.stringify({...candidate, meters:-1}), JSON.stringify({...candidate, version:2}), JSON.stringify({...candidate, companion:99})]) assert.equal(readRecovery(raw), null);
});
test("recovery starts paused, excludes closed-app time and counts only resumed time", () => {
  const clock = new SessionClock();
  clock.restorePaused(600000);
  assert.equal(clock.read(9000000),600000);
  clock.resume(9000000);
  assert.equal(clock.finish(9600000),1200000);
  assert.throws(() => clock.restorePaused(NaN));
  assert.throws(() => clock.restorePaused(-1));
});

test('GPS setup timeout invalidates callbacks and releases a late native subscription',async()=>{
 const owner=new WatchOwner();let resolve,current,removed=0,errors=0,timeout;
 const expired=new Promise(done=>{timeout=done;});
 const setup=owner.start(check=>{current=check;return new Promise(done=>{resolve=done;});},()=>{errors++;timeout();},5);
 await expired;
 assert.equal(current(),false);assert.equal(errors,1);
 resolve({remove:()=>removed++});await setup;
 assert.equal(removed,1);assert.equal(errors,1);
});
test('GPS can retry after timeout without a stale failure affecting the new watcher',async()=>{
 const owner=new WatchOwner();let reject,timeout,errors=0,removed=0;
 const expired=new Promise(done=>{timeout=done;});
 const first=owner.start(()=>new Promise((_,fail)=>{reject=fail;}),()=>{errors++;timeout();},5);
 await expired;
 await owner.start(async()=>({remove:()=>removed++}),()=>errors++);
 reject(new Error('old native failure'));await first;
 assert.equal(errors,1);assert.equal(removed,0);
 owner.stop();assert.equal(removed,1);
});

import {SessionTransition} from '../session/transition.ts';
test('pending recovery owns the session and blocks new starts and duplicate restores',()=>{
 const transition=new SessionTransition();
 assert.equal(transition.beginRestore(),true);
 assert.equal(transition.start(),false);
 assert.equal(transition.beginRestore(),false);
 transition.completeRestore();transition.cancelRestore();
 assert.equal(transition.snapshot(),'active');
 assert.equal(transition.start(),false);
 transition.finish();assert.equal(transition.start(),true);
});
test('failed restore releases ownership while active sessions cannot be overwritten',()=>{
 const transition=new SessionTransition();let updates=0;
 const unsubscribe=transition.subscribe(()=>updates++);
 transition.beginRestore();transition.cancelRestore();
 assert.equal(transition.start(),true);
 assert.equal(transition.beginRestore(),false);
 transition.cancelRestore();assert.equal(transition.snapshot(),'active');
 assert.equal(updates,3);unsubscribe();transition.finish();assert.equal(updates,3);
});
