import React, { useEffect, useState } from "react";
import { Animated, AppState, Platform, StyleSheet, View } from "react-native";
import type { Palette } from "../theme/scenario";

/** Original geometric illustrations. Blinking is decorative, never simulated lip-sync. */
export function CompanionPortrait({ character, paused, reducedMotion, palette: p }: {
  character: string; paused: boolean; reducedMotion: boolean; palette: Palette;
}) {
  const maya = character === "maya";
  const [eyes] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.delay(maya ? 4200 : 5100),
      Animated.timing(eyes, { toValue: 0.12, duration: 90, useNativeDriver: Platform.OS !== "web", isInteraction: false }),
      Animated.timing(eyes, { toValue: 1, duration: 140, useNativeDriver: Platform.OS !== "web", isInteraction: false }),
    ]));
    const update = (state: string | null | undefined) => {
      animation.stop();
      eyes.setValue(1);
      if (!paused && !reducedMotion && state === "active") {
        animation.reset();
        animation.start();
      }
    };
    update(AppState.currentState);
    const listener = AppState.addEventListener("change", update);
    return () => { listener.remove(); animation.stop(); };
  }, [eyes, maya, paused, reducedMotion]);
  const skin = maya ? "#C98A68" : "#AE7454";
  const hair = maya ? "#422C38" : "#2B303B";
  return <View accessible accessibilityRole="image"
    accessibilityLabel={`${maya ? "Maya" : "Arjun"}, original illustrated fictional AI companion`}
    style={styles.canvas}>
    <View style={[styles.hairBack, { backgroundColor: hair, height: maya ? 124 : 84 }]} />
    <View style={[styles.shoulders, { backgroundColor: p.accent }]} />
    <View style={[styles.neck, { backgroundColor: skin }]} />
    <View style={[styles.ear, { left: 27, backgroundColor: skin }]} />
    <View style={[styles.ear, { right: 27, backgroundColor: skin }]} />
    <View style={[styles.face, { backgroundColor: skin }]}>
      <View style={[styles.brow, { left: 15, transform: [{ rotate: "-7deg" }] }]} />
      <View style={[styles.brow, { right: 15, transform: [{ rotate: "7deg" }] }]} />
      <Animated.View style={[styles.eye, { left: 20, transform: [{ scaleY: eyes }] }]} />
      <Animated.View style={[styles.eye, { right: 20, transform: [{ scaleY: eyes }] }]} />
      <View style={styles.nose} />
      {maya && <><View style={[styles.cheek, { left: 8 }]} /><View style={[styles.cheek, { right: 8 }]} /></>}
      <View style={[styles.smile, { width: maya ? 29 : 24, left: maya ? 25 : 28 }]} />
    </View>
    <View style={[styles.fringe, { backgroundColor: hair, height: maya ? 32 : 25, transform: [{ rotate: maya ? "-12deg" : "-5deg" }] }]} />
    {maya ? <View style={[styles.pin, { backgroundColor: "#FFD495" }]} /> :
      <View style={[styles.collar, { borderColor: p.surface }]} />}
  </View>;
}
const styles = StyleSheet.create({
  canvas: { width: 150, height: 160, overflow: "hidden", borderRadius: 70 },
  hairBack: { position: "absolute", top: 14, left: 25, width: 100, borderRadius: 45 },
  shoulders: { position: "absolute", top: 121, left: 9, width: 132, height: 70, borderRadius: 52 },
  neck: { position: "absolute", top: 105, left: 61, width: 28, height: 33, borderRadius: 12 },
  ear: { position: "absolute", top: 65, width: 15, height: 24, borderRadius: 9 },
  face: { position: "absolute", top: 32, left: 35, width: 80, height: 89, borderRadius: 35 },
  fringe: { position: "absolute", top: 19, left: 32, width: 82, borderTopLeftRadius: 42, borderTopRightRadius: 34, borderBottomRightRadius: 28 },
  brow: { position: "absolute", top: 28, width: 17, height: 3, borderRadius: 2, backgroundColor: "#422E2D" },
  eye: { position: "absolute", top: 37, width: 6, height: 9, borderRadius: 4, backgroundColor: "#302A32" },
  nose: { position: "absolute", top: 46, left: 37, width: 7, height: 12, borderRightWidth: 2, borderBottomWidth: 2, borderColor: "#8D543F", borderBottomRightRadius: 5 },
  cheek: { position: "absolute", top: 51, width: 16, height: 8, borderRadius: 8, backgroundColor: "#D89079" },
  smile: { position: "absolute", top: 62, height: 12, borderBottomWidth: 3, borderColor: "#663B35", borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  pin: { position: "absolute", top: 38, right: 27, width: 17, height: 7, borderRadius: 5, transform: [{ rotate: "35deg" }] },
  collar: { position: "absolute", top: 124, left: 57, width: 36, height: 19, borderBottomWidth: 3, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
});
