import { test } from "node:test";
import assert from "node:assert/strict";
import { VictoryVoice, VOICE_DELAY_SECONDS } from "../src/voice";

function fixture(load?: () => Promise<AudioBuffer | null>) {
  const nodes: {
    stopped: boolean;
    disconnected: boolean;
    startAt?: number;
    onended: (() => void) | null;
    buffer?: AudioBuffer;
    connect: () => void;
    disconnect: () => void;
    start: (at: number) => void;
    stop: () => void;
  }[] = [];
  const gains: { disconnected: boolean; volume?: number }[] = [];
  const context = {
    currentTime: 10,
    state: "running",
    destination: {},
    createBufferSource() {
      const source = {
        stopped: false,
        disconnected: false,
        startAt: undefined as number | undefined,
        onended: null as (() => void) | null,
        connect() {},
        disconnect() {
          source.disconnected = true;
        },
        start(at: number) {
          source.startAt = at;
        },
        stop() {
          source.stopped = true;
        },
      };
      nodes.push(source);
      return source;
    },
    createGain() {
      const state = {
        disconnected: false,
        volume: undefined as number | undefined,
      };
      gains.push(state);
      return {
        gain: {
          setValueAtTime(value: number) {
            state.volume = value;
          },
        },
        connect() {},
        disconnect() {
          state.disconnected = true;
        },
      };
    },
  };
  let loads = 0;
  const player = new VictoryVoice(
    () => context as unknown as AudioContext,
    () => {
      loads++;
      return load ? load() : Promise.resolve({ duration: 2.5 } as AudioBuffer);
    },
  );
  return {
    player,
    context,
    nodes,
    gains,
    get loads() {
      return loads;
    },
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

test("English voice starts after the victory chime, with one source and controlled volume", async () => {
  const f = fixture();
  assert.equal(await f.player.play("en", true), true);
  assert.equal(f.nodes.length, 1);
  assert.equal(f.nodes[0].startAt, 10 + VOICE_DELAY_SECONDS);
  assert.equal(f.gains[0].volume, 0.85);
  assert.equal(f.player.active, true);
  f.nodes[0].onended!();
  assert.equal(f.player.active, false);
  assert.equal(f.nodes[0].disconnected, true);
  assert.equal(f.gains[0].disconnected, true);
});
test("Chinese, German, muted, and unavailable audio contexts never load or play the English recording", async () => {
  const f = fixture();
  assert.equal(await f.player.play("de", true), false);
  assert.equal(await f.player.play("zh", true), false);
  assert.equal(await f.player.play("en", false), false);
  assert.equal(f.loads, 0);
  assert.equal(f.nodes.length, 0);
  const player = new VictoryVoice(
    () => undefined,
    () => {
      throw Error("Should not load");
    },
  );
  assert.equal(await player.play("en", true), false);
});
test("leaving or muting while a clip is still loading cancels the late result", async () => {
  const pending = deferred<AudioBuffer | null>();
  const f = fixture(() => pending.promise);
  const playback = f.player.play("en", true);
  f.player.stop();
  pending.resolve({ duration: 2.5 } as AudioBuffer);
  assert.equal(await playback, false);
  assert.equal(f.nodes.length, 0);
});
test("a newer request invalidates older loads and cannot layer two voices", async () => {
  const pending = deferred<AudioBuffer | null>();
  const f = fixture(() => pending.promise);
  const first = f.player.play("en", true);
  const second = f.player.play("en", true);
  pending.resolve({ duration: 2.5 } as AudioBuffer);
  assert.equal(await first, false);
  assert.equal(await second, true);
  assert.equal(f.nodes.length, 1);
  await f.player.play("en", true);
  assert.equal(f.nodes[0].stopped, true);
  assert.equal(f.nodes[0].disconnected, true);
  assert.equal(f.nodes.length, 2);
});
test("switching to German or disabling sound cancels a scheduled or playing clip", async () => {
  const f = fixture();
  await f.player.play("en", true);
  await f.player.play("de", true);
  assert.equal(f.nodes[0].stopped, true);
  assert.equal(f.player.active, false);
  await f.player.play("en", true);
  await f.player.play("en", false);
  assert.equal(f.nodes[1].stopped, true);
  assert.equal(f.player.active, false);
});
test("slow audio loads play at the current time; a suspended context stays silent", async () => {
  const pending = deferred<AudioBuffer | null>();
  const f = fixture(() => pending.promise);
  const playback = f.player.play("en", true);
  f.context.currentTime = 20;
  pending.resolve({ duration: 2.5 } as AudioBuffer);
  await playback;
  assert.equal(f.nodes[0].startAt, 20);
  f.player.stop();
  f.context.state = "suspended";
  assert.equal(await f.player.play("en", true), false);
  assert.equal(f.nodes.length, 1);
});
test("missing or invalid audio fails silently without an unhandled rejection", async () => {
  assert.equal(
    await fixture(() => Promise.resolve(null)).player.play("en", true),
    false,
  );
  assert.equal(
    await fixture(() => Promise.reject(Error("Decode failed"))).player.play(
      "en",
      true,
    ),
    false,
  );
  const f = fixture();
  f.context.createBufferSource = () => {
    throw Error("Unavailable");
  };
  assert.equal(await f.player.play("en", true), false);
  assert.equal(f.player.active, false);
});
