import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import * as Linking from "expo-linking";
import {
  parseDestination,
  mapUrl,
  type Destination,
} from "../maps/destination";
import { ActionButton } from "./ActionButton";
import type { Palette } from "../theme/scenario";
export function DestinationPicker({
  value,
  onChange,
  palette: p,
}: {
  value: Destination | null;
  onChange: (value: Destination | null) => void;
  palette: Palette;
}) {
  const [label, setLabel] = useState(""),
    [latitude, setLatitude] = useState(""),
    [longitude, setLongitude] = useState(""),
    [error, setError] = useState("");
  const field = (
    name: string,
    value: string,
    change: (text: string) => void,
  ) => (
    <TextInput
      accessibilityLabel={name}
      placeholder={name}
      placeholderTextColor={p.muted}
      value={value}
      onChangeText={change}
      autoCorrect={false}
      autoCapitalize="none"
      maxLength={name === "Destination name" ? 80 : 24}
      style={{
        borderWidth: 1,
        borderColor: p.line,
        padding: 14,
        borderRadius: 12,
        color: p.ink,
      }}
    />
  );
  function choose() {
    const next = parseDestination(label, latitude, longitude);
    if (!next) {
      setError(
        "Enter latitude from −90 to 90 and longitude from −180 to 180 in decimal degrees.",
      );
      return;
    }
    onChange(next);
    setError("");
  }
  return (
    <View
      style={{
        padding: 20,
        borderRadius: 18,
        backgroundColor: p.wash,
        gap: 12,
        marginBottom: 20,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "600", color: p.ink }}>
        Somewhere in mind?
      </Text>
      <Text style={{ color: p.muted, lineHeight: 20, fontSize: 12 }}>
        Optional: enter coordinates for a place you know. This stays in memory
        and is cleared when the walk ends. WalkMate shows straight-line
        distance, not a walking route.
      </Text>
      {value ? (
        <>
          <Text style={{ color: p.ink, fontWeight: "600" }}>{value.label}</Text>
          <Text style={{ color: p.muted }}>
            {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
          </Text>
          <Text style={{ color: p.muted, fontSize: 12 }}>
            Opening OpenStreetMap shares this destination with that service.
            Your current GPS position is not included.
          </Text>
          <ActionButton
            palette={p}
            secondary
            label="View destination on OpenStreetMap"
            onPress={() =>
              void Linking.openURL(mapUrl(value)).catch(() =>
                setError("Could not open the map."),
              )
            }
          />
          <ActionButton
            palette={p}
            secondary
            label="Remove destination"
            onPress={() => {
              onChange(null);
              setLabel("");
              setLatitude("");
              setLongitude("");
              setError("");
            }}
          />
        </>
      ) : (
        <>
          {field("Destination name", label, setLabel)}
          {field("Latitude", latitude, setLatitude)}
          {field("Longitude", longitude, setLongitude)}
          <ActionButton
            palette={p}
            secondary
            label="Set destination"
            onPress={choose}
          />
        </>
      )}
      {!!error && (
        <Text accessibilityLiveRegion="polite" style={{ color: p.accent }}>
          {error}
        </Text>
      )}
      <Text style={{ color: p.muted, fontSize: 11 }}>
        Choose a safe, publicly accessible place. Coordinate entry does not
        verify access or provide navigation.
      </Text>
    </View>
  );
}
