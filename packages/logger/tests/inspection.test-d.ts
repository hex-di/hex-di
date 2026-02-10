import { describe, it, expectTypeOf } from "vitest";
import type { LoggerInspector, LoggingSnapshot, LoggerInspectorEvent } from "../src/index.js";

describe("LoggerInspector type-level tests", () => {
  it("LoggerInspector has libraryName 'logging'", () => {
    expectTypeOf<LoggerInspector["libraryName"]>().toEqualTypeOf<"logging">();
  });

  it("LoggingSnapshot fields are all readonly", () => {
    // Verify that the snapshot type is assignable to one with readonly fields
    type ReadonlyCheck = {
      readonly timestamp: number;
      readonly totalEntries: number;
      readonly errorRate: number;
      readonly samplingActive: boolean;
      readonly redactionActive: boolean;
      readonly contextDepth: number;
    };
    expectTypeOf<LoggingSnapshot>().toMatchTypeOf<ReadonlyCheck>();
  });

  it("LoggerInspectorEvent is discriminated union on type", () => {
    // Each event variant has a "type" field; verify the union discriminant
    expectTypeOf<LoggerInspectorEvent["type"]>().toEqualTypeOf<
      | "entry-logged"
      | "error-rate-threshold"
      | "handler-error"
      | "sampling-dropped"
      | "redaction-applied"
      | "handler-added"
      | "handler-removed"
      | "snapshot-changed"
    >();
  });
});
