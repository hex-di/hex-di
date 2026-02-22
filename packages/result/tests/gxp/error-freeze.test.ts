/**
 * GxP integrity: Error factory immutability (INV-7).
 *
 * Verifies that errors created by createError() and createErrorGroup()
 * are Object.freeze()d.
 */

import { describe, it, expect } from "vitest";
import { createError, createErrorGroup } from "../../src/index.js";

describe("GxP: createError freeze — INV-7", () => {
  it("errors created with createError are frozen", () => {
    const NotFound = createError("NotFound");
    const error = NotFound({ resource: "User", id: "123" });
    expect(Object.isFrozen(error)).toBe(true);
  });

  it("createError output _tag cannot be mutated", () => {
    const NotFound = createError("NotFound");
    const error = NotFound({ resource: "User" });
    expect(() => {
      (error as any)._tag = "Tampered";
    }).toThrow();
  });

  it("createError output fields cannot be mutated", () => {
    const NotFound = createError("NotFound");
    const error = NotFound({ resource: "User" });
    expect(() => {
      (error as any).resource = "tampered";
    }).toThrow();
  });
});

describe("GxP: createErrorGroup freeze — INV-7", () => {
  it("errors created with createErrorGroup are frozen", () => {
    const group = createErrorGroup("MyGroup");
    const NotFound = group.create("NotFound");
    const error = NotFound({ resource: "User", id: "123" });
    expect(Object.isFrozen(error)).toBe(true);
  });

  it("createErrorGroup output _tag cannot be mutated", () => {
    const group = createErrorGroup("MyGroup");
    const NotFound = group.create("NotFound");
    const error = NotFound({ resource: "User" });
    expect(() => {
      (error as any)._tag = "Tampered";
    }).toThrow();
  });
});
