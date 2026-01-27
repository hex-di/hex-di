import { describe, it, expectTypeOf } from "vitest";
import type { FindAnyCaptiveDependency } from "../src/validation/types/captive/detection.js";
import type { TransformLazyPortNamesToOriginal } from "../src/validation/types/lazy-transforms.js";

describe("Isolated captive check with transformation", () => {
  it("should detect captive with transformed lazy name", () => {
    // Simulated lifetime map
    type LifetimeMap = {
      TransientService: 3; // transient
      SingletonService: 1; // singleton
    };

    // Lazy port name that needs transformation
    type LazyName = "LazyTransientService";

    // Transform it
    type TransformedName = TransformLazyPortNamesToOriginal<LazyName>;
    expectTypeOf<TransformedName>().toEqualTypeOf<"TransientService">();

    // Check for captive: singleton (1) depending on transient (3)
    type CaptiveCheck = FindAnyCaptiveDependency<
      LifetimeMap,
      1, // singleton level
      TransformedName
    >;

    // Should detect "TransientService" as captive
    expectTypeOf<CaptiveCheck>().toEqualTypeOf<"TransientService">();
  });
});
