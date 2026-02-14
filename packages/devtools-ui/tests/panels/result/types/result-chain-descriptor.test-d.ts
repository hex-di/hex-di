/**
 * Type-level tests for ResultChainDescriptor and ResultOperationDescriptor.
 *
 * Spec: 01-overview.md Section 1.4.1, 1.4.2, 1.4.3
 */

import { describe, it, expectTypeOf } from "vitest";
import type {
  ResultChainDescriptor,
  ResultOperationDescriptor,
  ResultMethodName,
} from "../../../../src/panels/result/types.js";

describe("ResultChainDescriptor — Type Level", () => {
  it("chain.chainId is string", () => {
    expectTypeOf<ResultChainDescriptor["chainId"]>().toEqualTypeOf<string>();
  });

  it("chain.operations is readonly ResultOperationDescriptor[]", () => {
    expectTypeOf<ResultChainDescriptor["operations"]>().toEqualTypeOf<
      readonly ResultOperationDescriptor[]
    >();
  });

  it("chain.isAsync is boolean", () => {
    expectTypeOf<ResultChainDescriptor["isAsync"]>().toEqualTypeOf<boolean>();
  });

  it("chain.portName is string | undefined", () => {
    expectTypeOf<ResultChainDescriptor["portName"]>().toEqualTypeOf<string | undefined>();
  });
});

describe("ResultOperationDescriptor — Type Level", () => {
  it("op.method is ResultMethodName", () => {
    expectTypeOf<ResultOperationDescriptor["method"]>().toEqualTypeOf<ResultMethodName>();
  });

  it("op.inputTrack is 'ok' | 'err' | 'both'", () => {
    expectTypeOf<ResultOperationDescriptor["inputTrack"]>().toEqualTypeOf<"ok" | "err" | "both">();
  });

  it("op.canSwitch is boolean", () => {
    expectTypeOf<ResultOperationDescriptor["canSwitch"]>().toEqualTypeOf<boolean>();
  });

  it("op.isTerminal is boolean", () => {
    expectTypeOf<ResultOperationDescriptor["isTerminal"]>().toEqualTypeOf<boolean>();
  });
});
