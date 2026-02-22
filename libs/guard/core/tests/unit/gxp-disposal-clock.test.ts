import { describe, it, expect } from "vitest";
import { createScopeDisposalVerifier } from "../../src/guard/disposal.js";
import { detectClockDrift, checkClockDrift } from "../../src/guard/clock.js";
import { ACL016 } from "../../src/errors/codes.js";

describe("ScopeDisposalVerifier", () => {
  it("verifyAll() returns verified:true with no registered scopes", () => {
    const verifier = createScopeDisposalVerifier();
    const result = verifier.verifyAll();
    expect(result.verified).toBe(true);
    expect(result.undisposed).toHaveLength(0);
  });

  it("isDisposed() returns false before disposal", () => {
    const verifier = createScopeDisposalVerifier();
    verifier.register("scope-1");
    expect(verifier.isDisposed("scope-1")).toBe(false);
  });

  it("isDisposed() returns true after disposal", () => {
    const verifier = createScopeDisposalVerifier();
    verifier.register("scope-1");
    verifier.dispose("scope-1");
    expect(verifier.isDisposed("scope-1")).toBe(true);
  });

  it("verifyAll() returns verified:false for undisposed registered scopes", () => {
    const verifier = createScopeDisposalVerifier();
    verifier.register("scope-1");
    verifier.register("scope-2");
    verifier.dispose("scope-1");

    const result = verifier.verifyAll();
    expect(result.verified).toBe(false);
    expect(result.undisposed).toContain("scope-2");
    expect(result.undisposed).not.toContain("scope-1");
  });

  it("verifyAll() returns verified:true when all registered scopes are disposed", () => {
    const verifier = createScopeDisposalVerifier();
    verifier.register("scope-1");
    verifier.register("scope-2");
    verifier.dispose("scope-1");
    verifier.dispose("scope-2");

    const result = verifier.verifyAll();
    expect(result.verified).toBe(true);
    expect(result.undisposed).toHaveLength(0);
  });

  it("verify() checks only specified scopes", () => {
    const verifier = createScopeDisposalVerifier();
    verifier.dispose("scope-A");

    const result = verifier.verify(["scope-A", "scope-B"]);
    expect(result.verified).toBe(false);
    expect(result.undisposed).toContain("scope-B");
    expect(result.undisposed).not.toContain("scope-A");
  });

  it("can dispose an unregistered scope", () => {
    const verifier = createScopeDisposalVerifier();
    // No registration required — dispose can be called independently
    verifier.dispose("scope-x");
    expect(verifier.isDisposed("scope-x")).toBe(true);
  });

  it("double-dispose is idempotent", () => {
    const verifier = createScopeDisposalVerifier();
    verifier.register("scope-idem");
    verifier.dispose("scope-idem");
    verifier.dispose("scope-idem"); // second dispose should be safe
    expect(verifier.isDisposed("scope-idem")).toBe(true);
    const result = verifier.verifyAll();
    expect(result.verified).toBe(true);
  });

  it("verify() with empty array returns verified:true", () => {
    const verifier = createScopeDisposalVerifier();
    verifier.register("scope-1");
    // Verify no scopes — should always pass
    const result = verifier.verify([]);
    expect(result.verified).toBe(true);
    expect(result.undisposed).toHaveLength(0);
  });
});

describe("Clock drift detection", () => {
  describe("detectClockDrift()", () => {
    it("returns 0 for identical times", () => {
      expect(detectClockDrift(1000, 1000)).toBe(0);
    });

    it("returns absolute drift (positive when system is ahead)", () => {
      expect(detectClockDrift(2000, 1000)).toBe(1000);
    });

    it("returns absolute drift (positive when system is behind)", () => {
      expect(detectClockDrift(1000, 2000)).toBe(1000);
    });

    it("returns large drift for large difference", () => {
      expect(detectClockDrift(0, 5000)).toBe(5000);
    });
  });

  describe("checkClockDrift()", () => {
    it("returns undefined when drift is within threshold", () => {
      const result = checkClockDrift(1000, 1500, 1000);
      expect(result).toBeUndefined();
    });

    it("returns ClockDriftWarning (ACL016) when drift exceeds default threshold (1000ms)", () => {
      const result = checkClockDrift(0, 2000); // drift = 2000ms > 1000ms default
      expect(result).toBeDefined();
      expect(result?.code).toBe(ACL016);
      expect(result?.driftMs).toBe(2000);
      expect(result?.message).toContain("drift");
    });

    it("returns ClockDriftWarning with custom threshold", () => {
      const result = checkClockDrift(0, 500, 200); // drift = 500ms > 200ms
      expect(result).toBeDefined();
      expect(result?.driftMs).toBe(500);
    });

    it("returns undefined when drift equals the threshold", () => {
      // drift = 1000ms, threshold = 1000ms → not strictly greater
      const result = checkClockDrift(0, 1000, 1000);
      expect(result).toBeUndefined();
    });

    it("includes driftMs in the warning", () => {
      const result = checkClockDrift(0, 3000, 1000);
      expect(result?.driftMs).toBe(3000);
    });
  });
});
