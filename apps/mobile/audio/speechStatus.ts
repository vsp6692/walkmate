import { abortable } from "../conversation/abortable.ts";
import { serverAddress } from "../conversation/endpoint.ts";
import { requireTranscriptionLanguage } from "./languages.ts";
/** Check capability before microphone permission; aborted health responses cannot proceed. */
export async function checkSpeechStatus(endpoint: string, language: string, signal: AbortSignal, fetcher: typeof fetch = fetch) {
  const response = await abortable(
    () => fetcher(`${serverAddress(endpoint)}/health`, { signal }),
    signal, "Speech setup cancelled.",
  );
  if (!response.ok) throw new Error(`Speech status check failed (${response.status}).`);
  const config = await abortable(() => response.json(), signal, "Speech setup cancelled.");
  if (signal.aborted) throw new Error("Speech setup cancelled.");
  return requireTranscriptionLanguage(config, language);
}
