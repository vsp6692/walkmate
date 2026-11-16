import test from "node:test";
import assert from "node:assert/strict";
import { currentChapter, walkProgress, story } from "../adventures/plans.ts";
test("chapters unlock at exact active-time milestones", () => {
  assert.equal(currentChapter(0), 0);
  assert.equal(currentChapter(299), 0);
  assert.equal(currentChapter(300), 1);
  assert.equal(currentChapter(600), 2);
  assert.equal(currentChapter(900), 3);
  assert.equal(currentChapter(100000), 3);
  assert.equal(currentChapter(NaN), 0);
});
test("free walks have no artificial completion; time goals clamp progress", () => {
  assert.deepEqual(walkProgress(1200, 0), {
    complete: false,
    remaining: null,
    fraction: 0,
  });
  assert.deepEqual(walkProgress(1200, 20), {
    complete: true,
    remaining: 0,
    fraction: 1,
  });
  assert.equal(walkProgress(600, 20).fraction, 0.5);
  assert.equal(walkProgress(1300, 20).fraction, 1);
  assert.equal(walkProgress(-100, 20).fraction, 0);
});
test("offline story has four ordered chapters and labels imaginary setting", () => {
  assert.equal(story.chapters.length, 4);
  assert.match(story.description, /fictional/);
  assert.deepEqual(
    story.chapters.map((c) => c.at),
    [0, 300, 600, 900],
  );
});
