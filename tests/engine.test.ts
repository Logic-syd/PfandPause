import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bottleInventory,
  chooseCrate,
  cloneState,
  createGame,
  takeBottle,
  validateLevel,
} from "../src/game/engine";
import { solveLevel } from "../src/game/solver";
import { levels } from "../src/data/levels";
import {
  bottleTypes,
  type BottleType,
  type GameState,
  type Level,
} from "../src/game/types";
const sample: Level = {
  id: 1,
  columns: [
    ["water", "currant", "lemon"],
    ["water", "currant", "lemon"],
    ["water", "currant", "lemon"],
  ],
  orders: ["water", "lemon", "currant"],
};
function moves(state: GameState, path: number[]) {
  return path.reduce((s, i) => takeBottle(s, i).state, state);
}

test("only the top bottle is removed and the input state remains immutable", () => {
  const initial = createGame(sample);
  const snapshot = cloneState(initial);
  const result = takeBottle(initial, 0);
  assert.deepEqual(initial, snapshot);
  assert.deepEqual(result.state.columns[0], ["currant", "lemon"]);
  assert.equal(result.state.crates[0]?.count, 1);
  assert.equal(result.state.moves, 1);
  assert.equal(result.frames[0].event.kind, "move");
});
test("unmatched bottles go to the buffer, then transfer when a matching crate arrives", () => {
  const initial = createGame(sample);
  const waiting = moves(initial, [0, 0, 1, 1]);
  assert.deepEqual(waiting.buffer, ["currant", "currant"]);
  const result = takeBottle(waiting, 2);
  assert.deepEqual(result.state.buffer, []);
  assert.equal(result.state.completed, 1);
  assert.deepEqual(result.state.crates[0], {
    type: "currant",
    count: 2,
    order: 2,
  });
  assert.equal(result.state.nextOrder, 3);
  assert.equal(result.state.status, "playing");
  assert.equal(result.frames.filter((f) => f.event.kind === "move").length, 3);
  assert.deepEqual(bottleInventory(result.state), bottleInventory(initial));
});
test("same-type crates prefer the fuller one, then the left one", () => {
  const state = createGame({
    id: 1,
    columns: [Array(6).fill("water") as BottleType[]],
    orders: ["water", "water"],
  });
  assert.equal(chooseCrate(state, "water"), 0);
  state.crates[1]!.count = 1;
  assert.equal(chooseCrate(state, "water"), 1);
  state.crates[0]!.count = 1;
  assert.equal(chooseCrate(state, "water"), 0);
  state.crates[0]!.count = 3;
  assert.equal(chooseCrate(state, "water"), 1);
});
test("a third unmatched bottle loses only after settling; undo restores the complete snapshot", () => {
  const level: Level = {
    id: 1,
    columns: [
      ["currant", "currant", "currant"],
      ["water", "water", "water"],
      ["lemon", "lemon", "lemon"],
    ],
    orders: ["water", "lemon", "currant"],
  };
  const initial = createGame(level);
  const before = moves(initial, [0, 0]);
  const snapshot = cloneState(before);
  const result = takeBottle(before, 0);
  assert.equal(result.state.status, "lost");
  assert.equal(result.state.buffer.length, 3);
  assert.deepEqual(before, snapshot);
  assert.deepEqual(bottleInventory(before), bottleInventory(initial));
  assert.deepEqual(bottleInventory(result.state), bottleInventory(initial));
  const recovered = moves(cloneState(snapshot), [1, 1, 1, 0, 2, 2, 2]);
  assert.equal(recovered.status, "won");
});
test("full buffer in an intermediate state is drained and successive full crates settle before loss", () => {
  // A deliberately constructed intermediate state exercises the fixed-point loop,
  // even though normal playable states end a turn with at most two spare bottles.
  const state = createGame({
    id: 1,
    columns: [
      ["water", "water", "water"],
      ["currant", "currant", "currant"],
      ["lemon", "lemon", "lemon"],
    ],
    orders: ["water", "lemon", "currant"],
  });
  state.columns = [["water"], [], ["lemon", "lemon", "lemon"]];
  state.crates[0]!.count = 2;
  state.buffer = ["currant", "currant", "currant"];
  const result = takeBottle(state, 0);
  assert.equal(result.state.status, "playing");
  assert.equal(result.state.completed, 2);
  assert.deepEqual(result.state.buffer, []);
  assert.equal(result.state.crates[0], null);
  assert.equal(result.frames.filter((f) => f.event.kind === "full").length, 2);
  assert.deepEqual(bottleInventory(result.state), bottleInventory(state));
});
test("replacing a full crate respects the shared queue, regardless of left/right slot", () => {
  const initial = createGame(sample);
  const rightFirst = moves(initial, [0, 0, 0, 1, 1, 1]);
  const result = takeBottle(rightFirst, 2); // water completes left after both temporary berries drain
  assert.equal(result.state.crates[0]?.type, "currant");
  assert.equal(result.state.crates[0]?.order, 2);
  const right = createGame(sample);
  right.columns = [
    ["lemon"],
    ["water", "water", "water"],
    ["currant", "currant", "currant"],
  ];
  right.crates[1]!.count = 2;
  const after = takeBottle(right, 0).state;
  assert.equal(after.crates[1]?.type, "currant");
  assert.equal(after.crates[1]?.order, 2);
});
test("final bottle wins, empty slots remain empty, and finished games reject extra input", () => {
  const initial = createGame(levels[0]);
  const final = moves(initial, [0, 0, 1, 1, 2, 2]);
  assert.equal(final.status, "won");
  assert.equal(final.completed, 2);
  assert.deepEqual(final.crates, [null, null]);
  assert.equal(final.columns.flat().length, 0);
  assert.deepEqual(final.buffer, []);
  assert.equal(takeBottle(final, 0).state, final);
  assert.deepEqual(takeBottle(final, 0).frames, []);
});
test("invalid or empty column input is a no-op", () => {
  const state = createGame(levels[0]);
  for (const i of [-1, 9, 0.5, NaN])
    assert.equal(takeBottle(state, i).state, state);
  const empty = moves(state, [0, 0]);
  assert.equal(takeBottle(empty, 0).state, empty);
});
test("validation rejects unmatched orders, unknown types, and empty levels", () => {
  assert.throws(() =>
    validateLevel({ id: 1, columns: [["water"]], orders: ["water"] }),
  );
  assert.throws(() =>
    validateLevel({
      id: 1,
      columns: [["bad", "bad", "bad"]] as unknown as BottleType[][],
      orders: ["bad"] as unknown as BottleType[],
    }),
  );
  assert.throws(() => validateLevel({ id: 1, columns: [], orders: [] }));
});
test("the solver identifies a genuinely unsolvable balanced level", () => {
  const impossible: Level = {
    id: 1,
    columns: [
      [
        "currant",
        "currant",
        "currant",
        "water",
        "water",
        "water",
        "lemon",
        "lemon",
        "lemon",
      ],
    ],
    orders: ["water", "lemon", "currant"],
  };
  assert.equal(solveLevel(impossible).path, null);
});
for (const level of levels) {
  test(`level ${level.id}: balanced counts, winning solution, conservation in every animation frame, undo and restart`, () => {
    const initial = createGame(level);
    const inventory = bottleInventory(initial);
    for (const type of bottleTypes) assert.equal(inventory[type] % 3, 0);
    const solution = solveLevel(level);
    assert.ok(solution.path, `No solution (${solution.visited} states)`);
    let state = initial;
    const history: GameState[] = [];
    for (const column of solution.path) {
      history.push(cloneState(state));
      const next = takeBottle(state, column);
      assert.deepEqual(bottleInventory(next.state), inventory);
      for (const frame of next.frames)
        assert.deepEqual(bottleInventory(frame.state), inventory);
      assert.ok(next.state.buffer.length < 3);
      state = next.state;
    }
    assert.equal(state.status, "won");
    assert.equal(state.completed, level.orders.length);
    while (history.length) {
      state = history.pop()!;
      assert.deepEqual(bottleInventory(state), inventory);
    }
    assert.deepEqual(state, initial);
    assert.deepEqual(createGame(level), initial);
  });
  test(`level ${level.id}: randomized choices preserve every bottle and valid settled states`, () => {
    let seed = level.id;
    for (let trial = 0; trial < 40; trial++) {
      let state = createGame(level);
      const expected = bottleInventory(state);
      while (state.status === "playing") {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const choices = state.columns.flatMap((c, i) => (c.length ? [i] : []));
        assert.ok(choices.length);
        state = takeBottle(state, choices[seed % choices.length]).state;
        assert.deepEqual(bottleInventory(state), expected);
        assert.ok(state.crates.every((c) => !c || c.count < 3));
        assert.ok(state.buffer.length <= 3);
        if (state.status === "playing") assert.ok(state.buffer.length < 3);
      }
    }
  });
}

test("guided practice uses real rules, recovers its deliberate failure and finishes with all nine bottles", async () => {
  const { tutorialLevel, tutorialSteps } = await import("../src/data/tutorial");
  let state = createGame(tutorialLevel);
  const initial = cloneState(state);
  const inventory = bottleInventory(state);
  const history: GameState[] = [];
  for (const [step, action] of tutorialSteps.entries()) {
    if (action.column === null) state = history.pop()!;
    else {
      history.push(cloneState(state));
      state = takeBottle(state, action.column).state;
    }
    assert.deepEqual(bottleInventory(state), inventory);
    if (step === 3) {
      assert.equal(state.status, "lost");
      assert.equal(state.buffer.length, 3);
    }
    if (step === 4) {
      assert.equal(state.status, "playing");
      assert.equal(state.buffer.length, 2);
    }
    if (step === 6) {
      assert.equal(state.buffer.length, 0);
      assert.deepEqual(state.crates[0], { type: "currant", count: 2, order: 2 });
    }
  }
  assert.equal(state.status, "won");
  assert.equal(state.completed, 3);
  assert.equal(state.moves, 9);
  assert.deepEqual(createGame(tutorialLevel), initial);
});
