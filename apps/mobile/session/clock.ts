/** Monotonic timestamps supplied by caller; pauses are excluded from duration. */
export class SessionClock {
  private elapsed = 0;
  private since: number | null = null;
  private ended = true;
  start(now: number) {
    this.elapsed = 0;
    this.since = now;
    this.ended = false;
  }
  read(now: number) {
    return (
      this.elapsed + (this.since === null ? 0 : Math.max(0, now - this.since))
    );
  }
  pause(now: number) {
    this.elapsed = this.read(now);
    this.since = null;
  }
  resume(now: number) {
    if (!this.ended && this.since === null) this.since = now;
  }
  finish(now: number) {
    this.pause(now);
    this.ended = true;
    return this.elapsed;
  }
}
