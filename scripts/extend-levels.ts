import { writeFileSync } from "node:fs";
import { levels } from "../src/data/levels";
import { solveLevel } from "../src/game/solver";
import { createGame, takeBottle } from "../src/game/engine";
import { bottleTypes, type BottleType, type Level } from "../src/game/types";
// Development-only seeded search. The game consumes the resulting static data.
let seed = 902105;
function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
function shuffle<T>(values: T[]): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
const specs = [
  { id: 4, counts: [2, 2, 1, 1], depths: [4, 4, 4, 3, 3], min: 1 },
  { id: 5, counts: [2, 2, 2, 2], depths: [5, 5, 5, 5, 4], min: 2 },
  { id: 6, counts: [2, 2, 2, 2, 1], depths: [6, 6, 5, 5, 5], min: 3 },
  { id: 7, counts: [2, 2, 2, 2, 2], depths: [6, 6, 6, 6, 6], min: 4 },
  { id: 8, counts: [2, 2, 2, 2, 1, 1], depths: [6, 6, 6, 6, 6], min: 5 },
  { id: 9, counts: [2, 2, 2, 2, 2, 1], depths: [7, 7, 7, 6, 6], min: 6 },
  { id: 10, counts: [2, 2, 2, 2, 2, 2], depths: [8, 7, 7, 7, 7], min: 7 },
];
const output = levels.slice(0, 3);
for (const spec of specs) {
  let chosen: Level | undefined;
  for (let attempt = 0; attempt < 3000; attempt++) {
    let orders = shuffle(
      spec.counts.flatMap(
        (n, i) => Array(n).fill(bottleTypes[i]) as BottleType[],
      ),
    );
    if (spec.id === 7)
      orders = ["water", "water", ...orders.filter((t) => t !== "water")];
    if (spec.id === 9)
      orders = ["lemon", "lemon", ...orders.filter((t) => t !== "lemon")];
    const loose = shuffle(orders.flatMap((t) => [t, t, t]));
    const columns = spec.depths.map((n) => loose.splice(0, n));
    const candidate: Level = { id: spec.id, columns, orders };
    const solution = solveLevel(candidate, 30_000);
    if (!solution.path) continue;
    let state = createGame(candidate),
      buffered = 0;
    for (const c of solution.path) {
      const result = takeBottle(state, c);
      buffered += result.frames.filter(
        (f) => f.event.kind === "move" && f.event.to.kind === "buffer",
      ).length;
      state = result.state;
    }
    if (
      buffered < spec.min ||
      solution.visited < solution.path.length + spec.id * 2
    )
      continue;
    chosen = candidate;
    console.log(
      `Level ${spec.id}: candidate ${attempt}, visited ${solution.visited}, ${buffered} buffer moves`,
    );
    break;
  }
  if (!chosen) throw Error(`No candidate for ${spec.id}`);
  output.push(chosen);
}
writeFileSync(
  "src/data/levels.ts",
  `import type { Level } from '../game/types';\n// Static, solver-verified levels. Each column is TOP FIRST.\n// Orders 0 and 1 are the initial left/right crates; remaining orders share one queue.\nexport const levels: Level[] = ${JSON.stringify(output, null, 2)};\n`,
);
