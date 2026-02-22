import { describe, it, expect } from "vitest";
import { createCircuitBreaker } from "../../src/guard/circuit-breaker.js";
import { ACL023 } from "../../src/errors/codes.js";

describe("CircuitBreaker", () => {
  describe("createCircuitBreaker()", () => {
    it("starts in closed state", () => {
      const cb = createCircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000 });
      expect(cb.state).toBe("closed");
    });

    it("check() returns undefined when closed", () => {
      const cb = createCircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000 });
      expect(cb.check()).toBeUndefined();
    });

    it("opens after failureThreshold consecutive failures", () => {
      const cb = createCircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 5000 });
      cb.recordFailure();
      cb.recordFailure();
      expect(cb.state).toBe("closed"); // not yet at threshold
      cb.recordFailure();
      expect(cb.state).toBe("open");
    });

    it("check() returns CircuitOpenError (ACL023) when open", () => {
      const cb = createCircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 5000 });
      cb.recordFailure();
      expect(cb.state).toBe("open");

      const error = cb.check();
      expect(error).toBeDefined();
      expect(error?.code).toBe(ACL023);
      expect(error?.message).toContain("open");
    });

    it("transitions to half-open after resetTimeoutMs", async () => {
      const cb = createCircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 50 });
      cb.recordFailure();
      expect(cb.state).toBe("open");

      await new Promise((r) => setTimeout(r, 60));
      expect(cb.state).toBe("half-open");
    });

    it("transitions from half-open to closed on success", async () => {
      const cb = createCircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 50 });
      cb.recordFailure();

      await new Promise((r) => setTimeout(r, 60));
      expect(cb.state).toBe("half-open");

      cb.recordSuccess();
      expect(cb.state).toBe("closed");
    });

    it("transitions from half-open back to open on failure", async () => {
      const cb = createCircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 50 });
      cb.recordFailure();

      await new Promise((r) => setTimeout(r, 60));
      expect(cb.state).toBe("half-open");

      cb.recordFailure();
      expect(cb.state).toBe("open");
    });

    it("success resets failure count so threshold takes full count again", () => {
      const cb = createCircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 5000 });
      cb.recordFailure();
      cb.recordFailure();
      cb.recordSuccess(); // resets count
      cb.recordFailure();
      cb.recordFailure();
      expect(cb.state).toBe("closed"); // still only 2 failures since last success
      cb.recordFailure();
      expect(cb.state).toBe("open"); // now at threshold
    });

    it("check() returns undefined in half-open (allows probe)", async () => {
      const cb = createCircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 50 });
      cb.recordFailure();

      await new Promise((r) => setTimeout(r, 60));
      expect(cb.state).toBe("half-open");
      // half-open: allows one probe through
      expect(cb.check()).toBeUndefined();
    });

    it("rapid transitions: closed → open → half-open → open", async () => {
      const cb = createCircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 30 });
      // closed → open
      cb.recordFailure();
      expect(cb.state).toBe("open");
      // Wait for half-open
      await new Promise((r) => setTimeout(r, 40));
      expect(cb.state).toBe("half-open");
      // half-open → open on failure
      cb.recordFailure();
      expect(cb.state).toBe("open");
    });

    it("half-open probe limit: one successful probe closes circuit", async () => {
      const cb = createCircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 30 });
      cb.recordFailure();
      cb.recordFailure();
      expect(cb.state).toBe("open");

      await new Promise((r) => setTimeout(r, 40));
      expect(cb.state).toBe("half-open");

      // Single success closes the circuit
      cb.recordSuccess();
      expect(cb.state).toBe("closed");
      // And check returns undefined (closed)
      expect(cb.check()).toBeUndefined();
    });

    it("success in closed state has no negative effect", () => {
      const cb = createCircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 5000 });
      cb.recordSuccess();
      cb.recordSuccess();
      cb.recordSuccess();
      expect(cb.state).toBe("closed");
      expect(cb.check()).toBeUndefined();
    });
  });
});
