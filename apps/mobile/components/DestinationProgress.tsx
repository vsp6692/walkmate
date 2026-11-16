import React from "react";
import { Text, View } from "react-native";
import type { Destination, Coordinate } from "../maps/destination";
import { directDistance } from "../maps/destination";
import type { Palette } from "../theme/scenario";
export function DestinationProgress({
  destination,
  position,
  paused,
  palette: p,
}: {
  destination: Destination;
  position: Coordinate | null;
  paused: boolean;
  palette: Palette;
}) {
  const meters = position ? directDistance(position, destination) : null;
  return (
    <View
      style={{
        backgroundColor: p.wash,
        padding: 18,
        borderRadius: 16,
        gap: 8,
        marginBottom: 16,
      }}
    >
      <Text style={{ color: p.ink, fontWeight: "600" }}>
        Toward {destination.label}
      </Text>
      <Text style={{ color: p.accent, fontSize: 24, fontWeight: "600" }}>
        {paused
          ? "Paused"
          : meters === null
            ? "Waiting for GPS"
            : meters < 1000
              ? `${Math.round(meters)} m away`
              : `${(meters / 1000).toFixed(2)} km away`}
      </Text>
      <Text style={{ color: p.muted, fontSize: 12, lineHeight: 19 }}>
        Straight-line estimate from the latest accepted GPS fix. Not a route or
        arrival confirmation; GPS accuracy varies. Follow safe public paths.
      </Text>
    </View>
  );
}
