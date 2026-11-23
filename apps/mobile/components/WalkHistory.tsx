import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WalkSummary } from "../session/history";
import { HistoryStore } from "../session/historyStore";
import { ActionButton } from "./ActionButton";
import type { Palette } from "../theme/scenario";
const store = new HistoryStore(AsyncStorage);
export function WalkHistory({
  candidate,
  palette: p,
}: {
  candidate: WalkSummary | null;
  palette: Palette;
}) {
  const [items, setItems] = useState<WalkSummary[]>([]),
    [busy, setBusy] = useState(true),
    [message, setMessage] = useState(""),
    [confirm, setConfirm] = useState(false);
  const locked = useRef(true);
  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => {
    let mounted = true;
    store.load()
      .then((items) => {
        if (mounted) setItems(items);
      })
      .catch(() => {
        if (mounted) {
          setLoadFailed(true);
          setMessage("Could not read saved walks. Retry loading, or explicitly erase them to start over.");
        }
      })
      .finally(() => {
        if (mounted) { locked.current = false; setBusy(false); }
      });
    return () => {
      mounted = false;
    };
  }, []);
  async function save() {
    if (locked.current || loadFailed || !candidate) return;
    locked.current = true;
    setBusy(true);
    try {
      const next = await store.save(candidate);
      setItems(next);
      setMessage("Saved on this device.");
    } catch {
      setMessage("Could not save. Please try again.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function erase() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      await store.erase();
      setLoadFailed(false);
      setItems([]);
      setConfirm(false);
      setMessage("Saved walks erased.");
    } catch {
      setMessage("Could not erase. Please try again.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function reload() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      setItems(await store.load());
      setLoadFailed(false);
      setMessage("Saved walks loaded.");
    } catch {
      setLoadFailed(true);
      setMessage("Could not read saved walks. Existing data was left unchanged.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  const saved = candidate && items.some((x) => x.id === candidate.id);
  return (
    <View
      style={{
        padding: 20,
        borderRadius: 16,
        backgroundColor: p.surface,
        borderWidth: 1,
        borderColor: p.line,
        gap: 12,
        marginTop: 24,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "600", color: p.ink }}>
        Your little journeys
      </Text>
      <Text style={{ fontSize: 12, lineHeight: 19, color: p.muted }}>
        Only walks you choose to save stay on this device. Saves include date,
        companion, activity, time and distance. No GPS routes, recordings or
        conversations. Up to 50 walks.
      </Text>
      {loadFailed && <ActionButton label="Retry loading saved walks" onPress={() => void reload()} disabled={busy} palette={p} secondary />}
      {candidate &&
        !loadFailed &&
        !saved &&
        <ActionButton label="Save this walk on my device" onPress={() => void save()} disabled={busy} palette={p} secondary />}
      {saved && <Text style={{ color: p.muted }}>This walk is saved.</Text>}
      {!loadFailed && items.length === 0 && (
        <Text style={{ color: p.muted }}>No saved walks yet.</Text>
      )}
      {items.map((item) => (
        <View
          key={item.id}
          style={{
            paddingVertical: 10,
            borderTopWidth: 1,
            borderColor: p.line,
          }}
        >
          <Text style={{ color: p.ink, fontWeight: "600" }}>
            {item.activity} with {item.companion}
          </Text>
          <Text style={{ color: p.muted, marginTop: 5 }}>
            {new Date(item.finishedAt).toLocaleDateString()} ·{" "}
            {Math.floor(item.seconds / 60)}m {item.seconds % 60}s ·{" "}
            {(item.meters / 1000).toFixed(2)} km
          </Text>
        </View>
      ))}
      {(items.length > 0 || loadFailed) &&
        (confirm ? (
          <>
            <ActionButton label="Confirm erase all saved walks" onPress={() => void erase()} disabled={busy} palette={p} secondary />
            <ActionButton label="Keep my walks" onPress={() => setConfirm(false)} disabled={busy} palette={p} secondary />
          </>
        ) : (
          <ActionButton label="Erase saved walks" onPress={() => setConfirm(true)} disabled={busy} palette={p} secondary />
        ))}
      {!!message && (
        <Text accessibilityLiveRegion="polite" style={{ color: p.muted }}>
          {message}
        </Text>
      )}
    </View>
  );
}
