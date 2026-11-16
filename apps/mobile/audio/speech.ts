import * as Speech from "expo-speech";
import { audioFocus } from "./focus";
export function stopSpeech() {
  audioFocus.interrupt();
  return Speech.stop();
}
export function speakText(text: string, options: Speech.SpeechOptions = {}) {
  void audioFocus
    .speak(
      () => Speech.stop(),
      () => Speech.speak(text, options),
    )
    .then((played) => {
      if (!played) options.onStopped?.();
    })
    .catch((error) => options.onError?.(error));
}
