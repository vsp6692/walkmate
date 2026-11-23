/** Applying a reviewed transcript never replaces or silently truncates typed text. */
export function appendTranscript(draft: string, transcript: string): string {
  const text = transcript.trim();
  if (!text) return draft;
  const combined = draft.trim() ? `${draft.trimEnd()}\n${text}` : text;
  if (combined.length > 4000)
    throw new Error("Your draft and transcript together exceed 4,000 characters. Shorten the draft before adding the transcript.");
  return combined;
}
