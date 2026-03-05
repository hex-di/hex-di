import { describe, it, expect } from "vitest";
import { isDisposableConfig, inferResourceKind } from "../src/resources/index.js";

describe("inferResourceKind", () => {
  it("returns 'disposable' for config with finalizer", () => {
    expect(inferResourceKind({ finalizer: () => {} })).toBe("disposable");
  });

  it("returns 'non-disposable' for config without finalizer", () => {
    expect(inferResourceKind({})).toBe("non-disposable");
  });
});

describe("isDisposableConfig", () => {
  it("returns true when finalizer is a function", () => {
    expect(isDisposableConfig({ finalizer: () => {} })).toBe(true);
  });

  it("returns false when no finalizer", () => {
    expect(isDisposableConfig({})).toBe(false);
  });

  it("returns false when finalizer is not a function", () => {
    expect(isDisposableConfig({ finalizer: "not-a-function" })).toBe(false);
  });
});
