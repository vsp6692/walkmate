import React from "react";
import { Pressable, Text } from "react-native";
import type { Palette } from "../theme/scenario";
export function ActionButton({
  label,
  onPress,
  secondary = false,
  disabled = false,
  palette: p,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  palette: Palette;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        padding: secondary ? 15 : 19,
        borderRadius: 14,
        alignItems: "center",
        marginVertical: 6,
        borderWidth: secondary ? 1 : 0,
        borderColor: p.line,
        backgroundColor: secondary ? "transparent" : p.accent,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          color: secondary ? p.accent : "#FFFFFF",
          fontSize: secondary ? 13 : 16,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
