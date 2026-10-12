import type { Level } from './types';
export const BUFFER_PENALTY_SECONDS = 5;
export const GLASS_PENALTY_SECONDS = 10;
export const MAX_GLASS_MISTAKES = 3;
export const FINAL_COUNTDOWN_SECONDS = 10;
// Time for observation as the new layered puzzles introduce ten bottle types.
const ROUND_SECONDS = [60, 75, 90, 100, 105, 95, 90, 85, 80, 100, 105, 110, 110, 110];
export function timeLimit(level: Level): number {
  return ROUND_SECONDS[level.id - 1] ?? 90;
}
