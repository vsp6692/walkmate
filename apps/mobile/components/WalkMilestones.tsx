import React from "react";
import { Text, View } from "react-native";
import { milestoneMessage, walkMilestones } from "../adventures/milestones";
import type { ConversationPreferences } from "../preferences/conversation";
import type { Palette } from "../theme/scenario";
export function WalkMilestones({ seconds, meters, companion, paused, preferences, palette: p }: {
  preferences: ConversationPreferences;
  seconds: number; meters: number; companion: string; paused: boolean; palette: Palette;
}) {
  const milestones = walkMilestones(seconds, meters);
  return <View style={{ padding: 18, borderRadius: 16, backgroundColor: p.wash, gap: 10, marginBottom: 16 }}>
    <Text style={{ color: p.ink, fontSize: 18, fontWeight: "600" }}>Little milestones</Text>
    {(["time", "distance"] as const).map(kind => {
      const progress = milestones[kind];
      return <View key={kind} style={{ gap: 5 }}>
        <Text style={{ color: p.accent, fontWeight: "600" }}>
          {progress.latest ? `Reached: ${progress.latest.label}` : kind === "time" ? "Active session time" : "GPS-estimated distance"}
        </Text>
        {progress.latest && preferences.encouragement && <Text style={{ color: p.ink, lineHeight: 21 }}>{milestoneMessage(companion, kind, preferences.questions)}</Text>}
        {progress.next && <Text style={{ color: p.muted, lineHeight: 20 }}>
          Next optional marker: {progress.next.label}.
        </Text>}
      </View>;
    })}
    <Text style={{ color: p.muted, fontSize: 12, lineHeight: 19 }}>
      {paused ? "Session paused. " : ""}Time excludes pauses. Distance uses accepted foreground GPS samples and may undercount gaps. These are local session markers, not route guidance or fitness targets. Nothing is sent to your conversation provider.
    </Text>
  </View>;
}
