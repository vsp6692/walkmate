export type ConversationPreferences = {
  rate: number;
  length: "brief" | "balanced" | "story";
  energy: "gentle" | "balanced" | "lively";
  questions: boolean;
  encouragement: boolean;
};
export const defaultConversation: ConversationPreferences = {
  rate: 0.9,
  length: "brief",
  energy: "balanced",
  questions: true,
  encouragement: true,
};
export function conversationPreferences(raw: unknown): ConversationPreferences {
  const value =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    rate: [0.75, 0.9, 1.1].includes(value.rate as number)
      ? (value.rate as number)
      : 0.9,
    length: ["brief", "balanced", "story"].includes(value.length as string)
      ? (value.length as ConversationPreferences["length"])
      : "brief",
    energy: ["gentle", "balanced", "lively"].includes(value.energy as string)
      ? (value.energy as ConversationPreferences["energy"])
      : "balanced",
    questions: typeof value.questions === "boolean" ? value.questions : true,
    encouragement: typeof value.encouragement === "boolean" ? value.encouragement : true,
  };
}
