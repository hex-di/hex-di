/**
 * Type-level tests for error code consistency.
 *
 * ## Issue Being Fixed
 *
 * Error codes were inconsistent between type-level messages and runtime error parsing:
 * - HEX010 was used for both "Depth limit exceeded" (type-level) and "Missing provides" (runtime)
 * - HEX011 was used for both "Malformed adapter" (type-level) and "Invalid provides" (runtime)
 *
 * ## Solution
 *
 * Align type-level error codes with runtime error codes defined in error-parsing.ts:
 * - DepthLimitError: HEX010 → HEX007 (matches DEPTH_LIMIT_EXCEEDED)
 * - MalformedAdapterErrorMessage: HEX011 → HEX020 (new code for type-level only)
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import type {
  DepthLimitError,
  DepthLimitWarning,
  MalformedAdapterErrorMessage,
  DuplicateErrorMessage,
  CircularErrorMessage,
  CaptiveErrorMessage,
  ReverseCaptiveErrorMessage,
  LifetimeInconsistencyErrorMessage,
  SelfDependencyErrorMessage,
  OverrideWithoutParentErrorMessage,
  InvalidLifetimeErrorMessage,
} from "../src/validation/types/error-messages.js";
import type { OverrideTypeMismatchError } from "../src/builder/types/merge.js";
import type { MergeConflictErrorMessage } from "../src/validation/types/merge-conflict.js";

// =============================================================================
// Error Code Consistency Tests
// =============================================================================

describe("Error code consistency with error-parsing.ts", () => {
  describe("HEX001: DUPLICATE_ADAPTER", () => {
    it("DuplicateErrorMessage should use HEX001", () => {
      type Message = DuplicateErrorMessage<"Test">;
      type HasCorrectCode = Message extends `ERROR[HEX001]: ${string}` ? true : false;
      expectTypeOf<HasCorrectCode>().toEqualTypeOf<true>();
    });
  });

  describe("HEX002: CIRCULAR_DEPENDENCY", () => {
    it("CircularErrorMessage should use HEX002", () => {
      type Message = CircularErrorMessage<"A -> B -> A">;
      type HasCorrectCode = Message extends `ERROR[HEX002]: ${string}` ? true : false;
      expectTypeOf<HasCorrectCode>().toEqualTypeOf<true>();
    });
  });

  describe("HEX003: CAPTIVE_DEPENDENCY", () => {
    it("CaptiveErrorMessage should use HEX003", () => {
      type Message = CaptiveErrorMessage<"Scoped", "scoped", "Singleton", "singleton">;
      type HasCorrectCode = Message extends `ERROR[HEX003]: ${string}` ? true : false;
      expectTypeOf<HasCorrectCode>().toEqualTypeOf<true>();
    });
  });

  describe("HEX004: REVERSE_CAPTIVE_DEPENDENCY", () => {
    it("ReverseCaptiveErrorMessage should use HEX004", () => {
      type Message = ReverseCaptiveErrorMessage<"Scoped", "scoped", "Singleton", "singleton">;
      type HasCorrectCode = Message extends `ERROR[HEX004]: ${string}` ? true : false;
      expectTypeOf<HasCorrectCode>().toEqualTypeOf<true>();
    });
  });

  describe("HEX005: LIFETIME_INCONSISTENCY", () => {
    it("LifetimeInconsistencyErrorMessage should use HEX005", () => {
      type Message = LifetimeInconsistencyErrorMessage<"Test", "singleton", "scoped">;
      type HasCorrectCode = Message extends `ERROR[HEX005]: ${string}` ? true : false;
      expectTypeOf<HasCorrectCode>().toEqualTypeOf<true>();
    });
  });

  describe("HEX006: SELF_DEPENDENCY", () => {
    it("SelfDependencyErrorMessage should use HEX006", () => {
      type Message = SelfDependencyErrorMessage<"Test">;
      type HasCorrectCode = Message extends `ERROR[HEX006]: ${string}` ? true : false;
      expectTypeOf<HasCorrectCode>().toEqualTypeOf<true>();
    });
  });

  describe("HEX007: DEPTH_LIMIT_EXCEEDED", () => {
    it("DepthLimitWarning should use WARNING[HEX007]", () => {
      type Message = DepthLimitWarning<50>;
      type HasCorrectCode = Message extends `WARNING[HEX007]: ${string}` ? true : false;
      expectTypeOf<HasCorrectCode>().toEqualTypeOf<true>();
    });

    it("DepthLimitError should use ERROR[HEX007] (same code as warning)", () => {
      type Message = DepthLimitError<50>;
      // After fix: should be HEX007, not HEX010
      type HasCorrectCode = Message extends `ERROR[HEX007]: ${string}` ? true : false;
      expectTypeOf<HasCorrectCode>().toEqualTypeOf<true>();
    });

    it("DepthLimitError should NOT use HEX010", () => {
      type Message = DepthLimitError<50>;
      // HEX010 is MISSING_PROVIDES in runtime!
      type UsesWrongCode = Message extends `ERROR[HEX010]: ${string}` ? true : false;
      expectTypeOf<UsesWrongCode>().toEqualTypeOf<false>();
    });
  });

  describe("HEX009: OVERRIDE_WITHOUT_PARENT", () => {
    it("OverrideWithoutParentErrorMessage should use HEX009", () => {
      type Message = OverrideWithoutParentErrorMessage;
      type HasCorrectCode = Message extends `ERROR[HEX009]: ${string}` ? true : false;
      expectTypeOf<HasCorrectCode>().toEqualTypeOf<true>();
    });
  });

  describe("HEX020: MALFORMED_ADAPTER (type-level only)", () => {
    it("MalformedAdapterErrorMessage should use HEX020", () => {
      type Message = MalformedAdapterErrorMessage;
      // After fix: should be HEX020, not HEX011
      type HasCorrectCode = Message extends `ERROR[HEX020]: ${string}` ? true : false;
      expectTypeOf<HasCorrectCode>().toEqualTypeOf<true>();
    });

    it("MalformedAdapterErrorMessage should NOT use HEX011", () => {
      type Message = MalformedAdapterErrorMessage;
      // HEX011 is INVALID_PROVIDES in runtime!
      type UsesWrongCode = Message extends `ERROR[HEX011]: ${string}` ? true : false;
      expectTypeOf<UsesWrongCode>().toEqualTypeOf<false>();
    });
  });

  describe("HEX015: INVALID_LIFETIME_VALUE", () => {
    it("InvalidLifetimeErrorMessage should use HEX015", () => {
      type Message = InvalidLifetimeErrorMessage;
      type HasCorrectCode = Message extends `ERROR[HEX015]: ${string}` ? true : false;
      expectTypeOf<HasCorrectCode>().toEqualTypeOf<true>();
    });

    it("InvalidLifetimeErrorMessage should NOT use HEX008", () => {
      type Message = InvalidLifetimeErrorMessage;
      // HEX008 is MISSING_DEPENDENCY in runtime!
      type UsesWrongCode = Message extends `ERROR[HEX008]: ${string}` ? true : false;
      expectTypeOf<UsesWrongCode>().toEqualTypeOf<false>();
    });
  });

  describe("HEX021: OVERRIDE_TYPE_MISMATCH (type-level only)", () => {
    it("OverrideTypeMismatchError should use HEX021", () => {
      type Message = OverrideTypeMismatchError<"Test">;
      type HasCorrectCode = Message extends `ERROR[HEX021]: ${string}` ? true : false;
      expectTypeOf<HasCorrectCode>().toEqualTypeOf<true>();
    });

    it("OverrideTypeMismatchError should NOT use HEX011", () => {
      type Message = OverrideTypeMismatchError<"Test">;
      // HEX011 is INVALID_PROVIDES in runtime!
      type UsesWrongCode = Message extends `ERROR[HEX011]: ${string}` ? true : false;
      expectTypeOf<UsesWrongCode>().toEqualTypeOf<false>();
    });
  });

  describe("HEX022: MERGE_CONFLICT (type-level only)", () => {
    it("MergeConflictErrorMessage should use HEX022", () => {
      type Message = MergeConflictErrorMessage<"Test", "A", "B">;
      type HasCorrectCode = Message extends `ERROR[HEX022]: ${string}` ? true : false;
      expectTypeOf<HasCorrectCode>().toEqualTypeOf<true>();
    });

    it("MergeConflictErrorMessage should NOT use HEX020", () => {
      type Message = MergeConflictErrorMessage<"Test", "A", "B">;
      // HEX020 is MALFORMED_ADAPTER
      type UsesWrongCode = Message extends `ERROR[HEX020]: ${string}` ? true : false;
      expectTypeOf<UsesWrongCode>().toEqualTypeOf<false>();
    });
  });
});

// =============================================================================
// Runtime Code Allocation Reference
// =============================================================================

/**
 * Reference: Error codes from error-parsing.ts (authoritative source)
 *
 * | Code   | Name                     | Description                                |
 * |--------|--------------------------|-------------------------------------------|
 * | HEX001 | DUPLICATE_ADAPTER        | Port has multiple adapters               |
 * | HEX002 | CIRCULAR_DEPENDENCY      | Dependencies form a cycle                |
 * | HEX003 | CAPTIVE_DEPENDENCY       | Longer-lived depends on shorter-lived    |
 * | HEX004 | REVERSE_CAPTIVE_DEPENDENCY | Later adapter creates captive          |
 * | HEX005 | LIFETIME_INCONSISTENCY   | Merging with different lifetimes         |
 * | HEX006 | SELF_DEPENDENCY          | Adapter requires its own port            |
 * | HEX007 | DEPTH_LIMIT_EXCEEDED     | Type-level depth limit exceeded          |
 * | HEX008 | MISSING_DEPENDENCY       | Required deps not provided               |
 * | HEX009 | OVERRIDE_WITHOUT_PARENT  | override() without forParent()           |
 * | HEX010 | MISSING_PROVIDES         | Adapter config missing 'provides'        |
 * | HEX011 | INVALID_PROVIDES         | 'provides' is not a valid Port           |
 * | HEX012 | INVALID_REQUIRES_TYPE    | 'requires' is not an array               |
 * | HEX013 | INVALID_REQUIRES_ELEMENT | 'requires' element is not a Port         |
 * | HEX014 | INVALID_LIFETIME_TYPE    | 'lifetime' is not a string               |
 * | HEX015 | INVALID_LIFETIME_VALUE   | 'lifetime' is not valid value            |
 * | HEX016 | INVALID_FACTORY          | 'factory' is not a function              |
 * | HEX017 | DUPLICATE_REQUIRES       | 'requires' has duplicate ports           |
 * | HEX018 | INVALID_FINALIZER        | 'finalizer' is not a function            |
 * | HEX019 | INVALID_LAZY_PORT        | Invalid lazy port                        |
 * | HEX020 | MALFORMED_ADAPTER        | Type-level: malformed adapter config     |
 * | HEX021 | OVERRIDE_TYPE_MISMATCH   | Type-level: override port type mismatch  |
 * | HEX022 | MERGE_CONFLICT           | Type-level: merge conflict detection     |
 */
