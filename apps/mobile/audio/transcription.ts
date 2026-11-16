export async function requestTranscription(
  endpoint: string,
  audio: Blob | Uint8Array,
  mime: string,
  language: "en" | "ta",
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const url = new URL(endpoint);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("Invalid server address.");
  const response = await fetcher(
    `${endpoint.replace(/\/$/, "")}/transcribe?language=${language}`,
    {
      method: "POST",
      headers: { "Content-Type": mime },
      body: audio as BodyInit,
      signal,
    },
  );
  if (signal.aborted) throw new Error("Transcription cancelled.");
  if (!response.ok)
    throw new Error(
      response.status === 503
        ? "Speech recognition is not configured on this server."
        : `Transcription failed (${response.status}).`,
    );
  const result = await response.json();
  if (signal.aborted) throw new Error("Transcription cancelled.");
  if (typeof result.text !== "string" || result.text.length > 4000)
    throw new Error("Invalid transcript received.");
  return result.text.trim();
}
