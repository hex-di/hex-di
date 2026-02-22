/**
 * ClockCapabilities type-level tests — DoD 24
 */
// @ts-nocheck


import { describe, it, expectTypeOf } from "vitest";
import type { ClockCapabilities } from "../src/ports/diagnostics.js";

describe("ClockCapabilities type shape", () => {
  it("hasMonotonicTime is boolean", () => {
    expectTypeOf<ClockCapabilities["hasMonotonicTime"]>().toEqualTypeOf<boolean>();
  });

  it("hasHighResOrigin is boolean", () => {
    expectTypeOf<ClockCapabilities["hasHighResOrigin"]>().toEqualTypeOf<boolean>();
  });

  it("crossOriginIsolated is boolean | undefined", () => {
    expectTypeOf<ClockCapabilities["crossOriginIsolated"]>().toEqualTypeOf<boolean | undefined>();
  });

  it("estimatedResolutionMs is number", () => {
    expectTypeOf<ClockCapabilities["estimatedResolutionMs"]>().toEqualTypeOf<number>();
  });

  it("platform is a union of known platform strings", () => {
    expectTypeOf<ClockCapabilities["platform"]>().toEqualTypeOf<
      "node" | "deno" | "bun" | "browser" | "edge-worker" | "react-native" | "wasm" | "unknown"
    >();
  });

  it("highResDegraded is boolean", () => {
    expectTypeOf<ClockCapabilities["highResDegraded"]>().toEqualTypeOf<boolean>();
  });

  it("monotonicDegraded is boolean", () => {
    expectTypeOf<ClockCapabilities["monotonicDegraded"]>().toEqualTypeOf<boolean>();
  });
});
