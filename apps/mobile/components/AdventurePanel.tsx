import React, { useState, useSyncExternalStore } from "react";
import { Text, View } from "react-native";
import { speakText, stopSpeech } from "../audio/speech";
import {
  story,
  currentChapter,
  walkProgress,
  type WalkDuration,
} from "../adventures/plans";
import { audioFocus } from "../audio/focus";
import type { Palette } from "../theme/scenario";
import { ActionButton } from "./ActionButton";
import { useDeviceVoices } from "../audio/useDeviceVoices";
import { voiceFor } from "../audio/voices";
export function AdventurePanel({
  rate,
  seconds,
  duration,
  virtual,
  paused,
  palette: p,
}: {
  rate: number;
  seconds: number;
  duration: WalkDuration;
  virtual: boolean;
  paused: boolean;
  palette: Palette;
}) {
  const microphoneActive = useSyncExternalStore(
    audioFocus.subscribe,
    audioFocus.recording,
    audioFocus.recording,
  );
  const progress = walkProgress(seconds, duration),
    unlocked = currentChapter(seconds);
  const [reading, setReading] = useState<number | null>(null),
    [error, setError] = useState("");
  const { voices } = useDeviceVoices();
  const voice = voiceFor(voices, "English");
  const chapter =
    story.chapters[reading === null ? unlocked : Math.min(reading, unlocked)];
  function speak() {
    if (!voice || paused || microphoneActive) return;
    stopSpeech();
    setError("");
    speakText(chapter.text, {
      rate,
      voice: voice.identifier,
      language: voice.language,
      onError: () =>
        setError(
          "Device voice could not play. The story is available as text.",
        ),
    });
  }
  return (
    <View
      style={{
        backgroundColor: p.wash,
        padding: 20,
        borderRadius: 18,
        gap: 12,
        marginBottom: 18,
      }}
    >
      {duration > 0 && (
        <>
          <Text style={{ color: p.ink, fontWeight: "700", fontSize: 18 }}>
            {progress.complete
              ? "You made time for yourself."
              : `${duration}-minute walk`}
          </Text>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 0,
              max: 100,
              now: Math.round(progress.fraction * 100),
            }}
            style={{ height: 6, backgroundColor: p.line, borderRadius: 3 }}
          >
            <View
              style={{
                width: `${progress.fraction * 100}%`,
                height: 6,
                backgroundColor: p.accent,
                borderRadius: 3,
              }}
            />
          </View>
          <Text style={{ color: p.muted }}>
            {progress.complete
              ? "Your time goal is complete. Finish whenever you’re ready."
              : `${Math.ceil((progress.remaining ?? 0) / 60)} minutes to your goal. Pauses don’t count.`}
          </Text>
        </>
      )}
      {virtual && (
        <>
          <Text style={{ color: p.accent, fontSize: 11, fontWeight: "700" }}>
            FICTIONAL AUDIO STORY · ENGLISH
          </Text>
          <Text style={{ color: p.ink, fontSize: 22, fontWeight: "600" }}>
            {story.title}
          </Text>
          <Text style={{ color: p.muted }}>
            Chapter {story.chapters.indexOf(chapter) + 1} of 4 · {chapter.title}
          </Text>
          <Text style={{ color: p.ink, lineHeight: 25 }}>{chapter.text}</Text>
          <Text style={{ color: p.muted, fontSize: 12 }}>
            Chapters unlock at 0, 5, 10 and 15 minutes. This is an imagined
            setting, unrelated to your location.
          </Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {story.chapters.slice(0, unlocked + 1).map((c, i) => (
              <ActionButton
                key={c.at}
                label={`${i + 1}`}
                secondary
                palette={p}
                onPress={() => {
                  stopSpeech();
                  setReading(i);
                }}
              />
            ))}
          </View>
          {reading !== null && (
            <ActionButton
              palette={p}
              secondary
              label="Follow newest chapter"
              onPress={() => {
                stopSpeech();
                setReading(null);
              }}
            />
          )}
          <ActionButton
            palette={p}
            label="Read chapter aloud"
            onPress={speak}
            disabled={!voice || paused || microphoneActive}
          />
          <ActionButton
            palette={p}
            label="Stop narration"
            secondary
            onPress={() => void stopSpeech()}
          />
          {!voice && (
            <Text style={{ color: p.muted }}>
              Install an English device voice for narration.
            </Text>
          )}
          {!!error && <Text style={{ color: p.accent }}>{error}</Text>}
        </>
      )}
    </View>
  );
}
