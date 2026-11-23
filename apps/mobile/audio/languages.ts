export type SpeechLanguage = "en" | "ta";
/** UI labels are explicit: future languages must not silently become Tamil. */
export function speechLanguage(label: string): SpeechLanguage | null {
  if (label === "English") return "en";
  if (label === "Tamil · experimental") return "ta";
  return null;
}
export function requireTranscriptionLanguage(status: unknown, label: string): SpeechLanguage {
  const language = speechLanguage(label);
  if (!language) throw new Error("This conversation language is not supported for voice input.");
  if (!status || typeof status !== "object") throw new Error("The server returned an invalid speech status.");
  const value = status as Record<string, unknown>;
  if (value.transcription !== true) throw new Error("Speech recognition is not configured on this server.");
  if (!Array.isArray(value.acceptedLanguageHints) || !value.acceptedLanguageHints.includes(language))
    throw new Error("This server does not advertise voice input for the selected language. You can type instead.");
  return language;
}
