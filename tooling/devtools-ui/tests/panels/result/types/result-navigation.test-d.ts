/**
 * Type-level tests for ResultPanelNavigation and ResultViewId.
 *
 * Spec: 01-overview.md Section 1.4.12
 */

import { describe, it, expectTypeOf } from "vitest";
import type { ResultPanelNavigation, ResultViewId } from "../../../../src/panels/result/types.js";

describe("ResultPanelNavigation — Type Level", () => {
  it("nav.chainId is string | undefined", () => {
    expectTypeOf<ResultPanelNavigation["chainId"]>().toEqualTypeOf<string | undefined>();
  });

  it("nav.executionId is string | undefined", () => {
    expectTypeOf<ResultPanelNavigation["executionId"]>().toEqualTypeOf<string | undefined>();
  });

  it("nav.stepIndex is number | undefined", () => {
    expectTypeOf<ResultPanelNavigation["stepIndex"]>().toEqualTypeOf<number | undefined>();
  });

  it("nav.view is ResultViewId | undefined", () => {
    expectTypeOf<ResultPanelNavigation["view"]>().toEqualTypeOf<ResultViewId | undefined>();
  });
});

describe("ResultViewId — Type Level", () => {
  it("is the union of 7 view identifiers", () => {
    expectTypeOf<ResultViewId>().toEqualTypeOf<
      "railway" | "log" | "cases" | "sankey" | "waterfall" | "combinator" | "overview"
    >();
  });
});
