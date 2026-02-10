import { describe, it, expect } from "vitest";
import {
  mergeContext,
  extractContextFromHeaders,
  CORRELATION_ID_HEADER,
  REQUEST_ID_HEADER,
  LogContextVar,
  LogAnnotationsVar,
  createMemoryLogger,
} from "../src/index.js";

// =============================================================================
// mergeContext (6 tests)
// =============================================================================

describe("mergeContext", () => {
  it("merges non-overlapping keys", () => {
    const result = mergeContext({ correlationId: "a" }, { requestId: "b" });
    expect(result).toEqual({ correlationId: "a", requestId: "b" });
  });

  it("override takes precedence on same key", () => {
    const result = mergeContext({ service: "old" }, { service: "new" });
    expect(result).toEqual({ service: "new" });
  });

  it("skips undefined values in override", () => {
    const result = mergeContext({ service: "keep" }, { service: undefined });
    expect(result).toEqual({ service: "keep" });
  });

  it("returns a new object (immutability)", () => {
    const base = { correlationId: "a" };
    const override = { requestId: "b" };
    const result = mergeContext(base, override);
    expect(result).not.toBe(base);
    expect(result).not.toBe(override);
  });

  it("empty override copies base", () => {
    const base = { correlationId: "a", service: "svc" };
    const result = mergeContext(base, {});
    expect(result).toEqual(base);
    expect(result).not.toBe(base);
  });

  it("empty base copies override", () => {
    const result = mergeContext({}, { correlationId: "x" });
    expect(result).toEqual({ correlationId: "x" });
  });
});

// =============================================================================
// extractContextFromHeaders (4 tests)
// =============================================================================

describe("extractContextFromHeaders", () => {
  it("extracts correlationId from header", () => {
    const ctx = extractContextFromHeaders({ [CORRELATION_ID_HEADER]: "corr-1" });
    expect(ctx.correlationId).toBe("corr-1");
  });

  it("extracts requestId from header", () => {
    const ctx = extractContextFromHeaders({ [REQUEST_ID_HEADER]: "req-1" });
    expect(ctx.requestId).toBe("req-1");
  });

  it("returns empty object when no recognized headers", () => {
    const ctx = extractContextFromHeaders({ "x-other": "val" });
    expect(ctx).toEqual({});
  });

  it("skips empty string values", () => {
    const ctx = extractContextFromHeaders({
      [CORRELATION_ID_HEADER]: "",
      [REQUEST_ID_HEADER]: "",
    });
    expect(ctx).toEqual({});
  });
});

// =============================================================================
// Context variables (2 tests)
// =============================================================================

describe("Context variables", () => {
  it("LogContextVar default is {}", () => {
    expect(LogContextVar.defaultValue).toEqual({});
  });

  it("LogAnnotationsVar default is {}", () => {
    expect(LogAnnotationsVar.defaultValue).toEqual({});
  });
});

// =============================================================================
// Child nesting (2 tests)
// =============================================================================

describe("Child nesting", () => {
  it("three-level nesting preserves all context", () => {
    const root = createMemoryLogger();
    const child1 = root.child({ service: "svc" });
    const child2 = child1.child({ correlationId: "cid" });
    const child3 = child2.child({ userId: "u1" });

    child3.info("deep");
    const entry = root.getEntries()[0];
    expect(entry.context).toEqual({
      service: "svc",
      correlationId: "cid",
      userId: "u1",
    });
  });

  it("child overrides parent for same key", () => {
    const root = createMemoryLogger();
    const child1 = root.child({ service: "parent-svc" });
    const child2 = child1.child({ service: "child-svc" });

    child2.info("test");
    const entry = root.getEntries()[0];
    expect(entry.context.service).toBe("child-svc");
  });
});
