import { abortable } from "../conversation/abortable.ts";
import { serverAddress } from "../conversation/endpoint.ts";
export async function requestTranscription(
  endpoint: string,
  audio: Blob | Uint8Array,
  mime: string,
  language: "en" | "ta",
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const address = serverAddress(endpoint);
  if (!["en", "ta"].includes(language)) throw new Error("Unsupported speech language.");
  const response = await abortable(() => fetcher(
    `${address}/transcribe?language=${language}`,
    {
      method: "POST",
      headers: { "Content-Type": mime },
      body: audio as BodyInit,
      signal,
    },
  ), signal, "Transcription cancelled.");
  if (signal.aborted) throw new Error("Transcription cancelled.");
  if (!response.ok)
    throw new Error(
      response.status === 503
        ? "Speech recognition is not configured on this server."
        : `Transcription failed (${response.status}).`,
    );
  const result = await abortable(() => response.json(), signal, "Transcription cancelled.");
  if (signal.aborted) throw new Error("Transcription cancelled.");
  if (!result || typeof result.text !== "string" || result.text.length > 4000)
    throw new Error("Invalid transcript received.");
  return result.text.trim();
}
