/**
 * Type-level tests for ResultPanelState.
 *
 * Spec: 14-integration.md Section 14.8
 */

import { describe, it, expectTypeOf } from "vitest";
import type { ResultPanelState, ResultViewId } from "../../../../src/panels/result/types.js";

describe("ResultPanelState — Type Level", () => {
  it("state.selectedChainId is string | undefined", () => {
    expectTypeOf<ResultPanelState["selectedChainId"]>().toEqualTypeOf<string | undefined>();
  });

  it("state.selectedExecutionId is string | undefined", () => {
    expectTypeOf<ResultPanelState["selectedExecutionId"]>().toEqualTypeOf<string | undefined>();
  });

  it("state.selectedStepIndex is number | undefined", () => {
    expectTypeOf<ResultPanelState["selectedStepIndex"]>().toEqualTypeOf<number | undefined>();
  });

  it("state.activeView is ResultViewId", () => {
    expectTypeOf<ResultPanelState["activeView"]>().toEqualTypeOf<ResultViewId>();
  });

  it("state.educationalSidebarOpen is boolean", () => {
    expectTypeOf<ResultPanelState["educationalSidebarOpen"]>().toEqualTypeOf<boolean>();
  });

  it("state.connectionStatus is 'connected' | 'disconnected'", () => {
    expectTypeOf<ResultPanelState["connectionStatus"]>().toEqualTypeOf<
      "connected" | "disconnected"
    >();
  });
});
