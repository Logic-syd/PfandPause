import { VictoryVoice } from "./voice";
import type { Language } from "./i18n";

let context: AudioContext | undefined;
let winBuffer: Promise<AudioBuffer | null> | undefined;
const winVoiceUrl = new URL("./assets/voice/win-en.mp3", import.meta.url).href;

function loadWinBuffer(): Promise<AudioBuffer | null> {
  const audioContext = context;
  if (!audioContext) return Promise.resolve(null);
  winBuffer ??= fetch(winVoiceUrl)
    .then((response) => (response.ok ? response.arrayBuffer() : null))
    .then((bytes) => (bytes ? audioContext.decodeAudioData(bytes) : null))
    .catch(() => null);
  return winBuffer;
}
const victoryVoice = new VictoryVoice(() => context, loadWinBuffer);
export const stopVoice = (): void => victoryVoice.stop();
export const playWinVoice = (
  language: Language,
  enabled: boolean,
): Promise<boolean> => victoryVoice.play(language, enabled);

export function unlockAudio(): void {
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume().catch(() => {});
    void loadWinBuffer();
  } catch {
    /* Audio is optional. */
  }
}
export function playSound(
  kind: "pick" | "full" | "win",
  enabled: boolean,
): void {
  if (!enabled || !context || context.state !== "running") return;
  const notes =
    kind === "win"
      ? [523, 659, 784, 1047]
      : kind === "full"
        ? [659, 880]
        : [540];
  notes.forEach((frequency, i) => {
    const oscillator = context!.createOscillator();
    const gain = context!.createGain();
    const start = context!.currentTime + i * 0.085;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(
      victoryVoice.active ? 0.012 : 0.045,
      start + 0.012,
    );
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
    oscillator.connect(gain);
    gain.connect(context!.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.18);
  });
}
