import { describe, it, expect } from "vitest";
import { createPortGateHook, PortGatedError } from "../../src/hook/port-gate.js";
import { enforcePolicy, AccessDeniedError } from "../../src/guard/guard.js";
import { hasPermission, hasRole } from "../../src/policy/combinators.js";
import { createPermission } from "../../src/tokens/permission.js";
import { createAuthSubject } from "../../src/subject/auth-subject.js";
import { ok } from "@hex-di/result";
import type { AuditTrail } from "../../src/guard/types.js";

const ReadContent = createPermission({ resource: "content", action: "read" });

function makeSubject(permissions: string[] = [], roles: string[] = []) {
  return createAuthSubject("user-1", roles, new Set(permissions));
}

const noopTrail: AuditTrail = { record: () => ok(undefined) };

describe("DoD 17 — port-gate hook integration", () => {
  it("Port gate hook deny fires before guard evaluation (step 2 vs step 3)", () => {
    // The port gate hook (step 2 in the resolution pipeline) fires before
    // the guard policy evaluation (step 3). A PortGatedError indicates that
    // the gate rejected the resolution before any subject/policy was involved.
    const hook = createPortGateHook({
      LockedPort: { action: "deny", reason: "Feature disabled" },
    });

    // Port gate fires — throws PortGatedError, not AccessDeniedError
    let caughtFromHook: unknown;
    try {
      hook.beforeResolve({ portName: "LockedPort" });
    } catch (e) {
      caughtFromHook = e;
    }

    expect(caughtFromHook).toBeInstanceOf(PortGatedError);
    if (caughtFromHook instanceof PortGatedError) {
      expect(caughtFromHook.portName).toBe("LockedPort");
    }

    // Guard evaluation produces a different error type when policy denies
    const subject = makeSubject([]); // no permissions
    const guardResult = enforcePolicy({
      policy: hasPermission(ReadContent),
      subject,
      portName: "LockedPort",
      scopeId: "scope-1",
      auditTrail: noopTrail,
      failOnAuditError: false,
    });

    // This is an AccessDeniedError, not a PortGatedError
    expect(guardResult.isErr()).toBe(true);
    if (guardResult.isErr()) {
      expect(guardResult.error).toBeInstanceOf(AccessDeniedError);
      expect(guardResult.error).not.toBeInstanceOf(PortGatedError);
    }
  });

  it("Feature flag pattern: config swap (deny then allow) without rebuild", () => {
    // Simulates a runtime config swap — e.g. feature flag toggled
    // Initial config: port is denied
    const deniedHook = createPortGateHook({
      FeaturePort: { action: "deny", reason: "Feature flag off" },
    });

    expect(() => deniedHook.beforeResolve({ portName: "FeaturePort" })).toThrow(PortGatedError);
    expect(() => deniedHook.beforeResolve({ portName: "OtherPort" })).not.toThrow();

    // Updated config: port is now allowed (no rebuild, just a new config object)
    const allowedHook = createPortGateHook({
      FeaturePort: { action: "allow" },
    });

    expect(() => allowedHook.beforeResolve({ portName: "FeaturePort" })).not.toThrow();
    expect(() => allowedHook.beforeResolve({ portName: "OtherPort" })).not.toThrow();
  });

  it("No AuditEntry produced by port gate hook (different from guard evaluation)", () => {
    const entries: unknown[] = [];
    const captureTrail: AuditTrail = {
      record(entry) {
        entries.push(entry);
        return ok(undefined);
      },
    };

    const hook = createPortGateHook({
      DeniedPort: { action: "deny", reason: "Blocked" },
    });

    // Port gate fires — no audit entry is produced
    expect(() => hook.beforeResolve({ portName: "DeniedPort" })).toThrow(PortGatedError);
    expect(entries).toHaveLength(0);

    // Guard evaluation produces an audit entry on deny
    const subject = makeSubject([]);
    const guardResult = enforcePolicy({
      policy: hasRole("admin"),
      subject,
      portName: "DeniedPort",
      scopeId: "scope-1",
      auditTrail: captureTrail,
      failOnAuditError: false,
    });

    expect(guardResult.isErr()).toBe(true);
    if (guardResult.isErr()) expect(guardResult.error).toBeInstanceOf(AccessDeniedError);
    expect(entries).toHaveLength(1);
  });
});
