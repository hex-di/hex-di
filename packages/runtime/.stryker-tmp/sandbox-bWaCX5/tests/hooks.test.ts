/**
 * Tests for src/resolution/hooks.ts
 */
// @ts-nocheck

import { describe, it, expect } from "vitest";
import { sealHooks, isSealed } from "../src/resolution/hooks.js";
import type { ResolutionHooks } from "../src/resolution/hooks.js";

describe("sealHooks", () => {
  it("returns frozen hooks config", () => {
    const hooks: ResolutionHooks = {
      beforeResolve: () => {},
      afterResolve: () => {},
    };
    const sealed = sealHooks(hooks);
    expect(Object.isFrozen(sealed)).toBe(true);
  });

  it("sets sealed property to true", () => {
    const hooks: ResolutionHooks = {};
    const sealed = sealHooks(hooks);
    expect(sealed.sealed).toBe(true);
  });

  it("preserves beforeResolve hook", () => {
    const before = () => {};
    const hooks: ResolutionHooks = { beforeResolve: before };
    const sealed = sealHooks(hooks);
    expect(sealed.beforeResolve).toBe(before);
  });

  it("preserves afterResolve hook", () => {
    const after = () => {};
    const hooks: ResolutionHooks = { afterResolve: after };
    const sealed = sealHooks(hooks);
    expect(sealed.afterResolve).toBe(after);
  });

  it("preserves undefined hooks", () => {
    const hooks: ResolutionHooks = {};
    const sealed = sealHooks(hooks);
    expect(sealed.beforeResolve).toBeUndefined();
    expect(sealed.afterResolve).toBeUndefined();
  });
});

describe("isSealed", () => {
  it("returns true for sealed hooks", () => {
    const sealed = sealHooks({});
    expect(isSealed(sealed)).toBe(true);
  });

  it("returns false for regular hooks", () => {
    const hooks: ResolutionHooks = { beforeResolve: () => {} };
    expect(isSealed(hooks)).toBe(false);
  });

  it("returns false for hooks without sealed property", () => {
    expect(isSealed({})).toBe(false);
  });

  it("returns false for hooks with sealed=false", () => {
    const hooks = { sealed: false } as any;
    expect(isSealed(hooks)).toBe(false);
  });

  it("returns false for hooks with sealed as non-boolean", () => {
    const hooks = { sealed: "true" } as any;
    expect(isSealed(hooks)).toBe(false);
  });
});
