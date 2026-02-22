/**
 * DRR-2 Regression Test: fromJSON backward compatibility across schema versions.
 *
 * Verifies that fromJSON() and fromOptionJSON() accept all historical serialization
 * formats defined in the schema-versions.json fixture file. This test blocks PRs
 * via CI Job 3 (Unit Tests) to enforce DRR-2 compliance.
 *
 * @see spec/result/compliance/gxp.md — DRR-2 Regression Testing
 * @see spec/result/compliance/gxp.md — Data Retention Guidance
 */
import { describe, it, expect } from "vitest";
import { fromJSON, isResult } from "../index.js";
import type { ResultJSON } from "../interop/from-json.js";
import fixtures from "./__fixtures__/schema-versions.json";

// DRR-2: fromJSON accepts all prior schema versions
describe("DRR-2: fromJSON backward compatibility", () => {
  const resultFixtures = fixtures.filter(
    (f) => f.expectedTag === "Ok" || f.expectedTag === "Err",
  );

  for (const fixture of resultFixtures) {
    describe(fixture.description, () => {
      it("restores a genuine Result (isResult returns true)", () => {
        const restored = fromJSON(fixture.json as ResultJSON<unknown, unknown>);
        expect(isResult(restored)).toBe(true);
      });

      it("restores a frozen Result", () => {
        const restored = fromJSON(fixture.json as ResultJSON<unknown, unknown>);
        expect(Object.isFrozen(restored)).toBe(true);
      });

      it("restores the correct _tag", () => {
        const restored = fromJSON(fixture.json as ResultJSON<unknown, unknown>);
        expect(restored.isOk()).toBe(fixture.expectedTag === "Ok");
        expect(restored.isErr()).toBe(fixture.expectedTag === "Err");
      });

      it("restores the correct payload", () => {
        const restored = fromJSON(fixture.json as ResultJSON<unknown, unknown>);
        if (fixture.expectedTag === "Ok") {
          expect(
            restored.match(
              (value: unknown) => value,
              () => undefined,
            ),
          ).toEqual(fixture.expectedPayload);
        } else {
          expect(
            restored.match(
              () => undefined,
              (error: unknown) => error,
            ),
          ).toEqual(fixture.expectedPayload);
        }
      });
    });
  }
});

// DRR-4: fromOptionJSON accepts all prior schema versions
import { fromOptionJSON, isOption } from "../option/index.js";
import type { OptionJSON } from "../option/from-option-json.js";

describe("DRR-4: fromOptionJSON backward compatibility", () => {
  const optionFixtures = fixtures.filter(
    (f) => f.expectedTag === "Some" || f.expectedTag === "None",
  );

  for (const fixture of optionFixtures) {
    describe(fixture.description, () => {
      it("restores a genuine Option (isOption returns true)", () => {
        const restored = fromOptionJSON(fixture.json as OptionJSON<unknown>);
        expect(isOption(restored)).toBe(true);
      });

      it("restores a frozen Option", () => {
        const restored = fromOptionJSON(fixture.json as OptionJSON<unknown>);
        expect(Object.isFrozen(restored)).toBe(true);
      });

      it("restores the correct _tag", () => {
        const restored = fromOptionJSON(fixture.json as OptionJSON<unknown>);
        expect(restored.isSome()).toBe(fixture.expectedTag === "Some");
        expect(restored.isNone()).toBe(fixture.expectedTag === "None");
      });

      it("restores the correct payload", () => {
        const restored = fromOptionJSON(fixture.json as OptionJSON<unknown>);
        if (fixture.expectedTag === "Some") {
          expect(
            restored.match(
              (value: unknown) => value,
              () => undefined,
            ),
          ).toEqual(fixture.expectedPayload);
        } else {
          expect(restored.isNone()).toBe(true);
        }
      });
    });
  }
});
