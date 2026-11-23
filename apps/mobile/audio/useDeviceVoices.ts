import { useEffect, useState, useSyncExternalStore } from "react";
import * as Speech from "expo-speech";
import { VoiceCatalog } from "./voiceCatalog";
export function useDeviceVoices() {
  const [catalog] = useState(() => new VoiceCatalog(() => Speech.getAvailableVoicesAsync()));
  const state = useSyncExternalStore(catalog.subscribe, catalog.snapshot, catalog.snapshot);
  useEffect(() => {
    catalog.activate();
    void catalog.refresh();
    return () => catalog.dispose();
  }, [catalog]);
  return { ...state, refresh: catalog.refresh };
}
