import { readRecovery, recoveryPoint } from "./recovery.ts";
type Storage = {getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void>};
const key = "walkmate.recovery";
export class RecoveryStore {
  private queue: Promise<unknown> = Promise.resolve();
  private storage: Storage;
  constructor(storage: Storage) { this.storage = storage; }
  private enqueue<T>(operation: () => Promise<T>) {
    const next = this.queue.then(operation, operation);
    this.queue = next.catch(() => {});
    return next;
  }
  private async read() {
    const raw = await this.storage.getItem(key);
    const point = readRecovery(raw);
    if (raw !== null && !point) throw new Error("Saved recovery point is unreadable.");
    return point;
  }
  load() { return this.enqueue(() => this.read()); }
  save(value: unknown) {
    const point = recoveryPoint(value);
    return this.enqueue(async () => {
      if (!point) throw new Error("Invalid recovery point.");
      await this.storage.setItem(key, JSON.stringify(point));
      return point;
    });
  }
  consume() {
    return this.enqueue(async () => {
      const point = await this.read();
      if (!point) throw new Error("No recovery point is saved.");
      await this.storage.removeItem(key);
      return point;
    });
  }
  erase() { return this.enqueue(() => this.storage.removeItem(key)); }
}
