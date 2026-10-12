import { glassTypes, isGlass, type BottleType, type GameState, type Level, type GameEvent } from "./types";
import { GLASS_PENALTY_SECONDS, MAX_GLASS_MISTAKES } from "./time";

export const TRAY_CAPACITY = 7;
export interface Tile { id: number; bottle: BottleType; x: number; y: number; layer: number; blockedBy: number[]; }
export interface TripleState extends GameState {
  tiles: Tile[];
  boardWidth: number;
  boardHeight: number;
  bufferIds: number[];
  reserveIds: number[];
  returnedIds: number[];
  recycledIds: number[];
  pickedOrder: number[];
  shuffleUsed: boolean;
  moveOutUsed: boolean;
}
export interface TripleTransition { state: TripleState; frames: { state: TripleState; event: GameEvent }[]; }
function rng(seed: number) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); }
function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function availableTiles(state: TripleState): number[] {
  return state.tiles.filter(tile => state.columns[tile.id].length && tile.blockedBy.every(id => !state.columns[id].length)).map(tile => tile.id);
}
function peelOrder(tiles: Tile[]): number[] {
  const left = new Set(tiles.map(tile => tile.id)), result: number[] = [];
  while (left.size) {
    const tile = tiles.find(tile => left.has(tile.id) && tile.blockedBy.every(id => !left.has(id)));
    if (!tile) throw new Error("Cyclic tile layout");
    left.delete(tile.id); result.push(tile.id);
  }
  return result;
}
export function createGame(level: Level): TripleState {
  const inventory = level.columns.flat();
  const random = rng(level.id * 19237);
  const layers = level.id <= 2 ? 1 : level.id <= 7 ? 2 : 3;
  const cols = level.id === 1 ? 3 : level.id === 2 ? 4 : 5;
  const rows = Math.ceil(inventory.length / (cols * layers));
  const tiles: Tile[] = inventory.map((bottle, id) => {
    const layer = Math.floor(id / (cols * rows)), cell = id % (cols * rows);
    return { id, bottle, x: cell % cols + layer * .26, y: Math.floor(cell / cols) + layer * .28, layer, blockedBy: [] };
  });
  for (const tile of tiles) tile.blockedBy = tiles.filter(top => top.layer > tile.layer && Math.abs(top.x - tile.x) < 1 && Math.abs(top.y - tile.y) < 1).map(top => top.id);
  const groups: BottleType[] = [];
  const glass: BottleType[] = [];
  for (const type of new Set(inventory)) {
    const count = inventory.filter(t => t === type).length;
    if (isGlass(type)) glass.push(...Array<BottleType>(count).fill(type));
    else {
      if (count % 3) throw new Error(`Level ${level.id}: unbalanced triple ${type}`);
      groups.push(...Array<BottleType>(count / 3).fill(type));
    }
  }
  const orderedGroups = shuffled(groups, random), sequence: BottleType[] = [];
  for (let i = 0; i < orderedGroups.length; i += 2) {
    const pair = orderedGroups.slice(i, i + 2).flatMap(type => [type, type, type]);
    sequence.push(...(level.id <= 2 ? pair : shuffled(pair, random)));
  }
  for (const type of glass) sequence.splice(Math.floor(random() * (sequence.length + 1)), 0, type);
  peelOrder(tiles).forEach((id, index) => { tiles[id].bottle = sequence[index]; });
  return {
    tiles, boardWidth: cols + (layers - 1) * .26, boardHeight: rows + (layers - 1) * .28,
    columns: tiles.map(tile => [tile.bottle]), buffer: [], bufferIds: [], reserveIds: [], returnedIds: [], recycledIds: [], pickedOrder: [],
    crates: [], orders: [...groups], nextOrder: 0, completed: 0, recycled: [], penalties: 0, mistakes: 0, moves: 0,
    shuffleUsed: false, moveOutUsed: false, status: "playing",
  };
}
function settle(state: TripleState, record: (event: GameEvent) => void) {
  const type = state.buffer.find(type => state.buffer.filter(t => t === type).length === 3);
  if (type) {
    const start = state.buffer.indexOf(type);
    record({ kind: "full", index: start });
    const ids = state.bufferIds.filter(id => state.tiles[id].bottle === type);
    state.returnedIds.push(...ids);
    state.bufferIds = state.bufferIds.filter(id => !ids.includes(id));
    state.buffer = state.bufferIds.map(id => state.tiles[id].bottle);
    state.pickedOrder = state.pickedOrder.filter(id => !ids.includes(id));
    state.completed++; state.nextOrder = state.completed;
    record({ kind: "replace", index: start });
  }
  if (state.buffer.length >= TRAY_CAPACITY) { state.status = "lost"; state.endReason = "full"; }
  else if (!state.columns.flat().length && !state.buffer.length && !state.reserveIds.length) state.status = "won";
}
function putInTray(state: TripleState, id: number, from: GameEvent & { kind: "move" }, record: (event: GameEvent) => void) {
  const bottle = state.tiles[id].bottle;
  const last = state.buffer.lastIndexOf(bottle), index = last < 0 ? state.buffer.length : last + 1;
  state.bufferIds.splice(index, 0, id); state.buffer.splice(index, 0, bottle);
  record({ ...from, to: { kind: "buffer", index } });
  settle(state, record);
}
export function takeBottle(previous: TripleState, id: number, bin?: BottleType): TripleTransition {
  if (previous.status !== "playing" || !availableTiles(previous).includes(id)) return { state: previous, frames: [] };
  const bottle = previous.tiles[id].bottle;
  if ((isGlass(bottle) && bin === undefined) || (!isGlass(bottle) && bin !== undefined)) return { state: previous, frames: [] };
  const state = structuredClone(previous), frames: TripleTransition["frames"] = [];
  const record = (event: GameEvent) => frames.push({ state: structuredClone(state), event });
  if (isGlass(bottle) && bin !== bottle) {
    state.penalties += GLASS_PENALTY_SECONDS; state.mistakes++;
    if (state.mistakes >= MAX_GLASS_MISTAKES) { state.status = "lost"; state.endReason = "mistakes"; }
    record({ kind: "penalty", reason: "bin", seconds: GLASS_PENALTY_SECONDS });
    return { state, frames };
  }
  state.columns[id] = []; state.moves++; state.pickedOrder.push(id);
  if (isGlass(bottle)) {
    state.recycled.push(bottle); state.recycledIds.push(id);
    record({ kind: "move", bottle, from: { kind: "column", index: id }, to: { kind: "bin", index: glassTypes.indexOf(bottle) } });
    if (!state.columns.flat().length && !state.buffer.length && !state.reserveIds.length) state.status = "won";
  } else putInTray(state, id, { kind: "move", bottle, from: { kind: "column", index: id }, to: { kind: "buffer", index: 0 } }, record);
  return { state, frames };
}
export function returnReserve(previous: TripleState, index: number): TripleTransition {
  if (previous.status !== "playing" || previous.reserveIds[index] === undefined) return { state: previous, frames: [] };
  const state = structuredClone(previous), frames: TripleTransition["frames"] = [];
  const id = state.reserveIds.splice(index, 1)[0]; state.moves++;
  state.pickedOrder = [...state.pickedOrder.filter(picked => picked !== id), id];
  const record = (event: GameEvent) => frames.push({ state: structuredClone(state), event });
  putInTray(state, id, { kind: "move", bottle: state.tiles[id].bottle, from: { kind: "reserve", index }, to: { kind: "buffer", index: 0 } }, record);
  return { state, frames };
}
export function canUndo(state: TripleState): boolean {
  return (state.status === "playing" || state.endReason === "full") && state.pickedOrder.length > 0;
}
export function undoBottle(previous: TripleState): TripleState {
  if (!canUndo(previous)) return previous;
  const state = structuredClone(previous), id = state.pickedOrder.pop()!;
  state.bufferIds = state.bufferIds.filter(i => i !== id);
  state.buffer = state.bufferIds.map(i => state.tiles[i].bottle);
  state.reserveIds = state.reserveIds.filter(i => i !== id);
  const glass = state.recycledIds.indexOf(id);
  if (glass >= 0) { state.recycledIds.splice(glass, 1); state.recycled.splice(glass, 1); }
  state.columns[id] = [state.tiles[id].bottle]; state.moves--;
  state.status = "playing"; delete state.endReason;
  return state;
}
export function moveOut(previous: TripleState): TripleState {
  if (previous.moveOutUsed || previous.reserveIds.length || previous.bufferIds.length < 3 || !(previous.status === "playing" || previous.endReason === "full")) return previous;
  const state = structuredClone(previous);
  state.reserveIds = state.bufferIds.splice(0, 3);
  state.buffer = state.bufferIds.map(id => state.tiles[id].bottle);
  state.moveOutUsed = true; state.status = "playing"; delete state.endReason;
  return state;
}
export function solveState(initial: TripleState, limit = 20000): { path: number[] | null; visited: number; exhausted: boolean } {
  const failed = new Set<string>(); let visited = 0, exhausted = false;
  function search(state: TripleState): number[] | null {
    if (state.status === "won") return [];
    if (state.status !== "playing") return null;
    const key = JSON.stringify([state.columns.map(c => !!c.length), state.bufferIds.map(id => state.tiles[id].bottle), state.reserveIds]);
    if (failed.has(key)) return null;
    if (++visited > limit) { exhausted = true; return null; }
    const choices = [...availableTiles(state), ...state.reserveIds.map((_, i) => -i - 1)];
    choices.sort((a, b) => {
      const type = (id: number) => state.tiles[id < 0 ? state.reserveIds[-id - 1] : id].bottle;
      return state.buffer.filter(t => t === type(b)).length - state.buffer.filter(t => t === type(a)).length;
    });
    for (const id of choices) {
      const type = id < 0 ? undefined : state.tiles[id].bottle;
      const next = id < 0 ? returnReserve(state, -id - 1) : takeBottle(state, id, type && isGlass(type) ? type : undefined);
      const path = search(next.state);
      if (path) return [id, ...path];
      if (exhausted) return null;
    }
    failed.add(key); return null;
  }
  return { path: search(initial), visited, exhausted };
}
export function shuffleBoard(previous: TripleState): TripleState {
  if (previous.status !== "playing" || previous.shuffleUsed) return previous;
  const state = structuredClone(previous), random = rng(state.moves * 313 + state.tiles.length * 17);
  const remaining = state.tiles.filter(tile => state.columns[tile.id].length);
  const order = peelOrder(remaining.map(tile => ({ ...tile, blockedBy: tile.blockedBy.filter(id => state.columns[id].length) })));
  const inventory = remaining.map(tile => tile.bottle), sequence: BottleType[] = [];
  for (const type of new Set(state.buffer)) {
    const need = 3 - state.buffer.filter(t => t === type).length;
    if (inventory.filter(t => t === type).length < need) continue;
    for (let i = 0; i < need; i++) sequence.push(inventory.splice(inventory.indexOf(type), 1)[0]);
  }
  for (const type of shuffled([...new Set(inventory)], random)) while (inventory.includes(type)) sequence.push(inventory.splice(inventory.indexOf(type), 1)[0]);
  order.forEach((id, index) => { state.tiles[id].bottle = sequence[index]; state.columns[id] = [sequence[index]]; });
  // A blocked tray still permits shuffling; the player can recall or move out bottles.
  state.shuffleUsed = true; return state;
}
export function bottleInventory(state: TripleState): Record<BottleType, number> {
  const ids = [...state.tiles.filter(tile => state.columns[tile.id].length).map(tile => tile.id), ...state.bufferIds, ...state.reserveIds, ...state.returnedIds, ...state.recycledIds];
  const result = {} as Record<BottleType, number>;
  for (const id of ids) { const type = state.tiles[id].bottle; result[type] = (result[type] ?? 0) + 1; }
  return result;
}
