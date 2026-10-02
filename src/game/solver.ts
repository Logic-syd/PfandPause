import { createGame, takeBottle } from "./engine";
import type { GameState, Level } from "./types";
export interface Solution {
  path: number[] | null;
  visited: number;
  exhausted: boolean;
}
export function solveLevel(level: Level, limit = 500_000): Solution {
  const failed = new Set<string>();
  let visited = 0;
  let exhausted = false;
  function search(state: GameState): number[] | null {
    if (state.status === "won") return [];
    if (state.status === "lost") return null;
    const key = JSON.stringify([
      state.columns,
      state.buffer,
      state.crates,
      state.nextOrder,
    ]);
    if (failed.has(key)) return null;
    if (++visited > limit) {
      exhausted = true;
      return null;
    }
    // Prefer moves into crates; all legal choices remain in the search.
    const choices = state.columns
      .map((c, i) => ({
        i,
        type: c[0],
        score: state.crates.some((k) => k?.type === c[0]) ? 0 : 1,
      }))
      .filter((c) => c.type)
      .sort((a, b) => a.score - b.score);
    const equivalent = new Set<string>();
    for (const { i } of choices) {
      const stack = state.columns[i].join(",");
      if (equivalent.has(stack)) continue;
      equivalent.add(stack);
      const path = search(takeBottle(state, i).state);
      if (path) return [i, ...path];
      if (exhausted) return null;
    }
    failed.add(key);
    return null;
  }
  return { path: search(createGame(level)), visited, exhausted };
}
