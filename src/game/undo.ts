import { cloneState } from "./engine";
import type { BottleType, GameEvent, GameState } from "./types";

interface BottleSource {
  sequence: number;
  column: number;
  bottle: BottleType;
}
export interface UndoTrail {
  nextSequence: number;
  buffer: BottleSource[];
  crates: BottleSource[][];
  glass: BottleSource[];
}
export const createUndoTrail = (): UndoTrail => ({
  nextSequence: 0, buffer: [], crates: [[], []], glass: [],
});

// Track individual bottles through automatic transfers. A replaced tray has
// already returned its full batch, so those bottles can never be recalled.
export function advanceUndoTrail(previous: UndoTrail, event: GameEvent): UndoTrail {
  const trail = structuredClone(previous);
  if (event.kind === "replace") trail.crates[event.index] = [];
  if (event.kind !== "move") return trail;
  let source: BottleSource;
  if (event.from.kind === "column") {
    source = { sequence: trail.nextSequence++, column: event.from.index, bottle: event.bottle };
  } else if (event.from.kind === "buffer") {
    source = trail.buffer.splice(event.from.index, 1)[0];
  } else {
    return trail;
  }
  if (event.to.kind === "buffer") trail.buffer.push(source);
  if (event.to.kind === "crate") trail.crates[event.to.index].push(source);
  if (event.to.kind === "bin") trail.glass.push(source);
  return trail;
}

export function canUndoBottle(state: GameState, trail: UndoTrail): boolean {
  return state.status === "playing" &&
    (trail.buffer.length > 0 || trail.crates.some(crate => crate.length > 0) || trail.glass.length > 0);
}

export function undoPendingBottle(previous: GameState, previousTrail: UndoTrail):
  { state: GameState; trail: UndoTrail } | null {
  if (!canUndoBottle(previous, previousTrail)) return null;
  const state = cloneState(previous);
  const trail = structuredClone(previousTrail);
  let source: BottleSource;
  if (trail.buffer.length) {
    // Spare spots are the player's escape route, even when the last action
    // completed a different batch. Do not rewind the return machine's queue.
    source = trail.buffer.pop()!;
    state.buffer.pop();
  } else {
    const candidates = trail.crates.flatMap((crate, slot) =>
      crate.map((bottle, index) => ({ bottle, slot, index })),
    ).concat(trail.glass.map((bottle, index) => ({ bottle, slot: -1, index })));
    const latest = candidates.reduce((a, b) => a.bottle.sequence > b.bottle.sequence ? a : b);
    source = latest.bottle;
    if (latest.slot < 0) {
      trail.glass.splice(latest.index, 1);
      state.recycled.splice(latest.index, 1);
    } else {
      trail.crates[latest.slot].splice(latest.index, 1);
      state.crates[latest.slot]!.count--;
    }
  }
  state.columns[source.column].unshift(source.bottle);
  state.moves--;
  return { state, trail };
}
