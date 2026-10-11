export const bottleTypes = [
  "water",
  "lemon",
  "currant",
  "apple",
  "malt",
  "kola",
  "glassClear",
  "glassBrown",
  "glassGreen",
] as const;
export type BottleType = (typeof bottleTypes)[number];
export const glassTypes = ["glassClear", "glassBrown", "glassGreen"] as const;
export type GlassType = (typeof glassTypes)[number];
export function isGlass(type: BottleType): type is GlassType {
  return (glassTypes as readonly BottleType[]).includes(type);
}
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
  recycled: GlassType[];
  penalties: number;
  mistakes: number;
  endReason?: "time" | "mistakes";
  moves: number;
  status: "playing" | "won" | "lost";
}
export type Place = { kind: "column" | "buffer" | "crate" | "bin"; index: number };
export type GameEvent =
  | { kind: "move"; bottle: BottleType; from: Place; to: Place }
  | { kind: "full" | "replace"; index: number }
  | { kind: "penalty"; reason: "buffer" | "bin"; seconds: number };
export interface Frame {
  state: GameState;
  event: GameEvent;
}
export interface Transition {
  state: GameState;
  frames: Frame[];
}
