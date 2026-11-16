export type Coordinate = { latitude: number; longitude: number };
export type Destination = Coordinate & { label: string };
export function parseDestination(
  label: string,
  latitude: string,
  longitude: string,
): Destination | null {
  if (!latitude.trim() || !longitude.trim()) return null;
  // Decimal degrees only; reject hex, exponent notation and ambiguous pasted text.
  const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
  if (!decimal.test(latitude.trim()) || !decimal.test(longitude.trim()))
    return null;
  const lat = Number(latitude),
    lon = Number(longitude);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  )
    return null;
  return {
    label: label.trim().slice(0, 80) || "My destination",
    latitude: lat,
    longitude: lon,
  };
}
export function directDistance(a: Coordinate, b: Coordinate): number {
  const rad = Math.PI / 180,
    h =
      Math.sin(((b.latitude - a.latitude) * rad) / 2) ** 2 +
      Math.cos(a.latitude * rad) *
        Math.cos(b.latitude * rad) *
        Math.sin(((b.longitude - a.longitude) * rad) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
export function mapUrl(point: Coordinate) {
  return `https://www.openstreetmap.org/?mlat=${point.latitude}&mlon=${point.longitude}#map=16/${point.latitude}/${point.longitude}`;
}
