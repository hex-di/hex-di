import { describe, it, expect, vi } from "vitest";
import { chaperoneService, createPortContract } from "../src/chaperone/index.js";
import type { ChaperoneConfig, ChaperoneViolation } from "../src/chaperone/types.js";

/** Minimal console interface for environments without DOM types. */
declare const console: { warn: (...args: unknown[]) => void };

describe("chaperoneService", () => {
  const contract = createPortContract("Logger", ["log", "warn", "error"]);

  it("returns service unwrapped in 'off' mode", () => {
    const service = { log: () => {}, warn: () => {}, error: () => {} };
    const config: ChaperoneConfig = { mode: "off" };
    const wrapped = chaperoneService(service, contract, config);
    expect(wrapped).toBe(service); // Same reference
  });

  it("wraps service in Proxy in 'strict' mode", () => {
    const service = { log: () => {}, warn: () => {}, error: () => {} };
    const config: ChaperoneConfig = { mode: "strict" };
    const wrapped = chaperoneService(service, contract, config);
    expect(wrapped).not.toBe(service);
    // Methods still work
    expect(() => wrapped.log()).not.toThrow();
  });

  it("throws on missing method in 'strict' mode", () => {
    const service: Record<string, unknown> = { log: () => {}, warn: () => {} };
    const config: ChaperoneConfig = { mode: "strict" };
    const wrapped = chaperoneService(service, contract, config);
    expect(() => wrapped["error"]).toThrow();
  });

  it("warns on missing method in 'dev' mode", () => {
    const service: Record<string, unknown> = { log: () => {}, warn: () => {} };
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const config: ChaperoneConfig = { mode: "dev" };
    const wrapped = chaperoneService(service, contract, config);
    wrapped["error"];
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("error"));
    warnSpy.mockRestore();
  });

  it("calls onViolation callback", () => {
    const service: Record<string, unknown> = { log: () => {}, warn: () => {} };
    const violations: ChaperoneViolation[] = [];
    const config: ChaperoneConfig = {
      mode: "warn",
      onViolation: v => violations.push(v),
    };
    const wrapped = chaperoneService(service, contract, config);
    wrapped["error"];
    expect(violations).toHaveLength(1);
    expect(violations[0].member).toBe("error");
  });

  it("non-contract properties pass through", () => {
    const service = {
      log: () => {},
      warn: () => {},
      error: () => {},
      custom: 42,
    };
    const config: ChaperoneConfig = { mode: "strict" };
    const wrapped = chaperoneService(service, contract, config);
    expect(wrapped.custom).toBe(42);
  });

  it("wrapped methods preserve correct this binding", () => {
    const service = {
      value: 42,
      log(): number {
        return this.value;
      },
      warn: () => {},
      error: () => {},
    };
    const config: ChaperoneConfig = { mode: "strict" };
    const wrapped = chaperoneService(service, contract, config);
    expect(wrapped.log()).toBe(42);
  });

  it("warns on missing method in 'warn' mode", () => {
    const service: Record<string, unknown> = { log: () => {}, warn: () => {} };
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const config: ChaperoneConfig = { mode: "warn" };
    const wrapped = chaperoneService(service, contract, config);
    wrapped["error"];
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Port 'Logger' expects 'error' to be a method")
    );
    warnSpy.mockRestore();
  });

  it("violation has correct structure", () => {
    const service: Record<string, unknown> = { log: () => {}, warn: () => {} };
    const violations: ChaperoneViolation[] = [];
    const config: ChaperoneConfig = {
      mode: "warn",
      onViolation: v => violations.push(v),
    };
    const wrapped = chaperoneService(service, contract, config);
    wrapped["error"];
    expect(violations[0]).toEqual({
      _tag: "ChaperoneViolation",
      portName: "Logger",
      member: "error",
      kind: "missing-method",
      message: "Port 'Logger' expects 'error' to be a method, got undefined",
    });
  });

  it("thrown violation in strict mode is frozen", () => {
    const service: Record<string, unknown> = { log: () => {} };
    const config: ChaperoneConfig = { mode: "strict" };
    const wrapped = chaperoneService(service, contract, config);
    try {
      wrapped["warn"];
      expect.unreachable("Should have thrown");
    } catch (err: unknown) {
      expect(Object.isFrozen(err)).toBe(true);
    }
  });
});

describe("createPortContract", () => {
  it("creates frozen contract", () => {
    const contract = createPortContract("Logger", ["log"]);
    expect(contract.portName).toBe("Logger");
    expect(contract.members).toEqual(["log"]);
    expect(Object.isFrozen(contract)).toBe(true);
  });
});
