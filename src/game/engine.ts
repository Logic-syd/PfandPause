import {
  bottleTypes,
  type BottleType,
  type GameState,
  type Level,
  type Frame,
  type GameEvent,
  type Transition,
} from "./types";
export const cloneState = (state: GameState): GameState =>
  structuredClone(state);
export function validateLevel(level: Level): void {
  if (
    !Number.isInteger(level.id) ||
    level.id < 1 ||
    !level.columns.length ||
    !level.orders.length
  )
    throw new Error("Invalid level");
  const bottles = level.columns.flat();
  if ([...bottles, ...level.orders].some((t) => !bottleTypes.includes(t)))
    throw new Error("Unknown bottle type");
  for (const type of bottleTypes) {
    if (
      bottles.filter((t) => t === type).length !==
      level.orders.filter((t) => t === type).length * 3
    )
      throw new Error(`Unbalanced level ${level.id}: ${type}`);
  }
}
export function createGame(level: Level): GameState {
  validateLevel(level);
  return {
    columns: structuredClone(level.columns),
    buffer: [],
    crates: [0, 1].map((i) =>
      level.orders[i] ? { type: level.orders[i], count: 0, order: i } : null,
    ),
    orders: [...level.orders],
    nextOrder: Math.min(2, level.orders.length),
    completed: 0,
    moves: 0,
    status: "playing",
  };
}
// A fuller matching crate wins; equal fill uses the left slot.
export function chooseCrate(state: GameState, type: BottleType): number {
  let best = -1;
  state.crates.forEach((crate, i) => {
    if (
      crate?.type === type &&
      crate.count < 3 &&
      (best < 0 || crate.count > state.crates[best]!.count)
    )
      best = i;
  });
  return best;
}
export function takeBottle(previous: GameState, column: number): Transition {
  if (
    previous.status !== "playing" ||
    !Number.isInteger(column) ||
    !previous.columns[column]?.length
  )
    return { state: previous, frames: [] };
  const state = cloneState(previous);
  const frames: Frame[] = [];
  const record = (event: GameEvent) =>
    frames.push({ state: cloneState(state), event });
  state.moves++;
  const bottle = state.columns[column].shift()!;
  const destination = chooseCrate(state, bottle);
  if (destination >= 0) state.crates[destination]!.count++;
  else state.buffer.push(bottle);
  record({
    kind: "move",
    bottle,
    from: { kind: "column", index: column },
    to: {
      kind: destination >= 0 ? "crate" : "buffer",
      index: destination >= 0 ? destination : state.buffer.length - 1,
    },
  });
  // Drain to a fixed point before checking loss. A full crate is replaced immediately,
  // then buffered bottles are reconsidered against the new pair of crates.
  while (true) {
    const full = state.crates.findIndex((c) => c?.count === 3);
    if (full >= 0) {
      record({ kind: "full", index: full });
      state.completed++;
      state.crates[full] =
        state.nextOrder < state.orders.length
          ? {
              type: state.orders[state.nextOrder],
              count: 0,
              order: state.nextOrder++,
            }
          : null;
      record({ kind: "replace", index: full });
      continue;
    }
    const bufferIndex = state.buffer.findIndex(
      (t) => chooseCrate(state, t) >= 0,
    );
    if (bufferIndex < 0) break;
    const type = state.buffer[bufferIndex];
    const target = chooseCrate(state, type);
    state.buffer.splice(bufferIndex, 1);
    state.crates[target]!.count++;
    record({
      kind: "move",
      bottle: type,
      from: { kind: "buffer", index: bufferIndex },
      to: { kind: "crate", index: target },
    });
  }
  if (state.completed === state.orders.length) state.status = "won";
  else if (state.buffer.length >= 3) state.status = "lost";
  return { state, frames };
}
export function bottleInventory(state: GameState): Record<BottleType, number> {
  const result = Object.fromEntries(bottleTypes.map((t) => [t, 0])) as Record<
    BottleType,
    number
  >;
  [...state.columns.flat(), ...state.buffer].forEach((t) => result[t]++);
  state.crates.forEach((c) => {
    if (c) result[c.type] += c.count;
  });
  // Completed orders are the issued orders no longer present in either slot.
  const active = new Set(state.crates.flatMap((c) => (c ? [c.order] : [])));
  state.orders.slice(0, state.nextOrder).forEach((t, i) => {
    if (!active.has(i)) result[t] += 3;
  });
  return result;
}
