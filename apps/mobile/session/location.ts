export type Fix = {
  timestamp: number;
  coords: { latitude: number; longitude: number; accuracy: number | null };
};
export function validFix(point: Fix) {
  const { latitude, longitude, accuracy } = point.coords;
  return (
    Number.isFinite(point.timestamp) &&
    Number.isFinite(latitude) &&
    Math.abs(latitude) <= 90 &&
    Number.isFinite(longitude) &&
    Math.abs(longitude) <= 180 &&
    accuracy !== null &&
    Number.isFinite(accuracy) &&
    accuracy >= 0 &&
    accuracy <= 40
  );
}
/** Reject long sampling gaps, stale fixes and impossible jumps instead of drawing a shortcut. */
export function segmentMeters(last: Fix | null, point: Fix): number {
  if (!last || !validFix(last) || !validFix(point)) return 0;
  const seconds = (point.timestamp - last.timestamp) / 1000;
  if (seconds <= 0 || seconds > 30) return 0;
  const rad = Math.PI / 180,
    a = last.coords,
    b = point.coords;
  const h =
    Math.sin(((b.latitude - a.latitude) * rad) / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(((b.longitude - a.longitude) * rad) / 2) ** 2;
  const meters = 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
  return meters / seconds > 8 ? 0 : meters;
}

/** Reject cached/out-of-order fixes before changing the distance anchor or UI. */
export function evaluateFix(
  last: Fix | null,
  point: Fix,
  now: number,
): { accepted: boolean; meters: number; anchor: Fix | null } {
  if (
    !validFix(point) ||
    !Number.isFinite(now) ||
    now - point.timestamp > 15000 ||
    point.timestamp - now > 5000
  )
    return { accepted: false, meters: 0, anchor: last };
  if (!last) return { accepted: true, meters: 0, anchor: point };
  const elapsed = (point.timestamp - last.timestamp) / 1000;
  if (elapsed <= 0) return { accepted: false, meters: 0, anchor: last };
  if (elapsed > 30) return { accepted: true, meters: 0, anchor: point };
  const meters = segmentMeters(last, point);
  const moved =
    last.coords.latitude !== point.coords.latitude ||
    last.coords.longitude !== point.coords.longitude;
  if (meters === 0 && moved)
    return { accepted: false, meters: 0, anchor: last };
  return { accepted: true, meters, anchor: point };
}
