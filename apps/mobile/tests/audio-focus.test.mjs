import test from "node:test";
import assert from "node:assert/strict";
import { AudioFocus } from "../audio/focus.ts";
test("microphone ownership suppresses speech and ignores another owner release", async () => {
  const focus = new AudioFocus(),
    owner = Symbol();
  focus.acquire(owner);
  let played = false;
  assert.equal(
    await focus.speak(
      async () => {},
      () => (played = true),
    ),
    false,
  );
  focus.release(Symbol());
  assert.equal(focus.recording(), true);
  focus.release(owner);
  assert.equal(focus.recording(), false);
  assert.equal(played, false);
});
test("recording claimed while speech is stopping prevents late playback", async () => {
  const focus = new AudioFocus();
  let resolve,
    played = false;
  const promise = focus.speak(
    () => new Promise((r) => (resolve = r)),
    () => (played = true),
  );
  focus.acquire(Symbol());
  resolve();
  assert.equal(await promise, false);
  assert.equal(played, false);
});
test("interrupt invalidates pending speech and newest request wins", async () => {
  const focus = new AudioFocus();
  let resolve;
  const old = focus.speak(
    () => new Promise((r) => (resolve = r)),
    () => assert.fail("stale speech"),
  );
  focus.interrupt();
  let played = false;
  assert.equal(
    await focus.speak(
      async () => {},
      () => (played = true),
    ),
    true,
  );
  resolve();
  assert.equal(await old, false);
  assert.equal(played, true);
});
