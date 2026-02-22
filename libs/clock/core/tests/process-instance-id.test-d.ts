/**
 * Process instance ID type-level tests — DoD 34
 */

import { describe, it, expectTypeOf } from "vitest";
import { createProcessInstanceId } from "../src/process-instance.js";

// =============================================================================
// DoD 34: Process Instance ID — type-level
// =============================================================================

describe("createProcessInstanceId type signature", () => {
  it("createProcessInstanceId return type is string", () => {
    expectTypeOf(createProcessInstanceId).returns.toEqualTypeOf<string>();
  });

  it("createProcessInstanceId accepts no arguments", () => {
    expectTypeOf(createProcessInstanceId).parameters.toEqualTypeOf<[]>();
  });
});
