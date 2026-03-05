/**
 * Tests for handle-based resolution pipeline integration.
 *
 * Verifies:
 * - resolveHandle creates a handle in "created" state
 * - resolveHandleToActive transitions through full lifecycle to "active"
 * - Service is accessible only on active handles
 * - Handle lifecycle integrates with the resolution pipeline
 *
 * Requirements tested:
 * - BEH-CO-08-001: Container integration (Task 7.4)
 */

import { describe, it, expect, vi } from "vitest";
import { resolveHandle, resolveHandleToActive } from "../src/resolution/handle-resolver.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

function createTestLogger(): Logger {
  return { log: vi.fn() };
}

// =============================================================================
// resolveHandle
// =============================================================================

describe("resolveHandle", () => {
  it("returns a handle in 'created' state", () => {
    const handle = resolveHandle(createTestLogger);
    expect(handle.state).toBe("created");
  });

  it("transitions created -> initialized -> active", async () => {
    const service = createTestLogger();
    const created = resolveHandle(() => service);

    const initialized = await created.initialize();
    expect(initialized.state).toBe("initialized");

    const active = initialized.activate();
    expect(active.state).toBe("active");
    expect(active.service).toBe(service);
  });

  it("service is not accessible before activation", async () => {
    const service = createTestLogger();
    const created = resolveHandle(() => service);

    // Service is undefined in "created" state
    expect(created.service).toBeUndefined();

    const initialized = await created.initialize();
    // Service is undefined in "initialized" state
    expect(initialized.service).toBeUndefined();
  });

  it("calls getService during activation, not during creation", async () => {
    const getService = vi.fn(createTestLogger);
    const created = resolveHandle(getService);

    // Not called yet during creation
    expect(getService).not.toHaveBeenCalled();

    const initialized = await created.initialize();
    // Not called during initialization
    expect(getService).not.toHaveBeenCalled();

    initialized.activate();
    // Called during activation
    expect(getService).toHaveBeenCalledOnce();
  });

  it("calls onInitialize during initialize()", async () => {
    const onInitialize = vi.fn().mockResolvedValue(undefined);
    const created = resolveHandle(createTestLogger, undefined, onInitialize);

    await created.initialize();
    expect(onInitialize).toHaveBeenCalledOnce();
  });

  it("calls onDispose during dispose()", async () => {
    const onDispose = vi.fn().mockResolvedValue(undefined);
    const created = resolveHandle(createTestLogger, onDispose);

    const initialized = await created.initialize();
    const active = initialized.activate();
    await active.dispose();

    expect(onDispose).toHaveBeenCalledOnce();
  });
});

// =============================================================================
// resolveHandleToActive
// =============================================================================

describe("resolveHandleToActive", () => {
  it("returns an active handle with service accessible", async () => {
    const service = createTestLogger();
    const active = await resolveHandleToActive(() => service);

    expect(active.state).toBe("active");
    expect(active.service).toBe(service);
  });

  it("handle can be disposed after activation", async () => {
    const service = createTestLogger();
    const active = await resolveHandleToActive(() => service);

    const disposed = await active.dispose();
    expect(disposed.state).toBe("disposed");
    expect(disposed.service).toBeUndefined();
  });

  it("passes onDispose to the handle", async () => {
    const onDispose = vi.fn().mockResolvedValue(undefined);
    const active = await resolveHandleToActive(createTestLogger, onDispose);

    await active.dispose();
    expect(onDispose).toHaveBeenCalledOnce();
  });
});
