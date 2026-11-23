// Bound provider responses before JSON parsing; never log bodies or credentials.
export const MAX_PROVIDER_BYTES = 128 * 1024;
function check(signal) {
  if (signal.aborted) throw new Error('Provider request interrupted');
}
export async function providerJson(response, signal) {
  if (signal.aborted) {
    await response.body?.cancel().catch(() => {});
    check(signal);
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new Error('Provider request failed');
  }
  const declared = Number(response.headers?.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_PROVIDER_BYTES) {
    await response.body?.cancel().catch(() => {});
    throw new Error('Provider response too large');
  }
  if (!response.body?.getReader) {
    // Also bound injected/non-streaming transports used by adapters and tests.
    const value = await response.json();
    check(signal);
    if (Buffer.byteLength(JSON.stringify(value) ?? '') > MAX_PROVIDER_BYTES)
      throw new Error('Provider response too large');
    return value;
  }
  const reader = response.body.getReader();
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', abort, {once:true});
  const chunks = [];
  let size = 0;
  try {
    check(signal);
    while (true) {
      const {done, value} = await reader.read();
      check(signal);
      if (done) break;
      size += value.byteLength;
      if (size > MAX_PROVIDER_BYTES) throw new Error('Provider response too large');
      chunks.push(value);
    }
    check(signal);
    return JSON.parse(Buffer.concat(chunks, size).toString('utf8'));
  } finally {
    signal.removeEventListener('abort', abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
