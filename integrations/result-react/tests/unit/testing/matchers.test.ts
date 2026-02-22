// @traces BEH-R06-001
import { describe, it, expect, beforeAll } from "vitest";
import { setupResultReactMatchers } from "../../../src/testing/matchers.js";

beforeAll(() => {
  setupResultReactMatchers();
});

describe("setupResultReactMatchers (BEH-R06-004)", () => {
  it("toBeLoading passes for { isLoading: true }", () => {
    expect({ isLoading: true, result: undefined }).toBeLoading();
  });

  it("toBeLoading fails for { isLoading: false }", () => {
    expect(() => {
      expect({ isLoading: false, result: undefined }).toBeLoading();
    }).toThrow();
  });
});
