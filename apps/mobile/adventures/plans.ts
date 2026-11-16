export const durations = [0, 15, 20, 30, 45, 60] as const;
export type WalkDuration = (typeof durations)[number];
export const story = {
  title: "The Lantern Post",
  description:
    "An original, fictional mystery in four little chapters. Unfolds over 15 minutes of active session time.",
  chapters: [
    {
      at: 0,
      title: "A letter without an address",
      text: "In our imaginary seaside town, a lantern glows at the end of an empty lane. Beneath it waits a letter addressed to whoever has time to wonder. Inside, someone has written: “The lighthouse has forgotten its own name.” What name would you give a lighthouse?",
    },
    {
      at: 300,
      title: "The keeper of small things",
      text: "Five minutes into our fictional adventure, the letter leads to a clockmaker who collects sounds: rain on roofs, a kettle singing, a friend laughing. “The lighthouse never had a name,” she says. “It had a promise.” On her table sits a tiny brass boat, warm as sunlight.",
    },
    {
      at: 600,
      title: "A boat full of stars",
      text: "The imaginary brass boat opens like a music box. Inside is a map drawn with stars, and a note: “I will leave a light on for anyone finding their way.” The clockmaker smiles. The mystery was never about remembering a word. It was about remembering why the light mattered.",
    },
    {
      at: 900,
      title: "A light to take with you",
      text: "Our fictional lighthouse shines again. Nobody needs to stay to keep it burning; its light belongs to everyone who passes. You leave the letter beneath the lantern for the next curious traveler. The story ends here, but you can take a little of its warmth into the rest of your day.",
    },
  ],
};
export function currentChapter(seconds: number) {
  const elapsed = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  let index = 0;
  for (let i = 1; i < story.chapters.length; i++)
    if (elapsed >= story.chapters[i].at) index = i;
  return index;
}
export function walkProgress(seconds: number, minutes: WalkDuration) {
  const elapsed = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const target = minutes * 60;
  return {
    complete: target > 0 && elapsed >= target,
    remaining: target > 0 ? Math.max(0, target - elapsed) : null,
    fraction: target > 0 ? Math.min(1, elapsed / target) : 0,
  };
}
