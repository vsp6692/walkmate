export type WalkSummary = {
  id: string;
  finishedAt: string;
  companion: string;
  activity: string;
  seconds: number;
  meters: number;
};
/** Whitelist persisted fields; never serialize arbitrary session objects. */
export function cleanSummary(value: unknown): WalkSummary | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.id !== "string" ||
    typeof v.finishedAt !== "string" ||
    !Number.isFinite(Date.parse(v.finishedAt)) ||
    typeof v.companion !== "string" ||
    typeof v.activity !== "string" ||
    typeof v.seconds !== "number" ||
    !Number.isFinite(v.seconds) ||
    v.seconds < 0 ||
    typeof v.meters !== "number" ||
    !Number.isFinite(v.meters) ||
    v.meters < 0
  )
    return null;
  return {
    id: v.id.slice(0, 100),
    finishedAt: v.finishedAt,
    companion: v.companion.slice(0, 80),
    activity: v.activity.slice(0, 80),
    seconds: Math.floor(v.seconds),
    meters: v.meters,
  };
}
export function readHistory(raw: string | null): WalkSummary[] {
  try {
    const data = JSON.parse(raw ?? "[]");
    return Array.isArray(data)
      ? data
          .map(cleanSummary)
          .filter((x): x is WalkSummary => x !== null)
          .slice(0, 50)
      : [];
  } catch {
    return [];
  }
}
