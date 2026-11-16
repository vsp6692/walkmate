import { useCallback, useEffect, useState } from "react";
import * as Speech from "expo-speech";
import { type DeviceVoice } from "./voices";
export function useDeviceVoices() {
  const [voices, setVoices] = useState<DeviceVoice[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setVoices(await Speech.getAvailableVoicesAsync());
      setError("");
    } catch {
      setVoices([]);
      setError(
        "Unable to check installed voices. You can still use text chat.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let mounted=true;
    Speech.getAvailableVoicesAsync().then(result=>{if(mounted)setVoices(result);}).catch(()=>{if(mounted)setError("Unable to check installed voices. You can still use text chat.");}).finally(()=>{if(mounted)setLoading(false);});
    return ()=>{mounted=false;};
  }, []);
  return { voices, loading, error, refresh };
}
