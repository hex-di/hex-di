import { describe, it, expect } from "vitest";
import { fromJSON, isResult, fromOptionJSON, isOption } from "../src/index.js";
import fixtures from "../src/core/__fixtures__/schema-versions.json";

// DRR-2: Backward compatibility regression test for fromJSON/fromOptionJSON
// Iterates over schema-versions.json fixture entries and verifies:
// - Brand is present (isResult/isOption)
// - Instance is frozen (Object.isFrozen)
// - Restored value/error matches expectedPayload
// - Restored _tag matches expectedTag
describe("DRR-2: fromJSON/fromOptionJSON backward compatibility", () => {
  for (const entry of fixtures) {
    describe(`schema v${entry.schemaVersion}: ${entry.description}`, () => {
      if (entry.expectedTag === "Ok" || entry.expectedTag === "Err") {
        const restored = fromJSON(entry.json as { _tag: "Ok"; value: unknown } | { _tag: "Err"; error: unknown });

        it("passes isResult() (brand present)", () => {
          expect(isResult(restored)).toBe(true);
        });

        it("is frozen (immutability preserved)", () => {
          expect(Object.isFrozen(restored)).toBe(true);
        });

        it(`has _tag "${entry.expectedTag}"`, () => {
          expect(restored._tag).toBe(entry.expectedTag);
        });

        it("has correct payload", () => {
          if (restored.isOk()) {
            expect(restored.value).toEqual(entry.expectedPayload);
          } else {
            expect(restored.error).toEqual(entry.expectedPayload);
          }
        });
      }

      if (entry.expectedTag === "Some" || entry.expectedTag === "None") {
        const restored = fromOptionJSON(entry.json as { _tag: "Some"; value: unknown } | { _tag: "None" });

        it("passes isOption() (brand present)", () => {
          expect(isOption(restored)).toBe(true);
        });

        it("is frozen (immutability preserved)", () => {
          expect(Object.isFrozen(restored)).toBe(true);
        });

        it(`has _tag "${entry.expectedTag}"`, () => {
          expect(restored._tag).toBe(entry.expectedTag);
        });

        it("has correct payload", () => {
          if (entry.expectedTag === "Some" && restored.isSome()) {
            expect(restored.value).toEqual(entry.expectedPayload);
          }
          // None has no value — expectedPayload is null, which is correct
        });
      }
    });
  }
});
