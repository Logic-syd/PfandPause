import { isGlass } from "../src/game/types";
import { writeFileSync, mkdirSync } from "node:fs";
import { levels } from "../src/data/levels";

import { createGame, takeBottle, solveState } from "../src/game/triple";
const results = levels.map((level) => {

  const solution = solveState(createGame(level));
  if (!solution.path)
    throw new Error(
      `Level ${level.id}: ${solution.exhausted ? "search budget exceeded" : "unsolvable"}`,
    );
  const end = solution.path.reduce(
    (state, column) => { const type=state.columns[column][0]; return takeBottle(state, column, isGlass(type) ? type : undefined).state; },
    createGame(level),
  );
  if (end.status !== "won") throw new Error(`Invalid solution: ${level.id}`);
  console.log(
    `Level ${level.id}: ${solution.path.length} moves, ${solution.visited} states — ${solution.path.map((c) => c + 1).join(" ")}`,
  );
  return {
    level: level.id,
    tilesAreOneBased: true,
    path: solution.path.map((c) => c + 1),
    visited: solution.visited,
  };
});
mkdirSync("docs", { recursive: true });
writeFileSync("docs/solutions.json", JSON.stringify(results, null, 2) + "\n");
