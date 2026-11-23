import { conversationPreferences } from "./conversation.ts";
import { durations, type WalkDuration } from "../adventures/plans.ts";
import { places, type Place } from "../theme/scenario.ts";
export function appPreferences(raw: unknown) {
  const value = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  return {
    selected: value.selected === 1 ? 1 : 0,
    activity: [0, 1, 2, 3].includes(value.activity as number) ? value.activity as number : 0,
    language: value.language === "Tamil · experimental" ? value.language : "English",
    place: places.includes(value.place as Place) ? value.place as Place : "Neighborhood" as Place,
    duration: durations.includes(value.duration as WalkDuration) ? value.duration as WalkDuration : 0 as WalkDuration,
    conversation: conversationPreferences(value.conversation),
  };
}
type Storage = {getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>};
export class PreferenceStore {
  private queue: Promise<unknown> = Promise.resolve();
  private storage: Storage;
  constructor(storage: Storage) { this.storage = storage; }
  private enqueue<T>(operation: () => Promise<T>) {
    const next = this.queue.then(operation, operation);
    this.queue = next.catch(() => {});
    return next;
  }
  load() {
    return this.enqueue(async () => {
      const raw = await this.storage.getItem("preferences");
      if (raw === null) return appPreferences(null);
      const value = JSON.parse(raw);
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid saved preferences");
      return appPreferences(value);
    });
  }
  save(value: unknown) {
    const payload = JSON.stringify(appPreferences(value));
    return this.enqueue(() => this.storage.setItem("preferences", payload));
  }
  reset() { return this.save(null); }
}
