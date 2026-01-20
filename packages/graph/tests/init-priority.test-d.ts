/**
 * Type-level tests for init priority infrastructure.
 *
 * These tests verify the type utilities that could be used for future
 * compile-time init priority validation.
 */

import { describe, it, expectTypeOf } from "vitest";
import type {
  PriorityBand,
  GetBandLevel,
  IsValidBandOrder,
  EmptyInitPriorityMap,
  AddInitPriority,
  GetInitPriority,
  InferAdapterInitPriority,
  MergeInitPriorityMaps,
  AddManyInitPriorities,
} from "../src/validation/init-priority.js";
import { createPort } from "@hex-di/ports";
import { createAsyncAdapter } from "../src/index.js";

// =============================================================================
// Priority Band Tests
// =============================================================================

describe("Priority bands", () => {
  describe("GetBandLevel", () => {
    it("maps early to 0", () => {
      expectTypeOf<GetBandLevel<"early">>().toEqualTypeOf<0>();
    });

    it("maps normal to 1", () => {
      expectTypeOf<GetBandLevel<"normal">>().toEqualTypeOf<1>();
    });

    it("maps late to 2", () => {
      expectTypeOf<GetBandLevel<"late">>().toEqualTypeOf<2>();
    });
  });

  describe("IsValidBandOrder", () => {
    describe("early dependencies", () => {
      it("early can depend on early", () => {
        expectTypeOf<IsValidBandOrder<"early", "early">>().toEqualTypeOf<true>();
      });

      it("normal can depend on early", () => {
        expectTypeOf<IsValidBandOrder<"early", "normal">>().toEqualTypeOf<true>();
      });

      it("late can depend on early", () => {
        expectTypeOf<IsValidBandOrder<"early", "late">>().toEqualTypeOf<true>();
      });
    });

    describe("normal dependencies", () => {
      it("early cannot depend on normal", () => {
        expectTypeOf<IsValidBandOrder<"normal", "early">>().toEqualTypeOf<false>();
      });

      it("normal can depend on normal", () => {
        expectTypeOf<IsValidBandOrder<"normal", "normal">>().toEqualTypeOf<true>();
      });

      it("late can depend on normal", () => {
        expectTypeOf<IsValidBandOrder<"normal", "late">>().toEqualTypeOf<true>();
      });
    });

    describe("late dependencies", () => {
      it("early cannot depend on late", () => {
        expectTypeOf<IsValidBandOrder<"late", "early">>().toEqualTypeOf<false>();
      });

      it("normal cannot depend on late", () => {
        expectTypeOf<IsValidBandOrder<"late", "normal">>().toEqualTypeOf<false>();
      });

      it("late can depend on late", () => {
        expectTypeOf<IsValidBandOrder<"late", "late">>().toEqualTypeOf<true>();
      });
    });
  });
});

// =============================================================================
// Init Priority Map Tests
// =============================================================================

describe("Init priority map operations", () => {
  describe("AddInitPriority", () => {
    it("adds priority to empty map", () => {
      type Map = AddInitPriority<EmptyInitPriorityMap, "Config", 10>;

      expectTypeOf<Map>().toMatchTypeOf<{ Config: 10 }>();
    });

    it("adds multiple priorities", () => {
      type Map1 = AddInitPriority<EmptyInitPriorityMap, "Config", 10>;
      type Map2 = AddInitPriority<Map1, "Database", 20>;

      expectTypeOf<Map2>().toMatchTypeOf<{ Config: 10; Database: 20 }>();
    });

    it("handles default priority", () => {
      type Map = AddInitPriority<EmptyInitPriorityMap, "Logger", "default">;

      expectTypeOf<Map>().toMatchTypeOf<{ Logger: "default" }>();
    });
  });

  describe("GetInitPriority", () => {
    it("returns priority for known port", () => {
      type Map = { Config: 10; Database: 20 };

      expectTypeOf<GetInitPriority<Map, "Config">>().toEqualTypeOf<10>();
      expectTypeOf<GetInitPriority<Map, "Database">>().toEqualTypeOf<20>();
    });

    it("returns default for unknown port", () => {
      type Map = { Config: 10 };

      expectTypeOf<GetInitPriority<Map, "Unknown">>().toEqualTypeOf<"default">();
    });

    it("returns default for empty map", () => {
      expectTypeOf<GetInitPriority<EmptyInitPriorityMap, "Any">>().toEqualTypeOf<"default">();
    });
  });

  describe("MergeInitPriorityMaps", () => {
    it("merges two maps", () => {
      type MapA = { Config: 10 };
      type MapB = { Database: 20 };
      type Merged = MergeInitPriorityMaps<MapA, MapB>;

      // Check that both keys exist
      expectTypeOf<GetInitPriority<Merged, "Config">>().toEqualTypeOf<10>();
      expectTypeOf<GetInitPriority<Merged, "Database">>().toEqualTypeOf<20>();
    });

    it("intersection keeps both types for same key", () => {
      type MapA = { Config: 10 };
      type MapB = { Config: 50 };
      type Merged = MergeInitPriorityMaps<MapA, MapB>;

      // In TypeScript intersection, same-key types intersect (10 & 50 = never)
      // This is expected behavior - merging maps with same keys should be avoided
      expectTypeOf<GetInitPriority<Merged, "Config">>().toEqualTypeOf<never>();
    });
  });
});

// =============================================================================
// Adapter Init Priority Extraction Tests
// =============================================================================

