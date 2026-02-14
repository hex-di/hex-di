/**
 * Tests for the service proxy wrapper that detects Result return values.
 */
import { describe, it, expect, vi } from "vitest";
import { proxyWrapService } from "../../src/sandbox/result-proxy.js";
import { ok, err } from "@hex-di/result";

function createMockInspector() {
  return { emit: vi.fn() };
}

describe("proxyWrapService", () => {
  it("emits result:ok when service method returns ok()", () => {
    const inspector = createMockInspector();
    const service = {
      validate: () => ok("valid"),
    };

    const proxied = proxyWrapService(service, "UserPort", () => inspector) as typeof service;
    proxied.validate();

    expect(inspector.emit).toHaveBeenCalledOnce();
    expect(inspector.emit.mock.calls[0][0]).toMatchObject({
      type: "result:ok",
      portName: "UserPort",
    });
  });

  it("emits result:err when service method returns err()", () => {
    const inspector = createMockInspector();
    const service = {
      validate: () => err("invalid input"),
    };

    const proxied = proxyWrapService(service, "UserPort", () => inspector) as typeof service;
    proxied.validate();

    expect(inspector.emit).toHaveBeenCalledOnce();
    expect(inspector.emit.mock.calls[0][0]).toMatchObject({
      type: "result:err",
      portName: "UserPort",
      errorCode: "USER_ERROR",
    });
  });

  it("does not emit for non-Result return values", () => {
    const inspector = createMockInspector();
    const service = {
      getName: () => "Alice",
    };

    const proxied = proxyWrapService(service, "UserPort", () => inspector) as typeof service;
    const result = proxied.getName();

    expect(result).toBe("Alice");
    expect(inspector.emit).not.toHaveBeenCalled();
  });

  it("property access on proxied service works normally", () => {
    const inspector = createMockInspector();
    const service = {
      name: "MyService",
      count: 42,
    };

    const proxied = proxyWrapService(service, "UserPort", () => inspector) as typeof service;

    expect(proxied.name).toBe("MyService");
    expect(proxied.count).toBe(42);
    expect(inspector.emit).not.toHaveBeenCalled();
  });

  it("primitive values returned from resolve are not proxied", () => {
    const inspector = createMockInspector();

    expect(proxyWrapService("hello", "Port", () => inspector)).toBe("hello");
    expect(proxyWrapService(42, "Port", () => inspector)).toBe(42);
    expect(proxyWrapService(null, "Port", () => inspector)).toBeNull();
    expect(proxyWrapService(undefined, "Port", () => inspector)).toBeUndefined();
    expect(proxyWrapService(true, "Port", () => inspector)).toBe(true);
  });

  it("does not emit when inspector is undefined", () => {
    const service = {
      validate: () => ok("valid"),
    };

    const proxied = proxyWrapService(service, "UserPort", () => undefined) as typeof service;
    // Should not throw
    expect(() => proxied.validate()).not.toThrow();
  });

  it("does not emit when inspector.emit is undefined", () => {
    const service = {
      validate: () => ok("valid"),
    };

    const proxied = proxyWrapService(service, "UserPort", () => ({})) as typeof service;
    expect(() => proxied.validate()).not.toThrow();
  });

  it("returns the original Result value from service method", () => {
    const inspector = createMockInspector();
    const okResult = ok("data");
    const service = {
      fetch: () => okResult,
    };

    const proxied = proxyWrapService(service, "Port", () => inspector) as typeof service;
    const returned = proxied.fetch();

    expect(returned).toBe(okResult);
  });

  it("works when wrapping resolve on a frozen container-like object", () => {
    // Reproduces the real scenario: container is Object.freeze'd,
    // so we must use Object.create with property descriptors to shadow `resolve`.
    const inspector = createMockInspector();
    const frozenContainer = Object.freeze({
      resolve: (p: { __portName: string }) => ({ greet: () => ok(`hello from ${p.__portName}`) }),
      inspector,
    });

    const instrumentedResolve = (p: { __portName: string }) => {
      const service = frozenContainer.resolve(p);
      return proxyWrapService(service, p.__portName, () => frozenContainer.inspector);
    };

    // This is the pattern used in worker-entry.ts
    const wrapper = Object.create(frozenContainer, {
      resolve: { value: instrumentedResolve, enumerable: true, configurable: true },
    }) as typeof frozenContainer;

    // The wrapper's resolve is the instrumented version
    const service = wrapper.resolve({ __portName: "TestPort" });
    service.greet();

    expect(inspector.emit).toHaveBeenCalledOnce();
    expect(inspector.emit.mock.calls[0][0]).toMatchObject({
      type: "result:ok",
      portName: "TestPort",
    });

    // Other properties still delegate to the frozen container
    expect(wrapper.inspector).toBe(inspector);
  });
});
