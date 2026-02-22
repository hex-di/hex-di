/**
 * Clock Source Bridge type-level tests — DoD 9/14
 */
// @ts-nocheck


import { describe, it, expectTypeOf } from "vitest";
import type { ClockSourceChangedEvent, ClockSourceChangedSinkService } from "../src/ports/clock-source-changed.js";

describe("ClockSourceBridge type shape", () => {
  it("ClockSourceChangedEvent is a readonly frozen-compatible interface", () => {
    expectTypeOf<ClockSourceChangedEvent["_tag"]>().toEqualTypeOf<"ClockSourceChanged">();
  });

  it("ClockSourceChangedSinkService.onClockSourceChanged accepts ClockSourceChangedEvent", () => {
    type Fn = ClockSourceChangedSinkService["onClockSourceChanged"];
    expectTypeOf<Fn>().parameters.toEqualTypeOf<[ClockSourceChangedEvent]>();
    expectTypeOf<Fn>().returns.toEqualTypeOf<void>();
  });

  it("ClockSourceChangedSinkService has readonly onClockSourceChanged", () => {
    expectTypeOf<ClockSourceChangedSinkService>().toHaveProperty("onClockSourceChanged");
  });
});
