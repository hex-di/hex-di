/**
 * Type-level tests for ResultDataSource and ResultDataEvent.
 *
 * Spec: 14-integration.md Section 14.2
 */

import { describe, it, expectTypeOf } from "vitest";
import type {
  ResultDataSource,
  ResultDataEvent,
  ResultChainDescriptor,
  ResultPortStatistics,
} from "../../../../src/panels/result/types.js";

describe("ResultDataSource — Type Level", () => {
  it("getChains returns ReadonlyMap<string, ResultChainDescriptor>", () => {
    expectTypeOf<ReturnType<ResultDataSource["getChains"]>>().toEqualTypeOf<
      ReadonlyMap<string, ResultChainDescriptor>
    >();
  });

  it("getPortStatistics returns ReadonlyMap<string, ResultPortStatistics>", () => {
    expectTypeOf<ReturnType<ResultDataSource["getPortStatistics"]>>().toEqualTypeOf<
      ReadonlyMap<string, ResultPortStatistics>
    >();
  });

  it("subscribe accepts listener and returns unsubscribe", () => {
    expectTypeOf<ResultDataSource["subscribe"]>().toEqualTypeOf<
      (listener: (event: ResultDataEvent) => void) => () => void
    >();
  });
});

describe("ResultDataEvent — Type Level", () => {
  it("chain-registered event has chainId", () => {
    const event: ResultDataEvent = { type: "chain-registered", chainId: "test" };
    if (event.type === "chain-registered") {
      expectTypeOf(event.chainId).toEqualTypeOf<string>();
    }
  });

  it("execution-added event has chainId and executionId", () => {
    const event: ResultDataEvent = {
      type: "execution-added",
      chainId: "c",
      executionId: "e",
    };
    if (event.type === "execution-added") {
      expectTypeOf(event.chainId).toEqualTypeOf<string>();
      expectTypeOf(event.executionId).toEqualTypeOf<string>();
    }
  });
});
