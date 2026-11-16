export type DeviceVoice = { identifier: string; language: string };
export function voiceFor(
  voices: DeviceVoice[],
  language: string,
): DeviceVoice | undefined {
  const prefix = language === "English" ? "en" : "ta";
  return voices.find(
    (v) =>
      v.language.toLowerCase().replaceAll("_", "-").split("-")[0] === prefix,
  );
}
