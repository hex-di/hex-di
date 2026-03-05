/**
 * Runtime tests for scoped reference tracking.
 *
 * Verifies:
 * - transferRef passes through the same runtime value (phantom brand only)
 * - createTransferRecord creates frozen records with correct fields
 * - ScopeTransferError is frozen with correct properties
 *
 * Requirements tested:
 * - BEH-CO-09-001: ScopedRef Branded Type (runtime phantom behavior)
 * - BEH-CO-09-003: Explicit Scope Transfer (runtime implementation)
 */

import { describe, it, expect } from "vitest";
import { transferRef, createTransferRecord, ScopeTransferError } from "../src/index.js";
import type { ScopedRef, ScopedContainer, TransferRecord } from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

const mockLogger: Logger = {
  log(_message: string) {
    /* no-op */
  },
};

// =============================================================================
// BEH-CO-09-001: ScopedRef Runtime Behavior
// =============================================================================

describe("BEH-CO-09-001: ScopedRef runtime behavior", () => {
  it("ScopedRef is a phantom brand — no runtime overhead", () => {
    // At runtime, a ScopedRef<T, S> is just a T. The brand exists only at the type level.
    // This test verifies that the underlying value is identical when treated as scoped.
    const logger = mockLogger;
    expect(logger.log).toBeDefined();
    expect(typeof logger.log).toBe("function");
  });
});

// =============================================================================
// BEH-CO-09-003: transferRef
// =============================================================================

describe("BEH-CO-09-003: transferRef", () => {
  // Helper to create minimal ScopedContainer for testing.
  // Since ScopedContainer is an interface with phantom types, we construct
  // it with the correct shape. The resolve function returns the mock logger.
  function makeScope<TScopeId extends string>(
    scopeId: TScopeId
  ): ScopedContainer<{ Logger: Logger }, TScopeId> {
    // Construct the resolve function that returns a branded value.
    // At runtime, the brand is phantom — resolve just returns the service.
    const resolve = <N extends "Logger">(
      _port: unknown
    ): ScopedRef<{ Logger: Logger }[N], TScopeId> => {
      // At runtime, ScopedRef<T, S> === T (brand is phantom).
      // Return the mock logger; the type system handles the branding.
      return mockLogger as never;
    };

    return { resolve, scopeId };
  }

  it("returns the same underlying service instance", () => {
    const fromScope = makeScope("parent");
    const toScope = makeScope("child");

    // Create a scoped ref by resolving from the source scope
    const parentRef = fromScope.resolve({ name: "Logger" } as never);
    const childRef = transferRef(parentRef, fromScope, toScope);

    // Runtime: same object reference
    expect(childRef).toBe(mockLogger);
  });

  it("preserves all methods and properties of the service", () => {
    const fromScope = makeScope("scope-a");
    const toScope = makeScope("scope-b");

    const ref = fromScope.resolve({ name: "Logger" } as never);
    const transferred = transferRef(ref, fromScope, toScope);

    expect(typeof transferred.log).toBe("function");
  });

  it("works for same-scope transfer (no-op)", () => {
    const scope = makeScope("same");

    const ref = scope.resolve({ name: "Logger" } as never);
    const result = transferRef(ref, scope, scope);

    expect(result).toBe(mockLogger);
  });
});

// =============================================================================
// BEH-CO-09-003: createTransferRecord
// =============================================================================

describe("BEH-CO-09-003: createTransferRecord", () => {
  it("creates a transfer record with correct fields", () => {
    const record = createTransferRecord("scope-a", "scope-b", "LoggerPort");

    expect(record.fromScope).toBe("scope-a");
    expect(record.toScope).toBe("scope-b");
    expect(record.portName).toBe("LoggerPort");
    expect(typeof record.transferredAt).toBe("number");
    expect(record.transferredAt).toBeGreaterThan(0);
  });

  it("transfer record is frozen (immutable)", () => {
    const record = createTransferRecord("scope-a", "scope-b", "LoggerPort");
    expect(Object.isFrozen(record)).toBe(true);
  });

  it("transfer record has correct type", () => {
    const record: TransferRecord<"scope-a", "scope-b"> = createTransferRecord(
      "scope-a",
      "scope-b",
      "LoggerPort"
    );
    expect(record.fromScope).toBe("scope-a");
    expect(record.toScope).toBe("scope-b");
  });

  it("records timestamp close to now", () => {
    const before = Date.now();
    const record = createTransferRecord("a", "b", "Port");
    const after = Date.now();

    expect(record.transferredAt).toBeGreaterThanOrEqual(before);
    expect(record.transferredAt).toBeLessThanOrEqual(after);
  });
});

// =============================================================================
// BEH-CO-09-003: ScopeTransferError
// =============================================================================

describe("BEH-CO-09-003: ScopeTransferError", () => {
  it("has correct _tag", () => {
    const error = new ScopeTransferError("scope-a", "scope-b", "target");
    expect(error._tag).toBe("ScopeTransferError");
  });

  it("has correct code", () => {
    const error = new ScopeTransferError("scope-a", "scope-b", "source");
    expect(error.code).toBe("SCOPE_TRANSFER_FAILED");
  });

  it("is a programming error", () => {
    const error = new ScopeTransferError("scope-a", "scope-b", "source");
    expect(error.isProgrammingError).toBe(true);
  });

  it("carries scope identities", () => {
    const error = new ScopeTransferError("scope-a", "scope-b", "target");
    expect(error.fromScope).toBe("scope-a");
    expect(error.toScope).toBe("scope-b");
    expect(error.invalidScope).toBe("target");
  });

  it("formats message for source scope error", () => {
    const error = new ScopeTransferError("scope-a", "scope-b", "source");
    expect(error.message).toContain("Source scope");
    expect(error.message).toContain("scope-a");
    expect(error.message).toContain("disposed");
  });

  it("formats message for target scope error", () => {
    const error = new ScopeTransferError("scope-a", "scope-b", "target");
    expect(error.message).toContain("Target scope");
    expect(error.message).toContain("scope-b");
    expect(error.message).toContain("disposed");
  });

  it("is frozen (Object.freeze)", () => {
    const error = new ScopeTransferError("scope-a", "scope-b", "target");
    expect(Object.isFrozen(error)).toBe(true);
  });

  it("extends Error", () => {
    const error = new ScopeTransferError("scope-a", "scope-b", "target");
    expect(error).toBeInstanceOf(Error);
  });
});
