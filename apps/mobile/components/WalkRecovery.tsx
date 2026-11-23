import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { type RecoveryPoint } from "../session/recovery";
import { ActionButton } from "./ActionButton";
import type { Palette } from "../theme/scenario";
import type { SessionTransition } from "../session/transition";
import { RecoveryStore } from "../session/recoveryStore";
const store = new RecoveryStore(AsyncStorage);
export function WalkRecovery({ active, enabled, transition, snapshot, onRestore, palette: p }: {
  active: boolean;
  transition: SessionTransition;
  enabled: boolean;
  snapshot: () => RecoveryPoint;
  onRestore: (point: RecoveryPoint) => void;
  palette: Palette;
}) {
  const [point, setPoint] = useState<RecoveryPoint | null>(null);
  const [busy, setBusy] = useState(true);
  const [readFailed, setReadFailed] = useState(false);
  const [message, setMessage] = useState("");
  const locked = useRef(true);
  useEffect(() => {
    let mounted = true;
    store.load().then(value => {
      if (mounted) setPoint(value);
    }).catch(() => {
      if (mounted) {
        setReadFailed(true);
        setMessage("Could not read your recovery point. Retry loading or explicitly erase it below.");
      }
    }).finally(() => {
      if (mounted) { locked.current = false; setBusy(false); }
    });
    return () => { mounted = false; };
  }, []);
  async function change(action: "save" | "erase" | "restore" | "reload") {
    if (locked.current || !enabled) return;
    if (action === "restore" && !transition.beginRestore()) return;
    locked.current = true;
    setBusy(true);
    try {
      if (action === "reload") {
        setPoint(await store.load());
        setReadFailed(false);
        setMessage("Recovery storage loaded.");
      } else if (action === "save") {
        if (readFailed) return;
        const value = await store.save(snapshot());
        setPoint(value);
        setMessage("Recovery point saved on this device. Save again to update it.");
      } else if (action === "restore") {
        const saved = await store.consume();
        setPoint(null);
        setMessage("Restored paused. Resume when you’re ready.");
        onRestore(saved);
        transition.completeRestore();
      } else {
        await store.erase();
        setReadFailed(false);
        setPoint(null);
        setMessage("Recovery point erased.");
      }
    } catch {
      setMessage("Could not update recovery storage. Nothing was restored; please retry.");
    } finally {
      if (action === "restore") transition.cancelRestore();
      locked.current = false;
      setBusy(false);
    }
  }
  return <View style={{ padding: 18, gap: 8, backgroundColor: p.surface, borderRadius: 16, marginVertical: 12 }}>
    <Text style={{ color: p.ink, fontWeight: "600", fontSize: 17 }}>Walk recovery</Text>
    <Text style={{ color: p.muted, lineHeight: 20 }}>
      Optional: save a recovery point with time, distance and companion on this device.
      No route, destination, audio or chat is saved. This is a manual snapshot, not automatic tracking.
    </Text>
    {point && <Text style={{ color: p.ink }}>
      {point.companion === 0 ? "Maya" : "Arjun"} · {Math.floor(point.seconds / 60)} min · {(point.meters / 1000).toFixed(2)} km
      {"\n"}Saved {new Date(point.savedAt).toLocaleString()}. Restoring excludes time since this save and starts paused with a fresh conversation.
    </Text>}
    {readFailed && <ActionButton label="Retry loading recovery point" onPress={() => void change("reload")} disabled={busy || !enabled} palette={p} secondary />}
    {active && !readFailed && <ActionButton label={point ? "Replace saved recovery point" : "Save a recovery point on this device"} onPress={() => void change("save")} disabled={busy || !enabled} palette={p} secondary />}
    {!active && point && <ActionButton label="Restore saved walk paused" onPress={() => void change("restore")} disabled={busy || !enabled} palette={p} />}
    {(point || readFailed) && <ActionButton label="Erase recovery point" onPress={() => void change("erase")} disabled={busy || !enabled} palette={p} secondary />}
    {!!message && <Text accessibilityLiveRegion="polite" style={{ color: p.muted }}>{message}</Text>}
  </View>;
}
