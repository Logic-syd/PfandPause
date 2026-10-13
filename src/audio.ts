let context: AudioContext | undefined;

export function unlockAudio(): void {
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume().catch(() => {});
  } catch {
    /* Audio is optional. */
  }
}
export function playSound(
  kind: "pick" | "full" | "win" | "tick" | "correct" | "wrong",
  enabled: boolean,
): void {
  if (!enabled || !context || context.state !== "running") return;
  const notes =
    kind === "win"
      ? [523, 659, 784, 1047]
      : kind === "full"
        ? [659, 880]
        : kind === "correct" ? [659, 880, 1047]
          : kind === "wrong" ? [260, 196]
            : kind === "tick" ? [880] : [540];
  try {
    notes.forEach((frequency, i) => {
      const oscillator = context!.createOscillator();
      const gain = context!.createGain();
      const start = context!.currentTime + i * 0.085;
      oscillator.type = kind === "tick" || kind === "wrong" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(
        0.045,
        start + 0.012,
      );
      gain.gain.exponentialRampToValueAtTime(0.001, start + (kind === "tick" ? 0.07 : 0.16));
      oscillator.connect(gain);
      gain.connect(context!.destination);
      oscillator.start(start);
      oscillator.stop(start + (kind === "tick" ? 0.09 : 0.18));
    });
  } catch {
    // Audio output can fail after a context resumes or the output device changes.
    // An optional sound must never abort a move and leave the board locked.
  }
}

// A quiet, muffled grumble and two foot taps; no speech or countdown alarm.
export function playQueueSound(enabled: boolean, intensity: number): () => void {
  if (!enabled || !context || context.state !== 'running') return () => {};
  const sources: (AudioBufferSourceNode | OscillatorNode)[] = [];
  const nodes: AudioNode[] = [];
  const stop = () => {
    for (const source of sources) { try { source.stop(); } catch { /* Already ended. */ } }
    for (const node of [...sources, ...nodes]) node.disconnect();
  };
  try {
    const start = context.currentTime;
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * .5), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const murmur = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    sources.push(murmur); nodes.push(filter, gain);
    murmur.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = 430;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(intensity === 2 ? .025 : .017, start + .09);
    gain.gain.linearRampToValueAtTime(0, start + .5);
    murmur.connect(filter); filter.connect(gain); gain.connect(context.destination);
    murmur.start(start); murmur.stop(start + .5);
    for (let i = 0; i < 2; i++) {
      const tap = context.createOscillator(), volume = context.createGain();
      sources.push(tap); nodes.push(volume);
      const at = start + .17 + i * .18;
      tap.type = 'triangle'; tap.frequency.setValueAtTime(100, at);
      tap.frequency.exponentialRampToValueAtTime(55, at + .07);
      volume.gain.setValueAtTime(0, at);
      volume.gain.linearRampToValueAtTime(.02, at + .006);
      volume.gain.exponentialRampToValueAtTime(.001, at + .085);
      tap.connect(volume); volume.connect(context.destination);
      tap.start(at); tap.stop(at + .09);
    }
    return stop;
  } catch { stop(); return () => {}; }
}
