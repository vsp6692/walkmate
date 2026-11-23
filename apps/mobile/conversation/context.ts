export type Turn = { role: "user" | "assistant"; content: string };
// Leave room beneath the server's 90 KB request limit for metadata/preferences.
export const CONTEXT_BYTES = 76000;
export function utf8Bytes(value: string): number {
  let count = 0;
  for (const character of value) {
    const code = character.codePointAt(0)!;
    count += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return count;
}
/** Retain complete recent exchanges, ending with the current user's message. */
export function conversationContext(input: Turn[]): Turn[] {
  if (!input.length) throw new Error("Enter a message before sending.");
  const turns = input.map(({ role, content }) => {
    if (!["user", "assistant"].includes(role) || typeof content !== "string" ||
      !content.trim() || content.length > 4000) throw new Error("Conversation messages must contain 1–4,000 characters.");
    return { role, content };
  });
  if (turns.at(-1)?.role !== "user") throw new Error("The last message must be yours.");
  // A 19-message window accommodates nine complete exchanges plus this message.
  while (turns.length > 19 || utf8Bytes(JSON.stringify(turns)) > CONTEXT_BYTES) turns.shift();
  while (turns[0]?.role === "assistant") turns.shift();
  return turns;
}
