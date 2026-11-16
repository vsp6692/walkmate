import test from "node:test";
import assert from "node:assert/strict";
import { RecordingSession } from "../audio/recordingSession.ts";
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
function setup(overrides = {}) {
  const calls = [];
  const session = new RecordingSession({
    prepare: async () => {
      calls.push("prepare");
    },
    record: () => calls.push("record"),
    stop: async () => {
      calls.push("stop");
      return "cache:clip";
    },
    remove: async (path) => calls.push("remove:" + path),
    restore: async () => calls.push("restore"),
    transcribe: async () => "hello",
    deliver: (text) => calls.push("deliver:" + text),
    ...overrides,
  });
  return { session, calls };
}
test("cancel while prepare is pending stops after prepare, never records", async () => {
  const wait = deferred();
  const { session, calls } = setup({ prepare: () => wait.promise });
  const start = session.start();
  await Promise.resolve();
  const cancel = session.cancel();
  wait.resolve();
  await Promise.all([start, cancel]);
  assert.ok(!calls.includes("record"));
  assert.ok(calls.includes("remove:cache:clip"));
  assert.equal(session.snapshot().phase, "idle");
});
test("double start/stop cannot duplicate native recording", async () => {
  const { session, calls } = setup();
  await Promise.all([session.start(), session.start()]);
  assert.equal(calls.filter((x) => x === "record").length, 1);
  await Promise.all([session.stop(), session.stop()]);
  assert.equal(session.snapshot().phase, "ready");
  assert.equal(calls.filter((x) => x === "stop").length, 1);
  await session.dispose();
});
test("cancelled upload never delivers late transcript and cleans temporary file", async () => {
  const wait = deferred();
  const { session, calls } = setup({ transcribe: () => wait.promise });
  await session.start();
  await session.stop();
  const upload = session.upload();
  await Promise.resolve();
  const cancel = session.cancel();
  wait.resolve("late");
  await Promise.all([upload, cancel]);
  assert.ok(!calls.includes("deliver:late"));
  assert.ok(calls.includes("remove:cache:clip"));
});
test("dispose during preparation prevents recording and new starts", async () => {
  const wait = deferred();
  const { session, calls } = setup({ prepare: () => wait.promise });
  const start = session.start();
  await Promise.resolve();
  const dispose = session.dispose();
  wait.resolve();
  await Promise.all([start, dispose]);
  await session.start();
  assert.ok(!calls.includes("record"));
});
test("successful upload delivers once and returns idle after cleanup", async () => {
  const { session, calls } = setup();
  await session.start();
  await session.stop();
  await session.upload();
  assert.equal(calls.filter((x) => x === "deliver:hello").length, 1);
  assert.equal(session.snapshot().phase, "idle");
  assert.ok(calls.includes("remove:cache:clip"));
});
test("effect replay can reactivate controller after cleanup completes", async () => {
  const { session, calls } = setup();
  await session.dispose();
  session.activate();
  await session.start();
  assert.ok(calls.includes("record"));
  await session.dispose();
});
test("failed recording deletion blocks a new recording until cleanup retry succeeds", async () => {
  let fail = true;
  const { session, calls } = setup({
    remove: async () => {
      if (fail) throw new Error("disk");
    },
  });
  await session.start();
  await session.stop();
  await session.cancel();
  assert.equal(session.snapshot().phase, "error");
  await session.start();
  assert.equal(calls.filter((x) => x === "record").length, 1);
  fail = false;
  await session.cancel();
  assert.equal(session.snapshot().phase, "idle");
  await session.dispose();
});
