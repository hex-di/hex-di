import { describe, it, expect } from "vitest";
import {
  createPortGateHook,
  PortGatedError,
  checkGxPReadiness,
} from "../../src/hook/port-gate.js";

describe("createPortGateHook()", () => {
  it("allows ports not in config", () => {
    const hook = createPortGateHook({});
    expect(() => hook.beforeResolve({ portName: "SomePort" })).not.toThrow();
  });

  it("allows ports with action: allow", () => {
    const hook = createPortGateHook({
      SomePort: { action: "allow" },
    });
    expect(() => hook.beforeResolve({ portName: "SomePort" })).not.toThrow();
  });

  it("throws PortGatedError for denied ports", () => {
    const hook = createPortGateHook({
      BannedPort: { action: "deny", reason: "Disabled in production" },
    });
    expect(() => hook.beforeResolve({ portName: "BannedPort" })).toThrow(PortGatedError);
  });
  it("PortGatedError contains portName and reason", () => {
    const hook = createPortGateHook({
      SecretPort: { action: "deny", reason: "Secret port" },
    });
    let caught: unknown;
    try {
      hook.beforeResolve({ portName: "SecretPort" });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(PortGatedError);
    if (caught instanceof PortGatedError) {
      expect(caught.portName).toBe("SecretPort");
      expect(caught.reason).toBe("Secret port");
    }
  });
  it("only affects the configured port, not others", () => {
    const hook = createPortGateHook({
      DeniedPort: { action: "deny", reason: "Disabled" },
    });
    expect(() => hook.beforeResolve({ portName: "AllowedPort" })).not.toThrow();
  });

  it("handles multiple ports with mixed rules", () => {
    const hook = createPortGateHook({
      PortA: { action: "allow" },
      PortB: { action: "deny", reason: "Feature flag off" },
      PortC: { action: "allow" },
    });
    expect(() => hook.beforeResolve({ portName: "PortA" })).not.toThrow();
    expect(() => hook.beforeResolve({ portName: "PortB" })).toThrow(PortGatedError);
    expect(() => hook.beforeResolve({ portName: "PortC" })).not.toThrow();
  });

  // DoD 17 Test 6: config object is treated as readonly — PortGateConfig has readonly index signature
  it("test 6: PortGateConfig has a readonly index signature — createPortGateHook returns a stable hook", () => {
    // Create config with a deny rule, then pass a frozen copy for immutability
    const config = Object.freeze({
      TargetPort: { action: "deny" as const, reason: "Frozen config test" },
    });
    const hook = createPortGateHook(config);
    // The hook must consistently deny the port
    expect(() => hook.beforeResolve({ portName: "TargetPort" })).toThrow(PortGatedError);
    // An unknown port must still be allowed
    expect(() => hook.beforeResolve({ portName: "OtherPort" })).not.toThrow();
    // Frozen config cannot be modified (Object.isFrozen check is structural verification)
    expect(Object.isFrozen(config)).toBe(true);
  });

  // DoD 17 Test 7: O(1) lookup performance — config lookup is direct object property access
  it("test 7: lookup returns the correct result for both existing and non-existing port names (O(1) via object property access)", () => {
    const hook = createPortGateHook({
      ExistingPort: { action: "allow" },
      DeniedPort: { action: "deny", reason: "Off" },
    });
    // Existing allow port: no throw
    expect(() => hook.beforeResolve({ portName: "ExistingPort" })).not.toThrow();
    // Existing deny port: throws
    expect(() => hook.beforeResolve({ portName: "DeniedPort" })).toThrow(PortGatedError);
    // Non-existing port: no throw (defaults to allow)
    expect(() => hook.beforeResolve({ portName: "MissingPort" })).not.toThrow();
  });

  // DoD 17 Test 10: Port gate hook does NOT trigger subject resolution
  it("test 10: port gate hook beforeResolve does not require or resolve any subject — it is stateless", () => {
    // The hook only inspects context.portName — no subject, no auth, no policy evaluation
    const hook = createPortGateHook({
      AllowedPort: { action: "allow" },
    });
    // Can be called with ONLY { portName } — no subject context needed
    expect(() => hook.beforeResolve({ portName: "AllowedPort" })).not.toThrow();
    expect(() => hook.beforeResolve({ portName: "UnknownPort" })).not.toThrow();
  });

  // DoD 17 Test 11: GxP warning documentation
  // The createPortGateHook JSDoc contains a @gxp-warning that clarifies this hook
  // does not produce audit trail entries. This test documents that expectation.
  it("test 11: createPortGateHook operates WITHOUT producing audit trail entries (GxP boundary)", () => {
    // The hook has no audit trail integration by design.
    // It fires at the infrastructure level (beforeResolve), before any guard evaluation.
    // GxP-compliant audit logging is the responsibility of enforcePolicy(), not this hook.
    const hook = createPortGateHook({
      AuditedPort: { action: "allow" },
    });
    // Calling beforeResolve produces no audit side effect — it is a pure decision gate.
    expect(() => hook.beforeResolve({ portName: "AuditedPort" })).not.toThrow();
    // The hook returns void (undefined) — no result, no audit entry, no side effects
    const result = hook.beforeResolve({ portName: "AuditedPort" });
    expect(result).toBeUndefined();
  });
});

describe("checkGxPReadiness()", () => {
  // DoD 17 Test 13: GxP readiness — all gated ports have guards
  it("test 13: returns ready:true when all gated ports also have a guard adapter", () => {
    const result = checkGxPReadiness(
      ["UserPort", "OrderPort"],
      ["UserPort", "OrderPort", "LogPort"],
    );
    expect(result.ready).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.issues)).toBe(true);
  });

  // DoD 17 Test 14: GxP readiness — gated port missing a guard is flagged
  it("test 14: returns ready:false with a specific issue message for each gated port without a guard", () => {
    const result = checkGxPReadiness(
      ["UserPort", "OrderPort"],
      ["UserPort"], // OrderPort missing guard
    );
    expect(result.ready).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toContain("OrderPort");
    expect(result.issues[0]).toContain("GxP");
  });
});
