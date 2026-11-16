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
