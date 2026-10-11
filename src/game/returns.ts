import { bottleDeposits } from "../data/bottles";
import { isGlass, type BottleType } from "./types";

export function returnStats(returned: readonly BottleType[]) {
  return { bottles: returned.filter(type => !isGlass(type)).length, cents: returned.reduce((sum, type) => sum + bottleDeposits[type], 0) };
}
