/**
 * Deserialization type-level tests — DoD 8b/13
 */

import { describe, it, expectTypeOf } from "vitest";
import { deserializeTemporalContext } from "../src/deserialization.js";
import type { DeserializationError } from "../src/deserialization.js";
import type { TemporalContext } from "../src/temporal-context.js";
import type { Result } from "@hex-di/result";

describe("Deserialization type shape", () => {
  it("deserializeTemporalContext accepts unknown and returns Result<TemporalContext, DeserializationError>", () => {
    expectTypeOf(deserializeTemporalContext).parameters.toEqualTypeOf<[unknown]>();
    expectTypeOf(deserializeTemporalContext).returns.toEqualTypeOf<
      Result<TemporalContext, DeserializationError>
    >();
  });

  it("DeserializationError has readonly _tag, schemaType, expectedVersions, actualVersion, field, message", () => {
    expectTypeOf<DeserializationError["_tag"]>().toEqualTypeOf<"DeserializationError">();
    expectTypeOf<DeserializationError["schemaType"]>().toEqualTypeOf<string>();
    expectTypeOf<DeserializationError["expectedVersions"]>().toEqualTypeOf<
      ReadonlyArray<number>
    >();
    expectTypeOf<DeserializationError["actualVersion"]>().toEqualTypeOf<number | undefined>();
    expectTypeOf<DeserializationError["field"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<DeserializationError["message"]>().toEqualTypeOf<string>();
  });
});
