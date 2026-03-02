/**
 * Type definition bundling tests.
 *
 * Verifies:
 * 1. typeDefinitions map contains all 11 hex-di packages
 * 2. registerTypeDefinitions calls addExtraLib for each package
 * 3. File paths use the correct file:///node_modules/ URI scheme
 * 4. Brand properties use string keys (not computed symbol keys) for cross-TS-version compatibility
 */

import { describe, it, expect, vi } from "vitest";
import { typeDefinitions, registerTypeDefinitions } from "../../src/editor/type-definitions.js";
import type { MonacoTypescriptLanguage } from "../../src/editor/type-definitions.js";

const EXPECTED_PACKAGES = [
  "@hex-di/core",
  "@hex-di/graph",
  "@hex-di/runtime",
  "@hex-di/result",
  "@hex-di/flow",
  "@hex-di/store",
  "@hex-di/query",
  "@hex-di/saga",
  "@hex-di/tracing",
  "@hex-di/logger",
  "@hex-di/guard",
];

describe("typeDefinitions", () => {
  it("contains all 11 hex-di packages", () => {
    expect(typeDefinitions.size).toBe(11);

    for (const pkg of EXPECTED_PACKAGES) {
      expect(typeDefinitions.has(pkg)).toBe(true);
    }
  });

  it("each entry is a non-empty string containing the package name", () => {
    for (const [name, dts] of typeDefinitions) {
      expect(typeof dts).toBe("string");
      expect(dts.length).toBeGreaterThan(0);
      expect(dts).toContain(name);
    }
  });

  it("contains real type definitions (not just placeholders)", () => {
    for (const [, dts] of typeDefinitions) {
      expect(dts).toContain("export");
      expect(dts).not.toContain("/* placeholder");
    }
  });
});

describe("cross-module brand compatibility", () => {
  it("no generated bundle uses computed symbol property keys for brands", () => {
    // Monaco bundles TypeScript ~5.4, which cannot infer through computed
    // symbol property keys (`readonly [__brand]: [T, TName]`) across
    // separate `declare module` blocks. Brands must use regular string
    // property keys (`readonly __brand: [T, TName]`) for compatibility.
    for (const [name, dts] of typeDefinitions) {
      // Match patterns like `readonly [__brand]:` or `readonly [__graphBrand]?:`
      const computedBrandProps = dts.match(/readonly \[__\w+Brand\w*\]\??:/g) ?? [];
      expect(
        computedBrandProps,
        `${name} uses computed symbol brand keys: ${computedBrandProps.join(", ")}. ` +
          "These break type inference in Monaco's bundled TypeScript. " +
          "Use string property keys instead."
      ).toEqual([]);
    }
  });

  it("no generated bundle declares symbol-typed brand constants", () => {
    // Brand constants (`declare const __brand: symbol`) are only needed
    // for computed property keys. With string property keys, they should
    // be removed entirely.
    for (const [name, dts] of typeDefinitions) {
      expect(dts, `${name} still declares a symbol brand constant`).not.toMatch(
        /declare const __\w*[Bb]rand\w*: (?:unique )?symbol;/
      );
    }
  });

  it("brand properties use string keys for structural compatibility across modules", () => {
    // Core's Port type should use `readonly __brand: [T, TName]`
    // (string key) not `readonly [__brand]: [T, TName]` (computed key)
    const coreDts = typeDefinitions.get("@hex-di/core")!;
    expect(coreDts).toMatch(/readonly __brand: \[/);
  });
});

describe("registerTypeDefinitions", () => {
  it("calls addExtraLib for each package with correct file URIs", () => {
    const addExtraLib = vi.fn();
    const mockTs: MonacoTypescriptLanguage = {
      typescriptDefaults: { addExtraLib },
    };

    registerTypeDefinitions(mockTs);

    expect(addExtraLib).toHaveBeenCalledTimes(11);

    for (const pkg of EXPECTED_PACKAGES) {
      const expectedUri = `file:///node_modules/${pkg}/index.d.ts`;
      const expectedContent = typeDefinitions.get(pkg);
      expect(addExtraLib).toHaveBeenCalledWith(expectedContent, expectedUri);
    }
  });
});
