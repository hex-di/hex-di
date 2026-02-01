/**
 * Type-level tests for tuple preservation in TRequiresTuple.
 *
 * ## Key Finding
 *
 * The `createAdapter` function preserves tuple types for the `requires` property.
 * The `TRequiresTuple` default in `Adapter` type being `readonly TRequires[]` (array)
 * is intentional and only used for type constraint satisfaction.
 * In practice, `createAdapter` explicitly passes the tuple type.
 *
 * ## Evidence
 *
 * The return type of `createAdapter` is:
 * ```typescript
 * Adapter<TProvides, TupleToUnion<TRequires>, TLifetime, Sync, False, TRequires>
 *                                                                    ^^^^^^^^
 *                                                              Explicit tuple type
 * ```
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";

// =============================================================================
// Test Fixtures
// =============================================================================

const LoggerPort = createPort<{ log: () => void }, "Logger">({ name: "Logger" });
const DatabasePort = createPort<{ query: () => void }, "Database">({ name: "Database" });
const CachePort = createPort<{ get: () => void }, "Cache">({ name: "Cache" });
const UserPort = createPort<{ getUser: () => void }, "User">({ name: "User" });

// =============================================================================
// Tuple Preservation Tests
// =============================================================================

describe("TRequiresTuple preserves tuple types", () => {
  describe("createAdapter preserves exact tuple type", () => {
    it("preserves tuple with two elements", () => {
      const adapter = createAdapter({
        provides: UserPort,
        requires: [LoggerPort, DatabasePort],
        lifetime: "singleton",
        factory: () => ({ getUser: () => {} }),
      });

      type RequiresType = (typeof adapter)["requires"];

      // Verify it's a 2-element tuple, not an array
      // If it were an array, length would be `number`, not `2`
      type Length = RequiresType["length"];
      expectTypeOf<Length>().toEqualTypeOf<2>();

      // Verify index access returns specific port types
      type First = RequiresType[0];
      type Second = RequiresType[1];

      expectTypeOf<First>().toEqualTypeOf(LoggerPort);
      expectTypeOf<Second>().toEqualTypeOf(DatabasePort);
    });

    it("preserves tuple with three elements", () => {
      const adapter = createAdapter({
        provides: UserPort,
        requires: [LoggerPort, DatabasePort, CachePort],
        lifetime: "singleton",
        factory: () => ({ getUser: () => {} }),
      });

      type RequiresType = (typeof adapter)["requires"];
      type Length = RequiresType["length"];

      expectTypeOf<Length>().toEqualTypeOf<3>();
    });

    it("preserves empty tuple", () => {
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      type RequiresType = (typeof adapter)["requires"];

      // Empty tuple should have length 0
      type Length = RequiresType["length"];
      expectTypeOf<Length>().toEqualTypeOf<0>();

      // Should be exactly `readonly []`
      expectTypeOf<RequiresType>().toEqualTypeOf<readonly []>();
    });

    it("preserves single element tuple", () => {
      const adapter = createAdapter({
        provides: UserPort,
        requires: [LoggerPort],
        lifetime: "singleton",
        factory: () => ({ getUser: () => {} }),
      });

      type RequiresType = (typeof adapter)["requires"];
      type Length = RequiresType["length"];

      expectTypeOf<Length>().toEqualTypeOf<1>();
    });
  });

  describe("tuple order is preserved", () => {
    it("different order produces different tuple type", () => {
      const adapterAB = createAdapter({
        provides: UserPort,
        requires: [LoggerPort, DatabasePort],
        lifetime: "singleton",
        factory: () => ({ getUser: () => {} }),
      });

      const adapterBA = createAdapter({
        provides: CachePort,
        requires: [DatabasePort, LoggerPort],
        lifetime: "singleton",
        factory: () => ({ get: () => {} }),
      });

      type RequiresAB = (typeof adapterAB)["requires"];
      type RequiresBA = (typeof adapterBA)["requires"];

      // Different order = different tuple types
      // [LoggerPort, DatabasePort] !== [DatabasePort, LoggerPort]
      type AreSame = RequiresAB extends RequiresBA ? true : false;
      expectTypeOf<AreSame>().toEqualTypeOf<false>();
    });
  });

  describe("documentation: TRequiresTuple default explanation", () => {
    it("documents why default is array and why it works", () => {
      // The Adapter type has this default for TRequiresTuple:
      //   [TRequires] extends [never] ? readonly [] : readonly TRequires[]
      //
      // This default produces an array type, NOT a tuple.
      // However, this is intentional because:
      //
      // 1. The default exists only for type constraint satisfaction
      // 2. createAdapter() ALWAYS provides explicit tuple type as 6th type param
      // 3. The default is never used in actual adapter construction
      //
      // From factory.ts line 320:
      //   Adapter<TProvides, TupleToUnion<TRequires>, TLifetime, Sync, False, TRequires>
      //                                                                    ^^^^^^^^
      //   The actual tuple type is passed here, not the default

      // This test documents that tuple preservation works correctly
      // despite the array default in the type definition
      expectTypeOf<true>().toEqualTypeOf<true>();
    });
  });
});
