import React, {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AppState, Pressable, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { serverAddress, serverHealth } from "../conversation/endpoint";
import { speakText, stopSpeech } from "../audio/speech";
import { ConversationClient, type Turn } from "../conversation/client";
import { useDeviceVoices } from "../audio/useDeviceVoices";
import { voiceFor } from "../audio/voices";
import { MicrophoneInput } from "./MicrophoneInput";
import { audioFocus } from "../audio/focus";
import type { ConversationPreferences } from "../preferences/conversation";
import type { Palette } from "../theme/scenario";
export function ConversationPanel({
  preferences,
  character,
  language,
  paused,
  palette: p,
}: {
  preferences: ConversationPreferences;
  character: string;
  language: string;
  paused: boolean;
  palette: Palette;
}) {
  const microphoneActive = useSyncExternalStore(
    audioFocus.subscribe,
    audioFocus.recording,
    audioFocus.recording,
  );
  const [endpoint, setEndpoint] = useState(""),
    [consent, setConsent] = useState(false),
    [draft, setDraft] = useState(""),
    [turns, setTurns] = useState<Turn[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [connection, setConnection] = useState("Not checked"),
    [checking, setChecking] = useState(false),
    [settingsReady, setSettingsReady] = useState(false);
  const healthRequest = useRef<AbortController | null>(null);
  const pendingMessage = useRef<{ text: string; previous: Turn[] } | null>(
    null,
  );
  const deviceVoices = useDeviceVoices();
  const selectedVoice = voiceFor(deviceVoices.voices, language);
  const client = useRef(new ConversationClient()),
    generation = useRef(0);
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem("walkmate.serverAddress")
      .then((value) => {
        if (mounted && value) {
          try {
            setEndpoint(serverAddress(value));
          } catch {
            setConnection("Saved server address is invalid. Enter a new one.");
          }
        }
      })
      .catch(() => {
        if (mounted) setConnection("Could not load server settings.");
      })
      .finally(() => {
        if (mounted) setSettingsReady(true);
      });
    const current = client.current;
    return () => {
      mounted = false;
      healthRequest.current?.abort();
      current.cancel();
      stopSpeech();
    };
  }, []);
  useEffect(() => {
    if (paused) {
      client.current.cancel();
      stopSpeech();
    }
  }, [paused]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        client.current.cancel();
        stopSpeech();
      }
    });
    return () => subscription.remove();
  }, []);
  async function send() {
    if (busy || paused || microphoneActive || !consent || !draft.trim()) return;
    const token = ++generation.current;
    pendingMessage.current = { text: draft.trim(), previous: turns };
    const next = [
      ...turns,
      { role: "user" as const, content: draft.trim() },
    ].slice(-20);
    setDraft("");
    setTurns(next);
    setBusy(true);
    setError("");
    try {
      const answer = await client.current.reply(
        endpoint,
        character,
        language,
        next,
        fetch,
        preferences,
      );
      if (token !== generation.current) return;
      pendingMessage.current = null;
      setTurns([...next, { role: "assistant", content: answer }]);
      if (!selectedVoice) {
        setError(
          "Reply received as text. No matching device voice is installed.",
        );
        return;
      }
      stopSpeech();
      speakText(answer, {
        rate: preferences.rate,
        voice: selectedVoice.identifier,
        language: selectedVoice.language,
        onError: () =>
          setError("Reply received. Device speech is unavailable."),
      });
    } catch (e) {
      if (token === generation.current) {
        const pending = pendingMessage.current;
        if (pending) {
          setDraft(pending.text);
          setTurns(pending.previous);
          pendingMessage.current = null;
        }
        setError(
          (e instanceof Error ? e.message : "Conversation failed.") +
            " Your message is back in the draft; you can edit and retry.",
        );
      }
    } finally {
      if (token === generation.current) setBusy(false);
    }
  }
  function interrupt() {
    const pending = pendingMessage.current;
    if (pending) {
      setDraft(pending.text);
      setTurns(pending.previous);
      pendingMessage.current = null;
    }
    generation.current++;
    client.current.cancel();
    stopSpeech();
    setBusy(false);
  }
  async function checkConnection() {
    healthRequest.current?.abort();
    const controller = new AbortController();
    healthRequest.current = controller;
    setChecking(true);
    setConnection("Checking server…");
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const result = await serverHealth(endpoint, controller.signal);
      if (healthRequest.current !== controller) return;
      setEndpoint(result.address);
      setConnection(
        `Server reachable · conversation ${result.conversation ? "configured" : "not configured"} · transcription ${result.transcription ? "configured" : "not configured"}. Provider quality is not verified.`,
      );
    } catch (e) {
      if (healthRequest.current === controller)
        setConnection(
          controller.signal.aborted
            ? "Connection check timed out or was cancelled."
            : e instanceof Error
              ? e.message
              : "Could not connect.",
        );
    } finally {
      clearTimeout(timer);
      if (healthRequest.current === controller) setChecking(false);
    }
  }
  async function remember() {
    try {
      const address = serverAddress(endpoint);
      await AsyncStorage.setItem("walkmate.serverAddress", address);
      setEndpoint(address);
      setConnection(
        "Server address saved on this device. Sharing consent is still requested each session.",
      );
    } catch (e) {
      setConnection(
        e instanceof Error ? e.message : "Could not save server address.",
      );
    }
  }
  async function forget() {
    try {
      await AsyncStorage.removeItem("walkmate.serverAddress");
      setEndpoint("");
      setConnection("Saved server address erased.");
    } catch {
      setConnection("Could not erase server address. Try again.");
    }
  }
  return (
    <View
      style={{
        backgroundColor: p.surface,
        padding: 18,
        borderRadius: 16,
        gap: 12,
        marginVertical: 16,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "600", color: p.ink }}>
        Talk with your companion
      </Text>
      <Text style={{ color: p.muted, fontSize: 12, lineHeight: 19 }}>
        Connect your own conversation server. Typed messages and recent replies
        are sent to that server and its configured AI provider. GPS is never
        included. This app keeps the conversation in memory for this session
        only. Provider retention depends on your provider.
      </Text>
      {!consent ? (
        <>
          <TextInput
            accessibilityLabel="Conversation server address"
            placeholder="http://your-computer:8787"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={endpoint}
            onChangeText={(value) => {
              healthRequest.current?.abort();
              healthRequest.current = null;
              setChecking(false);
              setConnection("Not checked");
              setEndpoint(value);
            }}
            editable={settingsReady}
            style={{
              padding: 14,
              borderWidth: 1,
              borderColor: p.line,
              borderRadius: 12,
              color: p.ink,
            }}
          />
          <Action
            p={p}
            label={checking ? "Checking…" : "Check server connection"}
            onPress={() => void checkConnection()}
            disabled={!endpoint.trim() || checking || !settingsReady}
          />
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: p.muted, fontSize: 12, lineHeight: 19 }}
          >
            {connection}
          </Text>
          <Action
            p={p}
            label="Remember server address on this device"
            onPress={() => void remember()}
            disabled={!endpoint.trim() || !settingsReady || checking}
          />
          <Action
            p={p}
            label="Forget saved server address"
            onPress={() => void forget()}
            disabled={!settingsReady || checking}
          />
          <Action
            p={p}
            label="Allow sending this session’s messages"
            onPress={() => {
              try {
                setEndpoint(serverAddress(endpoint));
                setConsent(true);
                setError("");
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Invalid server address.",
                );
              }
            }}
            disabled={!endpoint.trim() || !settingsReady || checking}
          />
          <Text style={{ color: p.muted }}>
            Checking only contacts the server’s health endpoint; no messages or
            GPS are sent. Hosted keys belong on the server, never in this
            address.
          </Text>
        </>
      ) : (
        <>
          <Text style={{ color: p.muted }}>Server: {endpoint}</Text>
          {turns.map((t, i) => (
            <Text key={i} selectable style={{ color: p.ink, lineHeight: 23 }}>
              {t.role === "user" ? "You" : "Companion"}: {t.content}
            </Text>
          ))}
          <MicrophoneInput
            endpoint={endpoint}
            language={language}
            disabled={paused || busy}
            onTranscript={setDraft}
            palette={p}
          />
          <TextInput
            accessibilityLabel="Message your companion"
            placeholder={paused ? "Resume your walk to chat" : "Say something…"}
            value={draft}
            onChangeText={setDraft}
            maxLength={4000}
            multiline
            editable={!paused && !busy && !microphoneActive}
            style={{
              padding: 14,
              borderWidth: 1,
              borderColor: p.line,
              borderRadius: 12,
              color: p.ink,
            }}
          />
          <Action
            p={p}
            label={busy ? "Thinking…" : "Send & hear reply"}
            onPress={() => void send()}
            disabled={busy || paused || microphoneActive || !draft.trim()}
          />
          <Action p={p} label="Interrupt / stop speaking" onPress={interrupt} />
          <Action
            p={p}
            label="Disconnect & erase conversation"
            onPress={() => {
              interrupt();
              setTurns([]);
              setDraft("");
              setConsent(false);
              setError("");
            }}
          />
        </>
      )}
      {!!error && (
        <Text accessibilityLiveRegion="polite" style={{ color: p.accent }}>
          {error}
        </Text>
      )}
      <Text style={{ color: p.muted, fontSize: 11 }}>
        Short voice clips or text input. Stop somewhere safe before reviewing
        your transcript.
      </Text>
    </View>
  );
}

function Action({
  label,
  onPress,
  disabled = false,
  p,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  p: Palette;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={{
        padding: 14,
        backgroundColor: p.wash,
        borderRadius: 12,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ color: p.accent, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}
