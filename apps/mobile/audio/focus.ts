/** Coordinates pending speech with microphone ownership without storing audio. */
export class AudioFocus {
  private owner: symbol | null = null;
  private revision = 0;
  private listeners = new Set<() => void>();
  recording = () => this.owner !== null;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  acquire(owner: symbol) {
    if (this.owner && this.owner !== owner)
      throw new Error("Another recording is active.");
    this.owner = owner;
    this.revision++;
    this.listeners.forEach((fn) => fn());
  }
  release(owner: symbol) {
    if (this.owner === owner) {
      this.owner = null;
      this.listeners.forEach((fn) => fn());
    }
  }
  interrupt() {
    this.revision++;
  }
  async speak(stop: () => Promise<void>, play: () => void) {
    const revision = ++this.revision;
    if (this.owner) return false;
    await stop();
    if (this.owner || revision !== this.revision) return false;
    play();
    return true;
  }
}
export const audioFocus = new AudioFocus();
