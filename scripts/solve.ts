import { writeFileSync, mkdirSync } from "node:fs";
import { levels } from "../src/data/levels";
import { solveLevel } from "../src/game/solver";
import { createGame, takeBottle, validateLevel } from "../src/game/engine";
const results = levels.map((level) => {
  validateLevel(level);
  const solution = solveLevel(level);
  if (!solution.path)
    throw new Error(
      `Level ${level.id}: ${solution.exhausted ? "search budget exceeded" : "unsolvable"}`,
    );
  const end = solution.path.reduce(
    (state, column) => takeBottle(state, column).state,
    createGame(level),
  );
  if (end.status !== "won") throw new Error(`Invalid solution: ${level.id}`);
  console.log(
    `Level ${level.id}: ${solution.path.length} moves, ${solution.visited} states — ${solution.path.map((c) => c + 1).join(" ")}`,
  );
  return {
    level: level.id,
    columnsAreOneBased: true,
    path: solution.path.map((c) => c + 1),
    visited: solution.visited,
  };
});
mkdirSync("docs", { recursive: true });
writeFileSync("docs/solutions.json", JSON.stringify(results, null, 2) + "\n");
