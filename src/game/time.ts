import type { Level } from './types';
export const BUFFER_PENALTY_SECONDS = 5;
export const GLASS_PENALTY_SECONDS = 10;
export const MAX_GLASS_MISTAKES = 3;
export const FINAL_COUNTDOWN_SECONDS = 10;
// The opening rounds stay relaxed. Rounds 6–10 progressively reward faster play.
const CHALLENGE_LIMITS = [42, 40, 38, 35, 32] as const;
export function timeLimit(level: Level): number {
  if (level.id >= 6 && level.id <= 10) return CHALLENGE_LIMITS[level.id - 6];
  return Math.max(60, Math.ceil((level.columns.flat().length * 2 + 30) / 15) * 15);
}
