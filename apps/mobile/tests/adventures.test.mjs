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

import {walkMilestones, milestoneMessage} from '../adventures/milestones.ts';
test('milestones unlock at measured thresholds, independently for time and distance',()=>{
 assert.equal(walkMilestones(299,499).time.latest,null);
 assert.equal(walkMilestones(299,499).distance.latest,null);
 const reached=walkMilestones(300,500);
 assert.equal(reached.time.latest.id,'time-5');
 assert.equal(reached.distance.latest.id,'distance-500');
 assert.equal(walkMilestones(1200,0).time.latest.id,'time-20');
 assert.equal(walkMilestones(1200,0).distance.latest,null);
 assert.equal(walkMilestones(0,2000).time.latest,null);
 assert.equal(walkMilestones(0,2000).distance.latest.id,'distance-2000');
});
test('invalid counters cannot earn milestones or fabricate progress',()=>{
 for(const invalid of [-1,NaN,Infinity]) {
  const value=walkMilestones(invalid,invalid);
  assert.deepEqual(value.time.earned,[]);
  assert.deepEqual(value.distance.earned,[]);
 }
 const done=walkMilestones(7200,10000);
 assert.equal(done.time.next,null);
 assert.equal(done.distance.next,null);
 assert.equal(done.time.earned.length,7);
 assert.equal(done.distance.earned.length,4);
});
test('milestone dialogue is optional encouragement, without fabricated navigation',()=>{
 assert.match(milestoneMessage('arjun','time'),/finish whenever/);
 assert.match(milestoneMessage('arjun','distance'),/no need to chase/);
 assert.notEqual(milestoneMessage('maya','time'),milestoneMessage('arjun','time'));
});

test('scripted milestone encouragement respects the no-question preference',()=>{
 for(const companion of ['maya','arjun']) for(const kind of ['time','distance'])
   assert.doesNotMatch(milestoneMessage(companion,kind,false),/\?/);
 assert.match(milestoneMessage('maya','time',true),/\?/);
});
