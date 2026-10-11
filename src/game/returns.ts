import { bottleDeposits } from "../data/bottles";
import type { BottleType } from "./types";

export function returnStats(returned: readonly BottleType[]) {
  return { bottles: returned.length, cents: returned.reduce((sum, type) => sum + bottleDeposits[type], 0) };
}
