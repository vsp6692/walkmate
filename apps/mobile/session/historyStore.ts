import { cleanSummary, type WalkSummary } from "./history.ts";
export const historyKey = "walkmate.walkSummaries.v1";
type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};
/** Serialize reads/writes so a late save cannot undo a later erase. */
export class HistoryStore {
  private pending: Promise<unknown> = Promise.resolve();
  private storage: Storage;
  constructor(storage: Storage) { this.storage = storage; }
  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.pending.then(operation, operation);
    this.pending = next.catch(() => {});
    return next;
  }
  private async read(): Promise<WalkSummary[]> {
    const raw = await this.storage.getItem(historyKey);
    if (raw === null) return [];
    let data: unknown;
    try { data = JSON.parse(raw); } catch { throw new Error("Saved walks could not be read. Existing data was left unchanged."); }
    if (!Array.isArray(data)) throw new Error("Saved walks have an unsupported format. Existing data was left unchanged.");
    const entries = data.map(cleanSummary);
    if (entries.some(entry => entry === null)) throw new Error("Some saved walks are invalid. Existing data was left unchanged.");
    return (entries as WalkSummary[]).slice(0, 50);
  }
  load() { return this.enqueue(() => this.read()); }
  save(value: unknown) {
    return this.enqueue(async () => {
      const entry = cleanSummary(value);
      if (!entry) throw new Error("This walk cannot be saved.");
      const items = await this.read();
      const next = [entry, ...items.filter(item => item.id !== entry.id)].slice(0, 50);
      await this.storage.setItem(historyKey, JSON.stringify(next));
      return next;
    });
  }
  erase() { return this.enqueue(() => this.storage.removeItem(historyKey)); }
}
