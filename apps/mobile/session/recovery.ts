/** Recovery is explicit opt-in and deliberately excludes GPS fixes and conversation. */
export type RecoveryPoint = {
  version: 1;
  savedAt: string;
  companion: number;
  activity: number;
  seconds: number;
  meters: number;
};
export function recoveryPoint(value: unknown): RecoveryPoint | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (v.version !== 1 || typeof v.savedAt !== "string" ||
    !Number.isFinite(Date.parse(v.savedAt)) ||
    ![0, 1].includes(v.companion as number) ||
    ![0, 1, 2, 3].includes(v.activity as number) ||
    typeof v.seconds !== "number" || !Number.isFinite(v.seconds) || v.seconds < 0 ||
    typeof v.meters !== "number" || !Number.isFinite(v.meters) || v.meters < 0) return null;
  return {
    version: 1, savedAt: v.savedAt, companion: v.companion as number,
    activity: v.activity as number, seconds: Math.floor(v.seconds), meters: v.meters,
  };
}
export function readRecovery(raw: string | null): RecoveryPoint | null {
  try { return recoveryPoint(JSON.parse(raw ?? "null")); } catch { return null; }
}
