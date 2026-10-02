import type { Language } from "./i18n";

// Wait until the short four-note victory chime has finished.
export const VOICE_DELAY_SECONDS = 0.48;

export class VictoryVoice {
  private generation = 0;
  private source: AudioBufferSourceNode | undefined;
  private gain: GainNode | undefined;

  constructor(
    private readonly getContext: () => AudioContext | undefined,
    private readonly loadBuffer: () => Promise<AudioBuffer | null>,
  ) {}

  get active(): boolean {
    return this.source !== undefined;
  }

  stop(): void {
    this.generation++;
    const source = this.source;
    const gain = this.gain;
    this.source = undefined;
    this.gain = undefined;
    if (source) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        /* Already ended or not started. */
      }
      source.disconnect();
    }
    gain?.disconnect();
  }

  async play(language: Language, enabled: boolean): Promise<boolean> {
    this.stop();
    const context = this.getContext();
    // There is currently one real, user-supplied English recording. No fake fallback.
    if (!enabled || language !== "en" || !context) return false;
    const request = this.generation;
    const afterChime = context.currentTime + VOICE_DELAY_SECONDS;
    try {
      const buffer = await this.loadBuffer();
      // A closed tutorial, language change, or newer win invalidates late loads.
      if (!buffer || request !== this.generation || context.state !== "running")
        return false;
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      gain.gain.setValueAtTime(0.85, context.currentTime);
      source.connect(gain);
      gain.connect(context.destination);
      this.source = source;
      this.gain = gain;
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
        if (this.source === source) {
          this.source = undefined;
          this.gain = undefined;
        }
      };
      source.start(Math.max(afterChime, context.currentTime));
      return true;
    } catch {
      if (request === this.generation) this.stop();
      // Audio errors must never interrupt the game or produce an unhandled rejection.
      return false;
    }
  }
}
