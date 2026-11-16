import {
  conversationPreferences,
  type ConversationPreferences,
} from "../preferences/conversation.ts";
export type Turn = { role: "user" | "assistant"; content: string };
export class ConversationClient {
  private controller: AbortController | null = null;
  cancel() {
    this.controller?.abort();
    this.controller = null;
  }
  async reply(
    endpoint: string,
    character: string,
    language: string,
    messages: Turn[],
    fetcher: typeof fetch = fetch,
    preferences?: ConversationPreferences,
  ): Promise<string> {
    this.cancel();
    const url = new URL(endpoint);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error(
        "Use an HTTP or HTTPS server URL without embedded credentials.",
      );
    const controller = new AbortController();
    this.controller = controller;
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetcher(
        `${endpoint.replace(/\/$/, "")}/conversation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            preferences: conversationPreferences(preferences),
            character,
            language,
            messages: messages
              .slice(-20)
              .map(({ role, content }) => ({ role, content })),
          }),
        },
      );
      if (controller.signal.aborted)
        throw new Error("Conversation interrupted.");
      if (!response.ok)
        throw new Error(
          response.status === 503
            ? "The server has no conversation provider configured."
            : `Conversation server returned ${response.status}.`,
        );
      const data = await response.json();
      if (controller.signal.aborted)
        throw new Error("Conversation interrupted.");
      if (
        typeof data.reply !== "string" ||
        !data.reply.trim() ||
        data.reply.length > 8000
      )
        throw new Error("The server returned an invalid reply.");
      return data.reply;
    } finally {
      clearTimeout(timer);
      if (this.controller === controller) this.controller = null;
    }
  }
}
