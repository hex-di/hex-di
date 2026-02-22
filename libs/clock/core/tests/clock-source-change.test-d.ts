/**
 * Clock Source Change type-level tests — DoD 8/13
 */

import { describe, it, expectTypeOf } from "vitest";
import { ClockSourceChangedSinkPort } from "../src/ports/clock-source-changed.js";
import type {
  ClockSourceChangedEvent,
  ClockSourceChangedSinkService,
} from "../src/ports/clock-source-changed.js";

describe("ClockSourceChangedEvent type shape", () => {
  it("ClockSourceChangedEvent has readonly _tag, previousAdapter, newAdapter, timestamp, reason", () => {
    expectTypeOf<ClockSourceChangedEvent["_tag"]>().toEqualTypeOf<"ClockSourceChanged">();
    expectTypeOf<ClockSourceChangedEvent["previousAdapter"]>().toEqualTypeOf<string>();
    expectTypeOf<ClockSourceChangedEvent["newAdapter"]>().toEqualTypeOf<string>();
    expectTypeOf<ClockSourceChangedEvent["timestamp"]>().toEqualTypeOf<string>();
    expectTypeOf<ClockSourceChangedEvent["reason"]>().toEqualTypeOf<string>();
  });

  it("ClockSourceChangedSink has readonly onClockSourceChanged method accepting ClockSourceChangedEvent", () => {
    expectTypeOf<ClockSourceChangedSinkService>().toHaveProperty("onClockSourceChanged");
    expectTypeOf<
      ClockSourceChangedSinkService["onClockSourceChanged"]
    >().parameters.toEqualTypeOf<[ClockSourceChangedEvent]>();
  });

  it("ClockSourceChangedSinkPort is defined as a directed port", () => {
    expectTypeOf(ClockSourceChangedSinkPort).toHaveProperty("__portName");
  });
});
