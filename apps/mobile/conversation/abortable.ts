/** Stop waiting even if a transport ignores AbortSignal. The transport still receives the signal. */
export function abortable<T>(work: () => Promise<T>, signal: AbortSignal, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new Error(message));
    if (signal.aborted) { abort(); return; }
    signal.addEventListener("abort", abort, { once: true });
    let result: Promise<T>;
    try { result = work(); } catch (error) {
      signal.removeEventListener("abort", abort);
      reject(error);
      return;
    }
    result.then(value => {
      signal.removeEventListener("abort", abort);
      if (signal.aborted) abort();
      else resolve(value);
    }, error => {
      signal.removeEventListener("abort", abort);
      reject(error);
    });
  });
}
