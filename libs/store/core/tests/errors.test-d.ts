/**
 * Type-level tests for store tagged errors
 */

import { describe, expectTypeOf, it } from "vitest";
import type {
  DisposedStateAccess,
  DerivedComputationFailed,
  AsyncDerivedExhausted,
  CircularDerivedDependency,
  BatchExecutionFailed,
  WaitForStateTimeout,
  EffectFailedError,
  EffectErrorHandlerError,
  AsyncDerivedSelectError,
  HydrationError,
  StoreRuntimeError,
  StoreError,
  StoreProgrammingError,
} from "../src/index.js";

// =============================================================================
// DisposedStateAccess
// =============================================================================

describe("DisposedStateAccess", () => {
  it("_tag is literal 'DisposedStateAccess'", () => {
    expectTypeOf<DisposedStateAccess["_tag"]>().toEqualTypeOf<"DisposedStateAccess">();
  });

  it("code is literal 'DISPOSED_STATE_ACCESS'", () => {
    expectTypeOf<DisposedStateAccess["code"]>().toEqualTypeOf<"DISPOSED_STATE_ACCESS">();
  });

  it("isProgrammingError is literal true", () => {
    expectTypeOf<DisposedStateAccess["isProgrammingError"]>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// DerivedComputationFailed
// =============================================================================

describe("DerivedComputationFailed", () => {
  it("_tag is literal 'DerivedComputationFailed'", () => {
    expectTypeOf<DerivedComputationFailed["_tag"]>().toEqualTypeOf<"DerivedComputationFailed">();
  });

  it("isProgrammingError is literal false", () => {
    expectTypeOf<DerivedComputationFailed["isProgrammingError"]>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// AsyncDerivedExhausted
// =============================================================================

describe("AsyncDerivedExhausted", () => {
  it("_tag is literal 'AsyncDerivedExhausted'", () => {
    expectTypeOf<AsyncDerivedExhausted["_tag"]>().toEqualTypeOf<"AsyncDerivedExhausted">();
  });

  it("isProgrammingError is literal true", () => {
    expectTypeOf<AsyncDerivedExhausted["isProgrammingError"]>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// CircularDerivedDependency
// =============================================================================

describe("CircularDerivedDependency", () => {
  it("_tag is literal 'CircularDerivedDependency'", () => {
    expectTypeOf<CircularDerivedDependency["_tag"]>().toEqualTypeOf<"CircularDerivedDependency">();
  });

  it("isProgrammingError is literal true", () => {
    expectTypeOf<CircularDerivedDependency["isProgrammingError"]>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// BatchExecutionFailed
// =============================================================================

describe("BatchExecutionFailed", () => {
  it("_tag is literal 'BatchExecutionFailed'", () => {
    expectTypeOf<BatchExecutionFailed["_tag"]>().toEqualTypeOf<"BatchExecutionFailed">();
  });

  it("isProgrammingError is literal false", () => {
    expectTypeOf<BatchExecutionFailed["isProgrammingError"]>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// WaitForStateTimeout
// =============================================================================

describe("WaitForStateTimeout", () => {
  it("_tag is literal 'WaitForStateTimeout'", () => {
    expectTypeOf<WaitForStateTimeout["_tag"]>().toEqualTypeOf<"WaitForStateTimeout">();
  });

  it("code is literal 'WAIT_FOR_STATE_TIMEOUT'", () => {
    expectTypeOf<WaitForStateTimeout["code"]>().toEqualTypeOf<"WAIT_FOR_STATE_TIMEOUT">();
  });
});

// =============================================================================
// EffectErrorHandlerError (tagged)
// =============================================================================

describe("EffectErrorHandlerError", () => {
  it("_tag is literal 'EffectErrorHandlerFailed'", () => {
    expectTypeOf<EffectErrorHandlerError["_tag"]>().toEqualTypeOf<"EffectErrorHandlerFailed">();
  });

  it("has portName, actionName, originalError, handlerError fields", () => {
    expectTypeOf<EffectErrorHandlerError["portName"]>().toEqualTypeOf<string>();
    expectTypeOf<EffectErrorHandlerError["actionName"]>().toEqualTypeOf<string>();
    expectTypeOf<EffectErrorHandlerError["originalError"]>().toEqualTypeOf<EffectFailedError>();
    expectTypeOf<EffectErrorHandlerError["handlerError"]>().toEqualTypeOf<unknown>();
  });
});

// =============================================================================
// Tagged Error Interfaces (_tag literal types)
// =============================================================================

describe("EffectFailedError", () => {
  it("_tag is literal 'EffectFailed'", () => {
    expectTypeOf<EffectFailedError["_tag"]>().toEqualTypeOf<"EffectFailed">();
  });
});

describe("AsyncDerivedSelectError", () => {
  it("_tag is literal 'AsyncDerivedSelectFailed'", () => {
    expectTypeOf<AsyncDerivedSelectError["_tag"]>().toEqualTypeOf<"AsyncDerivedSelectFailed">();
  });
});

describe("HydrationError", () => {
  it("_tag is literal 'HydrationFailed'", () => {
    expectTypeOf<HydrationError["_tag"]>().toEqualTypeOf<"HydrationFailed">();
  });
});

// =============================================================================
// StoreRuntimeError — fully _tag-discriminable
// =============================================================================

describe("StoreRuntimeError is _tag-discriminable", () => {
  it("all members have _tag field", () => {
    expectTypeOf<StoreRuntimeError["_tag"]>().toEqualTypeOf<
      "EffectFailed" | "EffectErrorHandlerFailed" | "EffectAdapterFailed"
    >();
  });
});

// =============================================================================
// DisposedStateAccess — operation union type
// =============================================================================

describe("DisposedStateAccess operation union", () => {
  it("operation is the correct union type", () => {
    expectTypeOf<DisposedStateAccess["operation"]>().toEqualTypeOf<
      "state" | "value" | "actions" | "subscribe" | "set" | "update" | "refresh"
    >();
  });
});

// =============================================================================
// StoreError union type
// =============================================================================

describe("StoreError union", () => {
  it("is the union of all thrown store errors", () => {
    expectTypeOf<StoreError["_tag"]>().toEqualTypeOf<
      | "DisposedStateAccess"
      | "DerivedComputationFailed"
      | "AsyncDerivedExhausted"
      | "CircularDerivedDependency"
      | "BatchExecutionFailed"
      | "WaitForStateTimeout"
      | "InvalidComputedGetter"
    >();
  });
});

// =============================================================================
// StoreProgrammingError union type
// =============================================================================

describe("StoreProgrammingError union", () => {
  it("includes only errors where isProgrammingError is true", () => {
    expectTypeOf<StoreProgrammingError["_tag"]>().toEqualTypeOf<
      | "DisposedStateAccess"
      | "AsyncDerivedExhausted"
      | "CircularDerivedDependency"
      | "InvalidComputedGetter"
    >();
  });
});
