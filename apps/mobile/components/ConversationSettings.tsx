import React from "react";
import { Pressable, Text, View } from "react-native";
import type { ConversationPreferences } from "../preferences/conversation";
import type { Palette } from "../theme/scenario";
export function ConversationSettings({
  value,
  onChange,
  palette: p,
}: {
  value: ConversationPreferences;
  onChange: (value: ConversationPreferences) => void;
  palette: Palette;
}) {
  function options(
    title: string,
    items: { label: string; selected: boolean; choose: () => void }[],
  ) {
    return (
      <View style={{ gap: 8 }}>
        <Text style={{ color: p.ink, fontWeight: "600" }}>{title}</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {items.map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="radio"
              accessibilityState={{ selected: item.selected }}
              onPress={item.choose}
              style={{
                padding: 12,
                borderWidth: 1,
                borderColor: item.selected ? p.accent : p.line,
                borderRadius: 18,
                backgroundColor: item.selected ? p.wash : p.surface,
              }}
            >
              <Text style={{ color: p.ink }}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }
  return (
    <View
      style={{
        backgroundColor: p.surface,
        padding: 18,
        borderRadius: 16,
        gap: 18,
        marginBottom: 18,
      }}
    >
      {options(
        "Speaking pace",
        [
          { label: "Unhurried", rate: 0.75 },
          { label: "Natural", rate: 0.9 },
          { label: "Brisk", rate: 1.1 },
        ].map((x) => ({
          label: x.label,
          selected: value.rate === x.rate,
          choose: () => onChange({ ...value, rate: x.rate }),
        })),
      )}
      {options(
        "Reply length",
        (["brief", "balanced", "story"] as const).map((x) => ({
          label:
            x === "story"
              ? "Storytelling"
              : x === "brief"
                ? "Short & sweet"
                : "Balanced",
          selected: value.length === x,
          choose: () => onChange({ ...value, length: x }),
        })),
      )}
      {options(
        "Conversation energy",
        (["gentle", "balanced", "lively"] as const).map((x) => ({
          label: x[0].toUpperCase() + x.slice(1),
          selected: value.energy === x,
          choose: () => onChange({ ...value, energy: x }),
        })),
      )}
      {options("Follow-up questions", [
        {
          label: "Welcome questions",
          selected: value.questions,
          choose: () => onChange({ ...value, questions: true }),
        },
        {
          label: "Let me lead",
          selected: !value.questions,
          choose: () => onChange({ ...value, questions: false }),
        },
      ])}
      <Text style={{ color: p.muted, fontSize: 12, lineHeight: 19 }}>
        Pace applies to device speech. Conversation style is sent to your
        configured AI provider with each message; results depend on that model.
        Companions only speak when you ask.
      </Text>
    </View>
  );
}
