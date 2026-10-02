export const bottleTypes = [
  "water",
  "lemon",
  "berry",
  "orange",
  "cola",
  "mint",
] as const;
export type BottleType = (typeof bottleTypes)[number];
export interface Level {
  id: number;
  columns: BottleType[][];
  orders: BottleType[];
}
export interface Crate {
  type: BottleType;
  count: number;
  order: number;
}
export interface GameState {
  columns: BottleType[][];
  buffer: BottleType[];
  crates: (Crate | null)[];
  orders: BottleType[];
  nextOrder: number;
  completed: number;
  moves: number;
  status: "playing" | "won" | "lost";
}
export type Place = { kind: "column" | "buffer" | "crate"; index: number };
export type GameEvent =
  | { kind: "move"; bottle: BottleType; from: Place; to: Place }
  | { kind: "full" | "replace"; index: number };
export interface Frame {
  state: GameState;
  event: GameEvent;
}
export interface Transition {
  state: GameState;
  frames: Frame[];
}
