import test from "node:test";
import assert from "node:assert/strict";
import { levels } from "../src/data/legacy-levels";
import { createGame, takeBottle, bottleInventory } from "../src/game/engine";
import { createUndoTrail, advanceUndoTrail, undoPendingBottle } from "../src/game/undo";
import { isGlass, type GameState, type Level } from "../src/game/types";
import { solveState } from "../src/game/solver";

function walk(level: Level, path: number[]) {
  let state = createGame(level), trail = createUndoTrail();
  for (const column of path) {
    const type = state.columns[column][0];
    const transition = takeBottle(state, column, isGlass(type) ? type : undefined);
    for (const frame of transition.frames) trail = advanceUndoTrail(trail, frame.event);
    state = transition.state;
  }
  return { state, trail };
}

test("the reported ninth-level trap recalls storage first and unlocks water without reversing the finished batch", () => {
  let { state, trail } = walk(levels[8], [0, 0, 0, 0, 2, 4, 4, 3]);
  assert.deepEqual(state.buffer, ["apple", "malt", "water"]);
  assert.equal(state.completed, 1);
  assert.equal(state.crates[1]?.count, 2);
  const inventory = bottleInventory(state), crates = structuredClone(state.crates), orders = [...state.orders];
  state = takeBottle(state, 0).state; // Another unmatched choice still costs time.
  const before = structuredClone(state);
  const recalled = undoPendingBottle(state, trail)!;
  assert.deepEqual(state, before, "Recall must not mutate its input");
  ({ state, trail } = recalled);
  assert.deepEqual(state.buffer, ["apple", "malt"]);
  assert.equal(state.columns[3][0], "water");
  assert.equal(state.completed, 1);
  assert.deepEqual(state.crates, crates);
  assert.deepEqual(state.orders, orders);
  assert.equal(state.penalties, 5);
  for (const column of [1, 1, 1]) {
    const transition = takeBottle(state, column);
    for (const frame of transition.frames) trail = advanceUndoTrail(trail, frame.event);
    state = transition.state;
  }
  assert.equal(state.completed, 2);
  assert.ok(state.crates.some(crate => crate?.type === "water"));
  assert.equal(state.penalties, 5, "Matching choices remain possible while storage is full");
  assert.deepEqual(bottleInventory(state), inventory);
  const solution = solveState(state);
  assert.ok(solution.path, "The recovered board must still be winnable");
  for (const column of solution.path) state = takeBottle(state, column).state;
  assert.equal(state.status, "won");
  assert.deepEqual(bottleInventory(state), inventory);
});

test("storage can be recalled even when the most recent click completed an unrelated batch", () => {
  const { state, trail } = walk(levels[8], [0, 0, 0, 0, 2, 1, 3, 4]);
  assert.equal(state.completed, 1);
  assert.deepEqual(state.buffer, ["apple", "malt", "water"]);
  const recalled = undoPendingBottle(state, trail)!;
  assert.equal(recalled.state.completed, 1);
  assert.deepEqual(recalled.state.orders, state.orders);
  assert.deepEqual(recalled.state.crates, state.crates);
  assert.deepEqual(recalled.state.buffer, ["apple", "malt"]);
  assert.deepEqual(bottleInventory(recalled.state), bottleInventory(state));
});

test("automatically transferred unfinished bottles retain their original columns; completed triples stay returned", () => {
  const level: Level = { id: 1, columns: [["water", "currant", "lemon"], ["water", "currant", "lemon"], ["water", "currant", "lemon"]], orders: ["water", "lemon", "currant"] };
  let { state, trail } = walk(level, [0, 0, 1, 1, 2]);
  assert.equal(state.completed, 1);
  assert.equal(state.crates[0]?.count, 2);
  ({ state, trail } = undoPendingBottle(state, trail)!);
  assert.equal(state.columns[1][0], "currant");
  assert.equal(state.crates[0]?.count, 1);
  ({ state, trail } = undoPendingBottle(state, trail)!);
  assert.equal(state.columns[0][0], "currant");
  assert.equal(state.completed, 1);
  assert.equal(state.crates[0]?.count, 0);
  assert.equal(undoPendingBottle(state, trail), null, "Finished water cannot be brought back");
});

test("recall preserves every bottle and issued order across all levels and random choices", () => {
  let seed = 9182;
  const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0);
  for (const level of levels) {
    let state = createGame(level), trail = createUndoTrail();
    const inventory = bottleInventory(state);
    for (let step = 0; step < 100 && state.status === "playing"; step++) {
      const column = random() % state.columns.length;
      const type = state.columns[column][0];
      const transition = takeBottle(state, column, type && isGlass(type) ? type : undefined);
      for (const frame of transition.frames) trail = advanceUndoTrail(trail, frame.event);
      state = transition.state;
      assert.deepEqual(bottleInventory(state), inventory);
      assert.equal(trail.buffer.length, state.buffer.length);
      assert.deepEqual(trail.crates.map(crate => crate.length), state.crates.map(crate => crate?.count ?? 0));
      assert.equal(trail.glass.length, state.recycled.length);
      if (random() % 3 === 0) {
        const before: GameState = structuredClone(state), orders = [...state.orders];
        const recalled = undoPendingBottle(state, trail);
        if (recalled) {
          ({ state, trail } = recalled);
          assert.equal(state.completed, before.completed);
          assert.equal(state.nextOrder, before.nextOrder);
          assert.deepEqual(state.orders, orders);
          assert.equal(state.penalties, before.penalties);
          assert.equal(state.mistakes, before.mistakes);
          assert.deepEqual(bottleInventory(state), inventory);
        }
      }
    }
  }
});
