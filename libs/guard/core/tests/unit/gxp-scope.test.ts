import { describe, it, expect } from "vitest";
import { createScopeRegistry } from "../../src/guard/scope.js";
import { ACL024, ACL025 } from "../../src/errors/codes.js";

describe("ScopeRegistry", () => {
  describe("createScopeRegistry()", () => {
    it("returns no error for an unregistered scope", () => {
      const registry = createScopeRegistry();
      const result = registry.check("unknown-scope");
      expect(result).toBeUndefined();
    });

    it("returns no error for a registered scope with no options", () => {
      const registry = createScopeRegistry();
      registry.register("scope-1");
      const result = registry.check("scope-1");
      expect(result).toBeUndefined();
    });

    it("returns ScopeExpiredError (ACL024) when TTL is exceeded", () => {
      const registry = createScopeRegistry();
      registry.register("scope-ttl", { ttlMs: 0 }); // 0ms TTL = already expired

      // Wait a tiny bit to ensure time has passed
      const result = registry.check("scope-ttl");
      expect(result).toBeDefined();
      expect(result?.code).toBe(ACL024);
      expect(result?.message).toContain("expired");
    });

    it("returns no error when TTL has not expired", () => {
      const registry = createScopeRegistry();
      registry.register("scope-fresh", { ttlMs: 60_000 }); // 1 minute TTL
      const result = registry.check("scope-fresh");
      expect(result).toBeUndefined();
    });

    it("returns RateLimitExceededError (ACL025) when call limit exceeded", () => {
      const registry = createScopeRegistry();
      registry.register("scope-rate", { maxCallsPerWindow: 2, windowMs: 60_000 });

      expect(registry.check("scope-rate")).toBeUndefined(); // call 1
      expect(registry.check("scope-rate")).toBeUndefined(); // call 2
      const result = registry.check("scope-rate"); // call 3 — exceeds limit
      expect(result).toBeDefined();
      expect(result?.code).toBe(ACL025);
      expect(result?.message).toContain("rate limit exceeded");
    });

    it("returns the configured limit and windowMs in RateLimitExceededError", () => {
      const registry = createScopeRegistry();
      registry.register("scope-info", { maxCallsPerWindow: 5, windowMs: 10_000 });

      for (let i = 0; i < 5; i++) {
        registry.check("scope-info");
      }
      const result = registry.check("scope-info");
      expect(result?.code).toBe(ACL025);
      if (result?.code === ACL025) {
        expect(result.limit).toBe(5);
        expect(result.windowMs).toBe(10_000);
      }
    });

    it("resets call count after window expires", async () => {
      const registry = createScopeRegistry();
      registry.register("scope-window", { maxCallsPerWindow: 1, windowMs: 50 });

      expect(registry.check("scope-window")).toBeUndefined(); // call 1
      expect(registry.check("scope-window")?.code).toBe(ACL025); // exceeded

      // Wait for window to expire
      await new Promise((r) => setTimeout(r, 60));

      // After window reset, should allow again
      expect(registry.check("scope-window")).toBeUndefined();
    });

    it("unregister removes scope from tracking", () => {
      const registry = createScopeRegistry();
      registry.register("scope-delete", { ttlMs: 0 }); // would expire immediately
      registry.unregister("scope-delete");
      // After unregistering, should behave as unknown scope (no constraint)
      const result = registry.check("scope-delete");
      expect(result).toBeUndefined();
    });

    it("getOptions returns the registered options", () => {
      const registry = createScopeRegistry();
      const opts = { ttlMs: 5000, maxCallsPerWindow: 10, windowMs: 1000 };
      registry.register("scope-opts", opts);
      expect(registry.getOptions("scope-opts")).toEqual(opts);
    });

    it("getOptions returns undefined for unregistered scope", () => {
      const registry = createScopeRegistry();
      expect(registry.getOptions("not-registered")).toBeUndefined();
    });
  });

  describe("disposeExpired()", () => {
    it("removes scopes whose TTL has elapsed", () => {
      const registry = createScopeRegistry();
      registry.register("expired-1", { ttlMs: 0 }); // already expired
      registry.register("expired-2", { ttlMs: 0 });
      registry.register("alive", { ttlMs: 60_000 });

      const disposed = registry.disposeExpired();
      expect(disposed).toBe(2);
      // Expired scopes are gone
      expect(registry.getOptions("expired-1")).toBeUndefined();
      expect(registry.getOptions("expired-2")).toBeUndefined();
      // Alive scope still present
      expect(registry.getOptions("alive")).toBeDefined();
    });

    it("returns 0 when no scopes are expired", () => {
      const registry = createScopeRegistry();
      registry.register("fresh", { ttlMs: 60_000 });
      expect(registry.disposeExpired()).toBe(0);
    });

    it("returns 0 when registry is empty", () => {
      const registry = createScopeRegistry();
      expect(registry.disposeExpired()).toBe(0);
    });

    it("skips scopes without a TTL", () => {
      const registry = createScopeRegistry();
      registry.register("no-ttl");
      registry.register("rate-only", { maxCallsPerWindow: 5 });
      expect(registry.disposeExpired()).toBe(0);
      expect(registry.getOptions("no-ttl")).toBeDefined();
      expect(registry.getOptions("rate-only")).toBeDefined();
    });

    it("is idempotent — second call returns 0 after first disposes", () => {
      const registry = createScopeRegistry();
      registry.register("gone", { ttlMs: 0 });
      expect(registry.disposeExpired()).toBe(1);
      expect(registry.disposeExpired()).toBe(0);
    });
  });

  describe("concurrent registrations", () => {
    it("multiple scopes can coexist independently", () => {
      const registry = createScopeRegistry();
      registry.register("scope-a", { ttlMs: 60_000 });
      registry.register("scope-b", { maxCallsPerWindow: 5, windowMs: 1000 });
      registry.register("scope-c");

      // Each scope has its own options
      expect(registry.getOptions("scope-a")?.ttlMs).toBe(60_000);
      expect(registry.getOptions("scope-b")?.maxCallsPerWindow).toBe(5);
      expect(registry.getOptions("scope-c")).toBeDefined();

      // All pass their own checks
      expect(registry.check("scope-a")).toBeUndefined();
      expect(registry.check("scope-b")).toBeUndefined();
      expect(registry.check("scope-c")).toBeUndefined();
    });

    it("combined TTL + rate limit: both constraints enforced", () => {
      const registry = createScopeRegistry();
      registry.register("combo", { ttlMs: 60_000, maxCallsPerWindow: 2, windowMs: 60_000 });

      expect(registry.check("combo")).toBeUndefined(); // call 1
      expect(registry.check("combo")).toBeUndefined(); // call 2
      // Third call exceeds rate limit
      const result = registry.check("combo");
      expect(result).toBeDefined();
      expect(result?.code).toBe(ACL025);
    });
  });
});
