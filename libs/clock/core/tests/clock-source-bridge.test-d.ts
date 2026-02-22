/**
 * Clock Source Bridge type-level tests — DoD 14
 */

import { describe, it, expectTypeOf } from "vitest";
import { createClockSourceBridge } from "../src/clock-source-bridge.js";
import type { ClockSource } from "../src/clock-source-bridge.js";
import type { ClockService } from "../src/ports/clock.js";

describe("createClockSourceBridge type shape", () => {
  it("createClockSourceBridge accepts ClockPort and returns ClockSource", () => {
    expectTypeOf(createClockSourceBridge).parameter(0).toEqualTypeOf<ClockService>();
    expectTypeOf(createClockSourceBridge).returns.toEqualTypeOf<ClockSource>();
  });

  it("ClockSource has readonly nowISO method returning string", () => {
    expectTypeOf<ClockSource>().toHaveProperty("nowISO");
    expectTypeOf<ClockSource["nowISO"]>().returns.toEqualTypeOf<string>();
  });

  it("ClockSource.nowISO takes no parameters", () => {
    expectTypeOf<ClockSource["nowISO"]>().parameters.toEqualTypeOf<[]>();
  });
});
