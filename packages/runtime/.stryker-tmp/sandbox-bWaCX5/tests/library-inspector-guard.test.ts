/**
 * Unit Tests for isLibraryInspector Type Guard
 *
 * Covers DoD 3 (#1-#14): Runtime validation of the LibraryInspector protocol.
 *
 * @packageDocumentation
 */
// @ts-nocheck

import { describe, test, expect } from "vitest";
import { isLibraryInspector } from "@hex-di/core";

describe("isLibraryInspector type guard", () => {
  // #1
  test("returns true for object with name: string and getSnapshot: function", () => {
    expect(isLibraryInspector({ name: "test", getSnapshot: () => ({}) })).toBe(true);
  });

  // #2
  test("returns true for object with name, getSnapshot, and subscribe: function", () => {
    expect(
      isLibraryInspector({
        name: "test",
        getSnapshot: () => ({}),
        subscribe: () => () => {},
      })
    ).toBe(true);
  });

  // #3
  test("returns true for object with name, getSnapshot, and dispose: function", () => {
    expect(
      isLibraryInspector({
        name: "test",
        getSnapshot: () => ({}),
        dispose: () => {},
      })
    ).toBe(true);
  });

  // #4
  test("returns true for object with all four members", () => {
    expect(
      isLibraryInspector({
        name: "test",
        getSnapshot: () => ({}),
        subscribe: () => () => {},
        dispose: () => {},
      })
    ).toBe(true);
  });

  // #5
  test("returns false for null", () => {
    expect(isLibraryInspector(null)).toBe(false);
  });

  // #6
  test("returns false for undefined", () => {
    expect(isLibraryInspector(undefined)).toBe(false);
  });

  // #7
  test("returns false for primitive values (string, number, boolean)", () => {
    expect(isLibraryInspector("hello")).toBe(false);
    expect(isLibraryInspector(42)).toBe(false);
    expect(isLibraryInspector(true)).toBe(false);
  });

  // #8
  test("returns false for object missing name", () => {
    expect(isLibraryInspector({ getSnapshot: () => ({}) })).toBe(false);
  });

  // #9
  test("returns false for object with empty string name", () => {
    expect(isLibraryInspector({ name: "", getSnapshot: () => ({}) })).toBe(false);
  });

  // #10
  test("returns false for object missing getSnapshot", () => {
    expect(isLibraryInspector({ name: "test" })).toBe(false);
  });

  // #11
  test("returns false for object with getSnapshot that is not a function", () => {
    expect(isLibraryInspector({ name: "test", getSnapshot: "not a function" })).toBe(false);
  });

  // #12
  test("returns false for object with subscribe that is not a function", () => {
    expect(
      isLibraryInspector({
        name: "test",
        getSnapshot: () => ({}),
        subscribe: "not a function",
      })
    ).toBe(false);
  });

  // #13
  test("returns false for object with dispose that is not a function", () => {
    expect(
      isLibraryInspector({
        name: "test",
        getSnapshot: () => ({}),
        dispose: "not a function",
      })
    ).toBe(false);
  });

  // #14
  test("returns false for object with name that is not a string", () => {
    expect(isLibraryInspector({ name: 42, getSnapshot: () => ({}) })).toBe(false);
  });
});
