// BEH-14-002: Method chain benchmark category
// BEH-14-003: Target — 3-chain within 2x of plain functions
// BEH-14-006: CI integration — runs on main push, not PRs
import { bench, describe } from "vitest";
import { ok } from "../src/index.js";

describe("Method Chains [BEH-14-002]", () => {
  bench("ok(1).map(x => x + 1).map(x => x * 2)", () => {
    ok(1).map(x => x + 1).map(x => x * 2);
  });
  bench("ok(1).andThen(x => ok(x + 1))", () => {
    ok(1).andThen(x => ok(x + 1));
  });
});
