import React, { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AppState, Platform, Text, View } from "react-native";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { File } from "expo-file-system";
import { stopSpeech } from "../audio/speech";
import { audioFocus } from "../audio/focus";
import { RecordingSession } from "../audio/recordingSession";
import { speechLanguage } from "../audio/languages";
import { checkSpeechStatus } from "../audio/speechStatus";
import { requestTranscription } from "../audio/transcription";
import { ActionButton } from "./ActionButton";
import type { Palette } from "../theme/scenario";
export function MicrophoneInput({
  endpoint,
  language,
  disabled,
  onTranscript,
  palette: p,
}: {
  endpoint: string;
  language: string;
  disabled: boolean;
  onTranscript: (text: string) => void;
  palette: Palette;
}) {
  const [owner] = useState(()=>Symbol("microphone"));
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY),
    state = useAudioRecorderState(recorder);
  const session = useMemo(
    () =>
      new RecordingSession({
        prepare: async (signal) => {
          await checkSpeechStatus(endpoint, language, signal);
          if (signal.aborted) return;
          const permission =
            await AudioModule.requestRecordingPermissionsAsync();
          if (!permission.granted)
            throw new Error(
              "Microphone permission declined. You can type instead.",
            );
          if (signal.aborted) return;
          audioFocus.acquire(owner);
          await stopSpeech();
          await setAudioModeAsync({
            allowsRecording: true,
            playsInSilentMode: true,
          });
          if (signal.aborted) return;
          await recorder.prepareToRecordAsync();
        },
        record: () => recorder.record({ forDuration: 30 }),
        stop: async () => {
          try {
            await recorder.stop();
          } catch {}
          return recorder.uri;
        },
        remove: async (path) => {
          if (Platform.OS === "web") URL.revokeObjectURL(path);
          else {
            const file = new File(path);
            if (file.exists) await file.delete();
          }
        },
        restore: async () => {
          try {
            await setAudioModeAsync({ allowsRecording: false });
          } finally {
            audioFocus.release(owner);
          }
        },
        transcribe: async (path, signal) => {
          const data =
            Platform.OS === "web"
              ? await (await fetch(path)).blob()
              : await new File(path).bytes();
          if (signal.aborted) throw new Error("Cancelled");
          const selectedLanguage = speechLanguage(language);
          if (!selectedLanguage) throw new Error("Unsupported speech language.");
          return requestTranscription(
            endpoint,
            data,
            Platform.OS === "web"
              ? (data as Blob).type || "audio/webm"
              : "audio/mp4",
            selectedLanguage,
            signal,
          );
        },
        deliver: onTranscript,
      }),
    [endpoint, language, onTranscript, recorder, owner],
  );
  const { phase, message } = useSyncExternalStore(
    session.subscribe,
    session.snapshot,
    session.snapshot,
  );
  useEffect(() => {
    if (disabled) void session.cancel();
  }, [disabled, session]);
  useEffect(() => {
    session.activate();
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") void session.cancel();
    });
    return () => {
      sub.remove();
      void session.dispose();
    };
  }, [session]);
  return (
    <View
      style={{
        padding: 14,
        borderWidth: 1,
        borderColor: p.line,
        borderRadius: 14,
        gap: 10,
      }}
    >
      <Text style={{ color: p.ink, fontWeight: "600" }}>
        Voice input · short clips
      </Text>
      <Text style={{ color: p.muted, fontSize: 12, lineHeight: 19 }}>
        Record up to 30 seconds into temporary device storage. Nothing is
        uploaded until you choose “Send audio for transcription.” That sends
        audio to your server and speech provider. Their retention policy
        applies. The transcript appears separately for review before you add it to your message.
      </Text>
      {phase === "idle" && (
        <ActionButton
          palette={p}
          secondary
          label="Allow microphone & record a clip"
          onPress={() => void session.start()}
          disabled={disabled}
        />
      )}
      {phase === "recording" && (
        <>
          <Text accessibilityLiveRegion="polite" style={{ color: p.accent }}>
            Recording · {Math.floor(state.durationMillis / 1000)} / 30 seconds
          </Text>
          <ActionButton
            palette={p}
            label="Stop recording"
            onPress={() => void session.stop()}
          />
        </>
      )}
      {(phase === "preparing" ||
        phase === "stopping" ||
        phase === "cancelling") && (
        <Text style={{ color: p.muted }}>
          Preparing or cleaning up microphone…
        </Text>
      )}
      {phase === "ready" && (
        <ActionButton
          palette={p}
          label="Send audio for transcription"
          onPress={() => void session.upload()}
          disabled={disabled}
        />
      )}
      {phase === "uploading" && (
        <Text style={{ color: p.muted }}>Transcribing…</Text>
      )}
      {phase !== "idle" && (
        <ActionButton
          palette={p}
          secondary
          label="Cancel & delete clip"
          onPress={() => void session.cancel()}
        />
      )}
      {!!message && (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: p.muted, fontSize: 12 }}
        >
          {message}
        </Text>
      )}
    </View>
  );
}
