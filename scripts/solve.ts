import { isGlass } from "../src/game/types";
import { writeFileSync, mkdirSync } from "node:fs";
import { levels } from "../src/data/levels";
import { availableTiles, createPuzzle, takeBottle } from "../src/game/triple";

// Replay the construction witness through the independent move validator.
// Deep boards need not run an unbounded search to prove they are playable.
const results = levels.map(level => {
  const puzzle = createPuzzle(level);
  let state = puzzle.state;
  for (const id of puzzle.solution) {
    if (!availableTiles(state).includes(id)) throw new Error(`Blocked move: ${level.id}/${id}`);
    const type = state.tiles[id].bottle;
    state = takeBottle(state, id, isGlass(type) ? type : undefined).state;
    if (state.status === 'lost') throw new Error(`Invalid solution: ${level.id}`);
  }
  if (state.status !== 'won') throw new Error(`Incomplete solution: ${level.id}`);
  console.log(`Level ${level.id}: ${puzzle.solution.length} legal moves, cleared`);
  return {level:level.id, tilesAreOneBased:true, path:puzzle.solution.map(id=>id+1)};
});
mkdirSync('docs',{recursive:true});
writeFileSync('docs/solutions.json',JSON.stringify(results,null,2)+'\n');
