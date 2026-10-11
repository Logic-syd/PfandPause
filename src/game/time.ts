import type { Level } from './types';
export const BUFFER_PENALTY_SECONDS = 5;
export const GLASS_PENALTY_SECONDS = 10;
export const MAX_GLASS_MISTAKES = 3;
export function timeLimit(level: Level): number {
  return Math.max(60, Math.ceil((level.columns.flat().length * 2 + 30) / 15) * 15);
}