describe("InferAdapterInitPriority", () => {
  it("returns default when initPriority is optional (current Adapter behavior)", () => {
    const ConfigPort = createPort<"Config", { url: string }>("Config");

    const adapter = createAsyncAdapter({
      provides: ConfigPort,
      requires: [],
      factory: async () => ({ url: "http://example.com" }),
      initPriority: 10,
    });

    type Priority = InferAdapterInitPriority<typeof adapter>;

    // The Adapter type has initPriority?: number (optional)
    // When optional, TypeScript doesn't guarantee the property exists
    // So InferAdapterInitPriority returns "default"
    // This is a current limitation - would need type-level initPriority tracking
    expectTypeOf<Priority>().toEqualTypeOf<"default">();
  });

  it("returns default for adapter without explicit priority", () => {
    const LoggerPort = createPort<"Logger", { log: () => void }>("Logger");

    const adapter = createAsyncAdapter({
      provides: LoggerPort,
      requires: [],
      factory: async () => ({ log: () => {} }),
    });

    type Priority = InferAdapterInitPriority<typeof adapter>;

    expectTypeOf<Priority>().toEqualTypeOf<"default">();
  });

  it("handles literal types when explicitly typed (ideal scenario)", () => {
    // When types are explicit literals (not inferred from runtime),
    // InferAdapterInitPriority works correctly
    // This is the target behavior for future implementation
    type WithZero = InferAdapterInitPriority<{ initPriority: 0 }>;
    type WithHundred = InferAdapterInitPriority<{ initPriority: 100 }>;
    type WithMax = InferAdapterInitPriority<{ initPriority: 1000 }>;

    expectTypeOf<WithZero>().toEqualTypeOf<0>();
    expectTypeOf<WithHundred>().toEqualTypeOf<100>();
    expectTypeOf<WithMax>().toEqualTypeOf<1000>();
  });

  it("returns default for types without initPriority property", () => {
    type NoProperty = InferAdapterInitPriority<{ something: "else" }>;

    expectTypeOf<NoProperty>().toEqualTypeOf<"default">();
  });
});

// =============================================================================
// AddManyInitPriorities Tests
// =============================================================================

describe("AddManyInitPriorities", () => {
  it("adds priorities from array of adapters (with explicit types)", () => {
    // Since real adapters have optional initPriority, we test with explicit types
    type MockAdapter1 = {
      provides: { __portName: "Config" };
      initPriority: 10;
    };
    type MockAdapter2 = {
      provides: { __portName: "Database" };
      initPriority: 20;
    };

    type Adapters = readonly [MockAdapter1, MockAdapter2];
    type Map = AddManyInitPriorities<EmptyInitPriorityMap, Adapters>;

    expectTypeOf<GetInitPriority<Map, "Config">>().toEqualTypeOf<10>();
    expectTypeOf<GetInitPriority<Map, "Database">>().toEqualTypeOf<20>();
  });

  it("uses default when initPriority is not specified", () => {
    type MockAdapterNoInit = {
      provides: { __portName: "Logger" };
      // No initPriority
    };

    type Adapters = readonly [MockAdapterNoInit];
    type Map = AddManyInitPriorities<EmptyInitPriorityMap, Adapters>;

    expectTypeOf<GetInitPriority<Map, "Logger">>().toEqualTypeOf<"default">();
  });

  it("handles empty array", () => {
    type Map = AddManyInitPriorities<EmptyInitPriorityMap, readonly []>;

    expectTypeOf<Map>().toEqualTypeOf<EmptyInitPriorityMap>();
  });

  it("handles mixed adapters with and without initPriority", () => {
    type AdapterWithPriority = {
      provides: { __portName: "Config" };
      initPriority: 10;
    };
    type AdapterWithoutPriority = {
      provides: { __portName: "Logger" };
    };

    type Adapters = readonly [AdapterWithPriority, AdapterWithoutPriority];
    type Map = AddManyInitPriorities<EmptyInitPriorityMap, Adapters>;

    expectTypeOf<GetInitPriority<Map, "Config">>().toEqualTypeOf<10>();
    expectTypeOf<GetInitPriority<Map, "Logger">>().toEqualTypeOf<"default">();
  });
});

// =============================================================================
// Priority Band Usage Example Tests
// =============================================================================

describe("Priority band usage scenarios", () => {
  it("validates typical initialization order", () => {
    // Config should initialize before Database
    // Config: early, Database: normal
    type ConfigBand = "early";
    type DatabaseBand = "normal";

    // Database depends on Config
    type IsValid = IsValidBandOrder<ConfigBand, DatabaseBand>;

    expectTypeOf<IsValid>().toEqualTypeOf<true>();
  });

  it("rejects invalid initialization order", () => {
    // If Database is early but depends on Config which is normal,
    // that's invalid - Database would start before Config finishes
    type ConfigBand = "normal";
    type DatabaseBand = "early";

    type IsValid = IsValidBandOrder<ConfigBand, DatabaseBand>;

    expectTypeOf<IsValid>().toEqualTypeOf<false>();
  });

  it("allows same-band dependencies", () => {
    // Multiple services at same priority level is fine
    type ServiceABand = "normal";
    type ServiceBBand = "normal";

    type IsValid = IsValidBandOrder<ServiceABand, ServiceBBand>;

    expectTypeOf<IsValid>().toEqualTypeOf<true>();
  });
});
