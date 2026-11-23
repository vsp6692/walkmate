import type { DeviceVoice } from "./voices.ts";
type Snapshot = { voices: DeviceVoice[]; loading: boolean; error: string };
/** Keeps only the newest device lookup; disposed screens cannot receive late results. */
export class VoiceCatalog {
  private state: Snapshot = { voices: [], loading: true, error: "" };
  private revision = 0;
  private active = false;
  private listeners = new Set<() => void>();
  private load: () => Promise<DeviceVoice[]>;
  constructor(load: () => Promise<DeviceVoice[]>) { this.load = load; }
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private publish(state: Snapshot) {
    this.state = state;
    this.listeners.forEach(listener => listener());
  }
  activate() { this.active = true; }
  dispose() { this.active = false; this.revision++; }
  refresh = async () => {
    if (!this.active) return;
    const revision = ++this.revision;
    this.publish({ voices: [], loading: true, error: "" });
    try {
      const voices = await this.load();
      if (this.active && revision === this.revision)
        this.publish({ voices, loading: false, error: "" });
    } catch {
      if (this.active && revision === this.revision)
        this.publish({ voices: [], loading: false, error: "Unable to check installed voices. You can still use text chat." });
    }
  };
}
