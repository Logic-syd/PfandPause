import test from "node:test";
import assert from "node:assert/strict";
import { returnStats } from "../src/game/returns";
import { levels } from "../src/data/levels";

test("return statistics count individual bottles and sum explicit deposit cents", () => {
  assert.deepEqual(returnStats([]), { bottles:0,cents:0 });
  assert.deepEqual(returnStats(["water","malt","kola"]), { bottles:3,cents:38 });
  assert.deepEqual(returnStats(levels[1].columns.flat()), { bottles:12,cents:240 });
});

test("no-deposit glass never increases the returned count or refund", () => {
  assert.deepEqual(returnStats(["glassClear", "lemon", "glassBrown", "malt", "glassGreen"]), { bottles:2, cents:33 });
});
