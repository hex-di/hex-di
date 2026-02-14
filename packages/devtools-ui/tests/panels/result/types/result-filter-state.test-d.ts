/**
 * Type-level tests for ResultFilterState.
 *
 * Spec: 01-overview.md Section 1.4.11
 */

import { describe, it, expectTypeOf } from "vitest";
import type { ResultFilterState } from "../../../../src/panels/result/types.js";

describe("ResultFilterState — Type Level", () => {
  it("filter.chainSearch is string", () => {
    expectTypeOf<ResultFilterState["chainSearch"]>().toEqualTypeOf<string>();
  });

  it("filter.portName is string | undefined", () => {
    expectTypeOf<ResultFilterState["portName"]>().toEqualTypeOf<string | undefined>();
  });

  it("filter.status is 'all' | 'ok' | 'err' | 'mixed'", () => {
    expectTypeOf<ResultFilterState["status"]>().toEqualTypeOf<"all" | "ok" | "err" | "mixed">();
  });

  it("filter.errorType is string | undefined", () => {
    expectTypeOf<ResultFilterState["errorType"]>().toEqualTypeOf<string | undefined>();
  });
});
