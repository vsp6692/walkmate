export type Milestone = {
  id: string;
  kind: "time" | "distance";
  threshold: number;
  label: string;
};
const timeMilestones: Milestone[] = [5, 10, 15, 20, 30, 45, 60].map(minutes => ({
  id: `time-${minutes}`, kind: "time", threshold: minutes * 60, label: `${minutes} minutes of active session time`,
}));
const distanceMilestones: Milestone[] = [500, 1000, 2000, 5000].map(meters => ({
  id: `distance-${meters}`, kind: "distance", threshold: meters,
  label: `${meters < 1000 ? `${meters} m` : `${meters / 1000} km`} of GPS-estimated distance`,
}));
function progress(value: number, milestones: Milestone[]) {
  const safe = Number.isFinite(value) && value >= 0 ? value : 0;
  const earned = milestones.filter(item => safe >= item.threshold);
  const next = milestones.find(item => safe < item.threshold) ?? null;
  return { earned, latest: earned.at(-1) ?? null, next, remaining: next ? next.threshold - safe : null };
}
/** Only measured session counters; no route, speed, arrival or landmark inference. */
export function walkMilestones(seconds: number, meters: number) {
  return { time: progress(seconds, timeMilestones), distance: progress(meters, distanceMilestones) };
}
export function milestoneMessage(companion: string, kind: Milestone["kind"], questions = true) {
  if (companion === "arjun") return kind === "time"
    ? "You made room for a little movement. Keep a comfortable pace, or finish whenever you’re ready."
    : "A little distance adds up. There’s no need to chase the next marker.";
  return kind === "time"
    ? questions
      ? "A little pocket of time, just for you. Fancy another moment together, or shall we wrap up?"
      : "A little pocket of time, just for you. Finish whenever you’re ready."
    : "Another little stretch of your journey. I’m happy to keep you company at your pace.";
}
