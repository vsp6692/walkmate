/** Synchronous ownership prevents async recovery from replacing a new session. */
export class SessionTransition {
  private phase: "idle" | "restoring" | "active" = "idle";
  private listeners = new Set<() => void>();
  snapshot = () => this.phase;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private set(phase: typeof this.phase) {
    this.phase = phase;
    this.listeners.forEach(listener => listener());
  }
  start() {
    if (this.phase !== "idle") return false;
    this.set("active");
    return true;
  }
  beginRestore() {
    if (this.phase !== "idle") return false;
    this.set("restoring");
    return true;
  }
  completeRestore() {
    if (this.phase === "restoring") this.set("active");
  }
  cancelRestore() {
    if (this.phase === "restoring") this.set("idle");
  }
  finish() {
    if (this.phase === "active") this.set("idle");
  }
}
