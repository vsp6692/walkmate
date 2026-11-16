import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import { speakText, stopSpeech } from "../../audio/speech";
import AsyncStorage from "@react-native-async-storage/async-storage";
import maya from "../../../../characters/maya.json";
import arjun from "../../../../characters/arjun.json";
import { SessionClock } from "../../session/clock";
import { evaluateFix } from "../../session/location";
import {
  places,
  scenario,
  type Place,
  type Palette,
} from "../../theme/scenario";
import { ConversationPanel } from "../../components/ConversationPanel";
import { ActionButton } from "../../components/ActionButton";
import { useDeviceVoices } from "../../audio/useDeviceVoices";
import { voiceFor } from "../../audio/voices";
import { WalkHistory } from "../../components/WalkHistory";
import type { WalkSummary } from "../../session/history";
import { durations, type WalkDuration } from "../../adventures/plans";
import { AdventurePanel } from "../../components/AdventurePanel";
import { DestinationPicker } from "../../components/DestinationPicker";
import { DestinationProgress } from "../../components/DestinationProgress";
import type { Destination, Coordinate } from "../../maps/destination";
import { ConversationSettings } from "../../components/ConversationSettings";
import {
  defaultConversation,
  conversationPreferences,
} from "../../preferences/conversation";
const companions = [maya, arjun];
const activities = [
  {
    icon: "↗",
    name: "Walking outdoors",
    detail: "A little fresh air, a little company",
  },
  { icon: "✳", name: "Working out", detail: "Find your rhythm together" },
  { icon: "☁", name: "Relaxing", detail: "No destination needed" },
  {
    icon: "✦",
    name: "Virtual adventure",
    detail: "Let your imagination wander",
  },
];
export default function App() {
  const [selected, setSelected] = useState(0),
    [activity, setActivity] = useState(0),
    [language, setLanguage] = useState("English");
  const [mode, setMode] = useState("Audio"),
    [active, setActive] = useState(false),
    [paused, setPaused] = useState(false),
    [seconds, setSeconds] = useState(0),
    [meters, setMeters] = useState(0),
    [summary, setSummary] = useState(false),
    [gps, setGps] = useState("GPS is off"),
    [speaking, setSpeaking] = useState(false),
    [ready, setReady] = useState(false);
  const sessionClock = useRef(new SessionClock()),
    subscription = useRef<Location.LocationSubscription | null>(null),
    previous = useRef<Location.LocationObject | null>(null),
    generation = useRef(0);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [position, setPosition] = useState<Coordinate | null>(null);
  const [preferenceError, setPreferenceError] = useState("");
  const [preferences, setPreferences] = useState(defaultConversation);
  const [duration, setDuration] = useState<WalkDuration>(0);
  const [finishedWalk, setFinishedWalk] = useState<WalkSummary | null>(null);
  const [pulse] = useState(() => new Animated.Value(1));
  const companion = companions[selected];
  const deviceVoices = useDeviceVoices();
  const selectedVoice = voiceFor(deviceVoices.voices, language);
  const [place, setPlace] = useState<Place>("Neighborhood");
  const scene = scenario(selected, activity, place);
  const { width, fontScale } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const compact = width < 390 || fontScale > 1.25;
  const s = makeStyles(scene.palette, compact);
  useEffect(() => {
    AsyncStorage.getItem("preferences")
      .then((raw) => {
        if (raw) {
          const p = JSON.parse(raw);
          setSelected(p.selected === 1 ? 1 : 0);
          setPreferences(conversationPreferences(p.conversation));
          if (durations.includes(p.duration)) setDuration(p.duration);
          if (places.includes(p.place)) setPlace(p.place);
          setActivity([0, 1, 2, 3].includes(p.activity) ? p.activity : 0);
          setLanguage(
            p.language === "Tamil · experimental" ? p.language : "English",
          );
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
    return () => {
      // Invalidate pending location requests using the latest generation at unmount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      subscription.current?.remove();
      stopSpeech();
    };
  }, []);
  useEffect(() => {
    if (ready)
      AsyncStorage.setItem(
        "preferences",
        JSON.stringify({
          selected,
          activity,
          language,
          place,
          duration,
          conversation: preferences,
        }),
      ).catch(() =>
        setPreferenceError("Preferences could not be saved on this device."),
      );
  }, [selected, activity, language, place, duration, preferences, ready]);
  useEffect(() => {
    if (!active || paused) return;
    const tick = () => {
      setSeconds(
        Math.floor(sessionClock.current.read(performance.now()) / 1000),
      );
      if (previous.current && Date.now() - previous.current.timestamp > 15000) {
        previous.current = null;
        setPosition(null);
        setGps("Waiting for a fresh GPS signal");
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active, paused]);
  useEffect(() => {
    if (reducedMotion || !active || paused) {
      pulse.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, reducedMotion, active, paused]);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      previous.current = null;
      setPosition(null);
      if (state !== "active") {
        stopSpeech();
        setSpeaking(false);
      }
    });
    return () => listener.remove();
  }, []);
  async function track() {
    const token = ++generation.current;
    setGps("Requesting location…");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (token !== generation.current) return;
      if (permission.status !== "granted") {
        setGps("Location declined · timer only");
        return;
      }
      const watch = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5,
          timeInterval: 3000,
        },
        (point) => {
          if (
            token !== generation.current ||
            AppState.currentState !== "active"
          )
            return;
          const fix = evaluateFix(previous.current, point, Date.now());
          if (!fix.accepted) {
            setPosition(null);
            setGps("Waiting for an accurate, fresh GPS signal");
            return;
          }
          setPosition({
            latitude: point.coords.latitude,
            longitude: point.coords.longitude,
          });
          setGps("GPS active · foreground only");
          setMeters((value) => value + fix.meters);
          previous.current = point;
        },
      );
      if (token !== generation.current) watch.remove();
      else subscription.current = watch;
    } catch {
      if (token === generation.current) setGps("GPS unavailable · timer only");
    }
  }
  function stopTracking() {
    generation.current++;
    subscription.current?.remove();
    subscription.current = null;
    previous.current = null;
    setPosition(null);
  }
  function begin() {
    stopSpeech();
    setSpeaking(false);
    stopTracking();
    sessionClock.current.start(performance.now());
    setSeconds(0);
    setMeters(0);
    setPaused(false);
    setSummary(false);
    setFinishedWalk(null);
    setActive(true);
    setMode("Audio");
    if (activity === 0) void track();
  }
  function pause() {
    stopSpeech();
    setSpeaking(false);
    if (paused) {
      sessionClock.current.resume(performance.now());
      setPaused(false);
      if (activity === 0) void track();
    } else {
      sessionClock.current.pause(performance.now());
      setSeconds(
        Math.floor(sessionClock.current.read(performance.now()) / 1000),
      );
      setPaused(true);
      stopTracking();
      setGps("GPS paused");
    }
  }
  function finish() {
    setSeconds(
      Math.floor(sessionClock.current.finish(performance.now()) / 1000),
    );
    setFinishedWalk({
      id: Date.now().toString(),
      finishedAt: new Date().toISOString(),
      companion: companion.name,
      activity: activities[activity].name,
      seconds: Math.floor(sessionClock.current.read(performance.now()) / 1000),
      meters,
    });
    stopTracking();
    stopSpeech();
    setSpeaking(false);
    setDestination(null);
    setPosition(null);
    setActive(false);
    setSummary(true);
  }
  function preview() {
    if (speaking) {
      stopSpeech();
      setSpeaking(false);
      return;
    }
    if (!selectedVoice) return;
    setSpeaking(true);
    speakText(
      language === "English"
        ? companion.greeting
        : "வணக்கம்! நான் உங்கள் கற்பனை AI நடைத் துணை. இன்று எப்படி இருக்கிறீர்கள்?",
      {
        voice: selectedVoice.identifier,
        language: selectedVoice.language,
        rate: preferences.rate,
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      },
    );
  }
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={s.page}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={s.header}>
            <View style={s.brand}>
              <Text style={s.logo}>w.</Text>
              <Text style={s.brandText}>walkmate</Text>
            </View>
            <View style={s.badge}>
              <Text style={s.badgeText}>
                ✦ A little company goes a long way
              </Text>
            </View>
          </View>
          {active ? (
            <>
              <Text style={s.eyebrow}>YOUR TIME, TOGETHER</Text>
              <Text style={s.title}>
                {paused ? "Take a breather." : "One step at a time."}
              </Text>
              <Text style={s.subtitle}>
                With {companion.name} · {activities[activity].name}
              </Text>
              <View style={s.session}>
                <Animated.View
                  style={[
                    s.avatar,
                    {
                      backgroundColor: selected === 0 ? "#F8CFBA" : "#C2D9EF",
                      transform: [{ scale: pulse }],
                    },
                  ]}
                >
                  <Text style={{ fontSize: 72 }}>
                    {mode === "Audio" ? "♫" : companion.emoji}
                  </Text>
                </Animated.View>
                <Text style={s.cardTitle}>
                  {mode === "Audio"
                    ? "Enjoy the world around you."
                    : `${companion.name} is here.`}
                </Text>
                <Text style={s.muted}>
                  {paused
                    ? "Session paused"
                    : "Connect your server below to start a conversation"}
                </Text>
                <View style={s.stats}>
                  <View>
                    <Text style={s.number}>
                      {Math.floor(seconds / 60)
                        .toString()
                        .padStart(2, "0")}
                      :{(seconds % 60).toString().padStart(2, "0")}
                    </Text>
                    <Text style={s.muted}>ELAPSED</Text>
                  </View>
                  <View>
                    <Text style={s.number}>{(meters / 1000).toFixed(2)}</Text>
                    <Text style={s.muted}>KILOMETRES</Text>
                  </View>
                </View>
                <Text style={s.muted}>
                  {activity === 0
                    ? gps
                    : "Location tracking is off for this activity"}
                </Text>
              </View>
              <View style={s.row}>
                {["Audio", "Avatar"].map((x) => (
                  <Pressable
                    key={x}
                    onPress={() => setMode(x)}
                    style={[s.chip, mode === x && s.chipSelected]}
                  >
                    <Text>
                      {x === "Audio" ? "♫" : "◉"} {x}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {(duration > 0 || activity === 3) && (
                <AdventurePanel
                  rate={preferences.rate}
                  seconds={seconds}
                  duration={duration}
                  virtual={activity === 3}
                  paused={paused}
                  palette={scene.palette}
                />
              )}
              {activity === 0 && destination && (
                <DestinationProgress
                  destination={destination}
                  position={position}
                  paused={paused}
                  palette={scene.palette}
                />
              )}
              <ConversationPanel
                preferences={preferences}
                character={companion.id}
                language={language}
                paused={paused}
                palette={scene.palette}
              />
              <ActionButton
                palette={scene.palette}
                label={paused ? "Resume session" : "Pause session"}
                onPress={pause}
              />
              <ActionButton
                palette={scene.palette}
                label="Finish session"
                onPress={finish}
                secondary
              />
              <Text style={s.note}>
                Keep your attention on your surroundings. This starter tracks
                location only while the app is open.
              </Text>
            </>
          ) : summary ? (
            <>
              <Text style={s.eyebrow}>A LITTLE TIME WELL SPENT</Text>
              <Text style={s.title}>You showed up.</Text>
              <View style={s.session}>
                <Text style={{ fontSize: 64 }}>🌿</Text>
                <Text style={s.cardTitle}>Every little journey counts.</Text>
                <Text style={s.subtitle}>
                  {Math.floor(seconds / 60)} minutes, {seconds % 60} seconds ·{" "}
                  {(meters / 1000).toFixed(2)} km
                </Text>
                <Text style={s.muted}>
                  Save a summary below if you’d like to keep this walk. Unsaved
                  session data stays in memory only.
                </Text>
              </View>
              <ActionButton
                palette={scene.palette}
                label="Back to your companions"
                onPress={() => setSummary(false)}
              />
            </>
          ) : (
            <>
              <Text style={s.eyebrow}>
                YOUR WALK. YOUR WORLD. YOUR COMPANION.
              </Text>
              <Text style={s.title}>
                Good company.{"\n"}Great little adventures.
              </Text>
              <Text style={s.subtitle}>
                Turn a little time for yourself into something to look forward
                to.
              </Text>
              <View style={s.hero}>
                <View style={{ flex: 1 }}>
                  <Text style={s.heroTag}>{scene.label.toUpperCase()}</Text>
                  <Text style={s.heroTitle}>{scene.title}</Text>
                  <Text style={s.heroDetail}>
                    No goals to chase. Just a friend, a path, and you.
                  </Text>
                </View>
                <Text style={s.heroArt}>{scene.symbol}</Text>
              </View>
              <View style={s.sectionHeading}>
                <Text style={s.sectionTitle}>01 Find your walking mate</Text>
                <Text style={s.muted}>Fictional AI companions</Text>
              </View>
              <View style={s.cards}>
                {companions.map((c, i) => (
                  <Pressable
                    key={c.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: selected === i }}
                    onPress={() => setSelected(i)}
                    style={[s.card, selected === i && s.selectedCard]}
                  >
                    <View
                      style={[
                        s.portrait,
                        { backgroundColor: i === 0 ? "#F8CFBA" : "#C2D9EF" },
                      ]}
                    >
                      <Text style={s.characterEmoji}>{c.emoji}</Text>
                      <View style={s.selection}>
                        <Text>{selected === i ? "✓" : "○"}</Text>
                      </View>
                    </View>
                    <Text style={s.cardTitle}>{c.name}</Text>
                    <Text style={s.muted}>{c.role}</Text>
                    <Text style={s.cardDescription}>
                      {i === 0
                        ? "A curious mind. A contagious laugh. Always a story to share."
                        : "A steady pace. A little encouragement. Your next adventure awaits."}
                    </Text>
                    <Text style={s.tag}>
                      {i === 0
                        ? "PLAYFUL  ·  CURIOUS"
                        : "UPLIFTING  ·  OUTDOORSY"}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={s.sectionTitle}>02 What feels good today?</Text>
              <View style={s.activities}>
                {activities.map((item, i) => (
                  <Pressable
                    key={item.name}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: activity === i }}
                    onPress={() => setActivity(i)}
                    style={[s.activity, activity === i && s.selectedCard]}
                  >
                    <Text style={s.activityIcon}>{item.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.activityTitle}>{item.name}</Text>
                      <Text style={s.muted}>{item.detail}</Text>
                    </View>
                    <Text>{activity === i ? "●" : "○"}</Text>
                  </Pressable>
                ))}
              </View>
              {activity === 0 && (
                <View style={s.settings}>
                  <Text style={s.activityTitle}>Set the scene</Text>
                  <Text style={s.muted}>
                    Choose the surroundings for your walk.
                  </Text>
                  <View style={s.row}>
                    {places.map((value) => (
                      <Pressable
                        key={value}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: place === value }}
                        onPress={() => setPlace(value)}
                        style={[s.chip, place === value && s.chipSelected]}
                      >
                        <Text style={s.secondaryText}>{value}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
              <View style={s.settings}>
                <Text style={s.activityTitle}>How much time is yours?</Text>
                <Text style={s.muted}>
                  Choose a gentle time goal, or leave it open.
                </Text>
                <View style={s.row}>
                  {durations.map((value) => (
                    <Pressable
                      key={value}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: duration === value }}
                      onPress={() => setDuration(value)}
                      style={[s.chip, duration === value && s.chipSelected]}
                    >
                      <Text style={s.secondaryText}>
                        {value === 0 ? "Free walk" : `${value} min`}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {activity === 3 && (
                  <Text style={s.muted}>
                    The Lantern Post: an original fictional story, with four
                    chapters unlocked over 15 minutes. English text and optional
                    device narration.
                  </Text>
                )}
              </View>
              {activity === 0 && (
                <DestinationPicker
                  value={destination}
                  onChange={setDestination}
                  palette={scene.palette}
                />
              )}
              <Text style={s.sectionTitle}>03 Make it your own</Text>
              <ConversationSettings
                value={preferences}
                onChange={setPreferences}
                palette={scene.palette}
              />
              <View style={s.settings}>
                <Text style={s.activityTitle}>Conversation language</Text>
                <View style={s.row}>
                  {["English", "Tamil · experimental"].map((x) => (
                    <Pressable
                      key={x}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: language === x }}
                      onPress={() => {
                        stopSpeech();
                        setSpeaking(false);
                        setLanguage(x);
                      }}
                      style={[s.chip, language === x && s.chipSelected]}
                    >
                      <Text>{x}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={s.muted}>
                  Tamil is experimental. An installed voice enables previews,
                  not verified multilingual conversation.
                </Text>
                <ActionButton
                  palette={scene.palette}
                  secondary
                  label={
                    speaking
                      ? "■ Stop voice preview"
                      : "▷ Meet your companion · voice preview"
                  }
                  onPress={preview}
                  disabled={!speaking && !selectedVoice}
                />
                <Text style={s.muted}>
                  {deviceVoices.loading
                    ? "Checking device voices…"
                    : selectedVoice
                      ? "Device voice available. Full voice conversation still requires speech recognition and a configured provider."
                      : "No matching device voice found. Install a voice in device settings, then refresh. Text chat remains available."}
                </Text>
                {!!deviceVoices.error && (
                  <Text style={s.muted}>{deviceVoices.error}</Text>
                )}
                <ActionButton
                  palette={scene.palette}
                  secondary
                  label="Refresh installed voices"
                  onPress={() => void deviceVoices.refresh()}
                  disabled={deviceVoices.loading}
                />
              </View>
              <ActionButton
                palette={scene.palette}
                label={`Let’s go with ${companion.name}   ↗`}
                onPress={begin}
                disabled={!ready}
              />
              <Text style={s.note}>
                Walk without an account. AI chat and voice transcription require
                your configured server. Recording starts only when you choose
                it; audio upload is a separate action.
              </Text>
            </>
          )}
          {!active && (
            <WalkHistory
              candidate={summary ? finishedWalk : null}
              palette={scene.palette}
            />
          )}
          {!!preferenceError && (
            <Text accessibilityLiveRegion="polite" style={s.note}>
              {preferenceError}
            </Text>
          )}
          <View style={s.footer}>
            <Text style={s.brandText}>walkmate</Text>
            <Text style={s.muted}>
              Free & open source. A little more human time.
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={active}
              style={{
                minHeight: 44,
                justifyContent: "center",
                opacity: active ? 0.45 : 1,
              }}
              onPress={async () => {
                try {
                  await AsyncStorage.removeItem("preferences");
                } catch {
                  setPreferenceError(
                    "Could not reset saved preferences. Try again.",
                  );
                  return;
                }
                setPreferenceError("");
                setSelected(0);
                setDuration(0);
                setPreferences(defaultConversation);
                setDestination(null);
                setPlace("Neighborhood");
                setActivity(0);
                setLanguage("English");
              }}
            >
              <Text style={s.reset}>
                {active
                  ? "Finish session to reset preferences"
                  : "Reset preferences"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const makeStyles = (p: Palette, compact: boolean) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: p.background },
    page: {
      width: "100%",
      maxWidth: 880,
      alignSelf: "center",
      padding: compact ? 16 : 24,
      paddingBottom: 35,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 48,
      flexWrap: "wrap",
      gap: 16,
    },
    brand: { flexDirection: "row", alignItems: "center", gap: 10 },
    logo: {
      backgroundColor: p.accent,
      fontWeight: "900",
      fontSize: 27,
      paddingHorizontal: 10,
      borderRadius: 12,
      color: "#FFFFFF",
    },
    brandText: {
      fontSize: 23,
      fontWeight: "800",
      color: p.ink,
      letterSpacing: -1,
    },
    badge: { padding: 10, borderRadius: 20, backgroundColor: p.wash },
    badgeText: { fontSize: 11, color: p.muted },
    eyebrow: {
      color: p.accent,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 2,
      marginBottom: 16,
    },
    title: {
      fontSize: compact ? 34 : 43,
      fontWeight: "700",
      letterSpacing: -2,
      color: p.ink,
      lineHeight: compact ? 40 : 48,
    },
    subtitle: {
      fontSize: 16,
      lineHeight: 25,
      color: p.muted,
      marginTop: 16,
      marginBottom: 26,
    },
    hero: {
      backgroundColor: p.wash,
      padding: 26,
      borderRadius: 22,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 36,
    },
    heroTag: {
      fontSize: 9,
      letterSpacing: 1.5,
      color: p.accent,
      fontWeight: "700",
    },
    heroTitle: {
      fontSize: 23,
      lineHeight: 30,
      fontWeight: "600",
      color: p.ink,
      marginVertical: 15,
    },
    heroDetail: { fontSize: 12, lineHeight: 20, color: p.muted },
    heroArt: { fontSize: compact ? 48 : 86, color: p.accent },
    sectionHeading: {
      flexDirection: "row",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 15,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: p.ink,
      marginBottom: 16,
    },
    cards: {
      flexDirection: compact ? "column" : "row",
      gap: 14,
      marginBottom: 32,
    },
    card: {
      flex: 1,
      padding: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: p.line,
      backgroundColor: p.surface,
    },
    selectedCard: { borderColor: p.accent, backgroundColor: p.wash },
    portrait: {
      height: 150,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    characterEmoji: { fontSize: 77 },
    selection: {
      position: "absolute",
      top: 10,
      right: 10,
      backgroundColor: p.surface,
      borderRadius: 15,
      width: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    cardTitle: {
      fontSize: 23,
      fontWeight: "600",
      color: p.ink,
      marginBottom: 5,
    },
    muted: { fontSize: 13, color: p.muted, lineHeight: 18 },
    cardDescription: {
      fontSize: 12,
      color: p.muted,
      lineHeight: 19,
      marginVertical: 12,
    },
    tag: { fontSize: 10, letterSpacing: 1, color: p.accent, fontWeight: "700" },
    activities: { gap: 10, marginBottom: 30 },
    activity: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: p.line,
      borderRadius: 14,
      backgroundColor: p.surface,
    },
    activityIcon: { fontSize: 28, color: p.accent, width: 34 },
    activityTitle: {
      fontSize: 14,
      color: p.ink,
      fontWeight: "600",
      marginBottom: 4,
    },
    settings: {
      padding: 20,
      borderRadius: 16,
      backgroundColor: p.wash,
      marginBottom: 24,
      gap: 10,
    },
    row: {
      flexDirection: "row",
      gap: 10,
      marginVertical: 12,
      flexWrap: "wrap",
    },
    chip: {
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderWidth: 1,
      borderColor: p.line,
      borderRadius: 24,
      backgroundColor: p.surface,
    },
    chipSelected: { backgroundColor: p.wash, borderColor: p.accent },
    primary: {
      backgroundColor: p.accent,
      padding: 19,
      borderRadius: 14,
      alignItems: "center",
      marginVertical: 6,
    },
    primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
    secondary: {
      padding: 15,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: p.line,
      alignItems: "center",
      marginVertical: 6,
    },
    secondaryText: { color: p.accent, fontSize: 13, fontWeight: "600" },
    note: {
      fontSize: 11,
      lineHeight: 18,
      textAlign: "center",
      color: p.muted,
      marginTop: 12,
    },
    footer: {
      marginTop: 40,
      borderTopWidth: 1,
      borderColor: p.line,
      paddingTop: 24,
      gap: 8,
    },
    reset: {
      fontSize: 11,
      color: p.accent,
      textDecorationLine: "underline",
      marginTop: 6,
    },
    session: {
      padding: 30,
      backgroundColor: p.wash,
      borderRadius: 24,
      alignItems: "center",
      gap: 14,
      marginBottom: 20,
    },
    avatar: {
      width: 160,
      height: 160,
      borderRadius: 80,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    stats: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: compact ? 24 : 55,
      marginVertical: 20,
    },
    number: { fontSize: 37, color: p.ink, fontWeight: "600" },
  });
