/** Owns one asynchronous native subscription; stale setup results are always released. */
export class WatchOwner {
  private revision = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private subscription: { remove(): void } | null = null;
  stop() {
    this.revision++;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const previous = this.subscription;
    this.subscription = null;
    previous?.remove();
  }
  async start(
    setup: (current: () => boolean) => Promise<{ remove(): void } | null>,
    onError: () => void,
    timeoutMs = 20000,
  ) {
    this.stop();
    const revision = this.revision;
    const current = () => revision === this.revision;
    const timer = setTimeout(() => {
      if (!current()) return;
      this.stop();
      onError();
    }, timeoutMs);
    this.timer = timer;
    try {
      const subscription = await setup(current);
      if (!current()) subscription?.remove();
      else this.subscription = subscription;
    } catch {
      if (current()) onError();
    } finally {
      clearTimeout(timer);
      if (this.timer === timer) this.timer = null;
    }
  }
}
