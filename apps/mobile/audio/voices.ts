import { speechLanguage } from "./languages.ts";
export type DeviceVoice = { identifier: string; language: string };
export function voiceFor(
  voices: DeviceVoice[],
  language: string,
): DeviceVoice | undefined {
  const prefix = speechLanguage(language);
  if (!prefix) return undefined;
  return voices.find(
    (v) =>
      v.language.toLowerCase().replaceAll("_", "-").split("-")[0] === prefix,
  );
}
