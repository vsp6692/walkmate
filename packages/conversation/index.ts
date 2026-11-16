export type Message = { role: "user" | "assistant"; text: string };
export interface ConversationProvider {
  reply(messages: Message[], signal: AbortSignal): Promise<string>;
  interrupt(): void;
}
export const distanceMeters = (
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) => {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad,
    dLon = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
};
