// BEH-14-001: Vitest Bench tooling
// BEH-14-002: Construction benchmark category
// BEH-14-003: Target — ok(v) within 3x of plain object
// BEH-14-004: Comparison — plain object, frozen object, class instance baselines
// BEH-14-005: File structure — bench/construction.bench.ts
// BEH-14-007: Reporting — vitest bench table output
// BEH-14-008: Decision trigger — >3x triggers selective prototype optimization
import { bench, describe } from "vitest";
import { ok, err } from "../src/index.js";

describe("Construction [BEH-14-002]", () => {
  bench("ok(42)", () => {
    ok(42);
  });
  bench("err('fail')", () => {
    err("fail");
  });
});
