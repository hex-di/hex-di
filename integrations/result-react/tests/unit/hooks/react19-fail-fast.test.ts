// @traces INV-R11
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("React 19 fail-fast at import time (INV-R11)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("useOptimisticResult", () => {
    it("throws when useOptimistic is not a function", async () => {
      vi.doMock("react", () => ({
        default: { version: "18.2.0" },
        version: "18.2.0",
        useState: vi.fn(),
        useOptimistic: undefined,
      }));

      await expect(
        () => import("../../../src/hooks/use-optimistic-result.js"),
      ).rejects.toThrow(/useOptimisticResult requires React 19/);
    });

    it("does not throw when useOptimistic is available", async () => {
      vi.doMock("react", () => ({
        default: { version: "19.0.0" },
        version: "19.0.0",
        useState: vi.fn(),
        useOptimistic: vi.fn(() => [undefined, vi.fn()]),
      }));

      await expect(
        import("../../../src/hooks/use-optimistic-result.js"),
      ).resolves.toBeDefined();
    });
  });

  describe("useResultTransition", () => {
    it("throws when React major version is less than 19", async () => {
      vi.doMock("react", () => ({
        default: { version: "18.3.1" },
        version: "18.3.1",
        useState: vi.fn(),
        useTransition: vi.fn(),
      }));

      await expect(
        () => import("../../../src/hooks/use-result-transition.js"),
      ).rejects.toThrow(/useResultTransition requires React 19/);
    });

    it("does not throw when React major version is 19+", async () => {
      vi.doMock("react", () => ({
        default: { version: "19.0.0" },
        version: "19.0.0",
        useState: vi.fn(),
        useTransition: vi.fn(() => [false, vi.fn()]),
      }));

      await expect(
        import("../../../src/hooks/use-result-transition.js"),
      ).resolves.toBeDefined();
    });
  });
});
