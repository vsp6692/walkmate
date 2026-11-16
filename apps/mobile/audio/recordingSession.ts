export type RecordingState = {
  phase:
    | "idle"
    | "preparing"
    | "recording"
    | "stopping"
    | "ready"
    | "uploading"
    | "cancelling"
    | "error";
  message: string;
};
export type RecordingDependencies = {
  prepare: (signal: AbortSignal) => Promise<void>;
  record: () => void;
  stop: () => Promise<string | null>;
  remove: (uri: string) => Promise<void>;
  restore: () => Promise<void>;
  transcribe: (uri: string, signal: AbortSignal) => Promise<string>;
  deliver: (text: string) => void;
};
/** Serializes native audio operations. Cancellation invalidates results immediately,
 * then waits for pending native preparation before stopping/deleting its resources. */
export class RecordingSession {
  private state: RecordingState = { phase: "idle", message: "" };
  private listeners = new Set<() => void>();
  private queue: Promise<void> = Promise.resolve();
  private abort: AbortController | null = null;
  private uri: string | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private cleanupFailed = false;
  private deps: RecordingDependencies;
  constructor(deps: RecordingDependencies) {
    this.deps = deps;
  }
  activate() {
    this.disposed = false;
  }
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(phase: RecordingState["phase"], message = this.state.message) {
    this.state = { phase, message };
    if (!this.disposed) this.listeners.forEach((fn) => fn());
  }
  private run(work: () => Promise<void>) {
    this.queue = this.queue.then(work, work);
    return this.queue;
  }
  private async cleanup() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    try {
      const path = await this.deps.stop();
      this.uri = this.uri ?? path;
    } catch {
      /* recorder may already have auto-stopped */
    }
    let failed = false;
    try {
      if (this.uri) {
        await this.deps.remove(this.uri);
        this.uri = null;
      }
    } catch {
      failed = true;
    }
    try {
      await this.deps.restore();
    } catch {
      failed = true;
    }
    if (failed)
      this.update(
        this.state.phase,
        "Temporary audio cleanup failed. Clear app cache or restart before recording again.",
      );
    this.cleanupFailed = failed;
    return !failed;
  }
  start() {
    if (this.disposed || this.state.phase !== "idle") return Promise.resolve();
    const controller = new AbortController();
    this.abort = controller;
    this.update("preparing", "");
    return this.run(async () => {
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        await this.deps.prepare(controller.signal);
        if (controller.signal.aborted) return;
        this.deps.record();
        this.update("recording");
        this.timer = setTimeout(() => void this.stop(), 30000);
      } catch (e) {
        if (!controller.signal.aborted)
          this.update(
            "preparing",
            e instanceof Error ? e.message : "Recording failed.",
          );
        controller.abort();
      } finally {
        clearTimeout(timeout);
        if (controller.signal.aborted) {
          await this.cleanup();
          this.update(
            this.cleanupFailed ? "error" : "idle",
            this.state.message || "Recording cancelled or timed out.",
          );
        }
      }
    });
  }
  stop() {
    if (this.state.phase !== "recording") return Promise.resolve();
    const controller = this.abort;
    this.update("stopping");
    if (this.timer) clearTimeout(this.timer);
    return this.run(async () => {
      try {
        this.uri = await this.deps.stop();
        await this.deps.restore();
        if (controller?.signal.aborted) return;
        if (!this.uri) throw new Error("No recording was produced.");
        this.update("ready");
      } catch (e) {
        await this.cleanup();
        this.update(
          this.cleanupFailed ? "error" : "idle",
          e instanceof Error ? e.message : "Recording failed.",
        );
      }
    });
  }
  upload() {
    if (this.disposed || this.state.phase !== "ready" || !this.uri)
      return Promise.resolve();
    const path = this.uri,
      controller = new AbortController();
    this.abort = controller;
    this.update("uploading");
    return this.run(async () => {
      const timeout = setTimeout(() => controller.abort(), 45000);
      try {
        const text = await this.deps.transcribe(path, controller.signal);
        if (!controller.signal.aborted && !this.disposed) {
          this.deps.deliver(text);
          this.update(
            "uploading",
            text
              ? "Transcript added to draft. Review before sending."
              : "No speech recognized.",
          );
        }
      } catch (e) {
        if (!controller.signal.aborted)
          this.update(
            "uploading",
            e instanceof Error ? e.message : "Transcription failed.",
          );
      } finally {
        clearTimeout(timeout);
        await this.cleanup();
        this.update(this.cleanupFailed ? "error" : "idle");
      }
    });
  }
  cancel() {
    this.abort?.abort();
    if (this.timer) clearTimeout(this.timer);
    this.update("cancelling");
    return this.run(async () => {
      await this.cleanup();
      this.update(this.cleanupFailed ? "error" : "idle");
    });
  }
  dispose() {
    this.disposed = true;
    this.listeners.clear();
    return this.cancel();
  }
}
