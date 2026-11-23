import { abortable } from "./abortable.ts";
import { conversationContext, type Turn } from "./context.ts";
import { serverAddress } from "./endpoint.ts";
import {
  conversationPreferences,
  type ConversationPreferences,
} from "../preferences/conversation.ts";
export type { Turn } from "./context.ts";

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
    const address = serverAddress(endpoint);
    const context = conversationContext(messages);
    const controller = new AbortController();
    this.controller = controller;
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await abortable(() => fetcher(
        `${address}/conversation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            preferences: conversationPreferences(preferences),
            character,
            language,
            messages: context,
          }),
        },
      ), controller.signal, "Conversation interrupted.");
      if (controller.signal.aborted)
        throw new Error("Conversation interrupted.");
      if (!response.ok)
        throw new Error(
          response.status === 503
            ? "The server has no conversation provider configured."
            : `Conversation server returned ${response.status}.`,
        );
      const data = await abortable(() => response.json(), controller.signal, "Conversation interrupted.");
      if (controller.signal.aborted)
        throw new Error("Conversation interrupted.");
      if (
        !data ||
        typeof data !== "object" ||
        typeof data.reply !== "string" ||
        !data.reply.trim() ||
        data.reply.length > 4000
      )
        throw new Error("The server returned an invalid reply.");
      return data.reply;
    } finally {
      clearTimeout(timer);
      if (this.controller === controller) this.controller = null;
    }
  }
}
