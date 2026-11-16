/** Only store a service address, never credentials/query tokens/fragments. */
export function serverAddress(input: string): string {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error(
      "Enter a complete server URL, such as http://192.168.1.10:8787.",
    );
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Use an HTTP or HTTPS address without passwords, query tokens or fragments.",
    );
  return url.toString().replace(/\/$/, "");
}
export async function serverHealth(
  input: string,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  const address = serverAddress(input);
  const result = await fetcher(`${address}/health`, { signal });
  if (!result.ok) throw new Error(`Server check failed (${result.status}).`);
  const data = await result.json();
  if (signal.aborted) throw new Error("Connection check cancelled.");
  if (
    typeof data.configured !== "boolean" ||
    typeof data.transcription !== "boolean"
  )
    throw new Error("This address did not return a WalkMate server status.");
  return {
    address,
    conversation: data.configured,
    transcription: data.transcription,
  };
}
