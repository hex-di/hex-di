/**
 * Async factory error handling tests.
 *
 * Tests error handling, retries, and failure scenarios for async factories.
 */

import { describe, expect, it } from "vitest";
import { createPort } from "@hex-di/ports";
import { createAsyncAdapter } from "../../src/index.js";

interface Service {
  name: string;
}

describe("async factory error handling", () => {
  it("rejecting factory propagates error", async () => {
    const FailingPort = createPort<"Failing", Service>("Failing");

    const failingAdapter = createAsyncAdapter({
      provides: FailingPort,
      requires: [],
      factory: async () => {
        throw new Error("Factory initialization failed");
      },
    });

    // The factory should throw when invoked
    await expect(failingAdapter.factory({})).rejects.toThrow("Factory initialization failed");
  });

  it("rejecting factory with custom error type", async () => {
    class InitializationError extends Error {
      constructor(
        message: string,
        public readonly code: string
      ) {
        super(message);
        this.name = "InitializationError";
      }
    }

    const FailingPort = createPort<"FailingCustom", Service>("FailingCustom");

    const failingAdapter = createAsyncAdapter({
      provides: FailingPort,
      requires: [],
      factory: async () => {
        throw new InitializationError("Database connection failed", "DB_CONN_ERR");
      },
    });

    await expect(failingAdapter.factory({})).rejects.toThrow(InitializationError);
    await expect(failingAdapter.factory({})).rejects.toMatchObject({
      code: "DB_CONN_ERR",
    });
  });

  it("slow factory eventually resolves", async () => {
    const SlowPort = createPort<"Slow", Service>("Slow");
    let resolveCount = 0;

    const slowAdapter = createAsyncAdapter({
      provides: SlowPort,
      requires: [],
      factory: async () => {
        // Simulate async work with multiple promise chains
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        resolveCount++;
        return { name: "slow-service" };
      },
    });

    const result = await slowAdapter.factory({});

    expect(result).toEqual({ name: "slow-service" });
    expect(resolveCount).toBe(1);
  });

  it("factory can check abort flag pattern", async () => {
    const AbortablePort = createPort<"Abortable", Service>("Abortable");

    // Simulate an abort flag (common pattern without AbortController)
    let aborted = false;

    const abortableAdapter = createAsyncAdapter({
      provides: AbortablePort,
      requires: [],
      factory: async () => {
        // Check abort flag before expensive operation
        if (aborted) {
          throw new Error("Operation aborted");
        }
        return { name: "abortable-service" };
      },
    });

    // Set abort flag before calling
    aborted = true;

    await expect(abortableAdapter.factory({})).rejects.toThrow("Operation aborted");
  });

  it("conditional failure based on environment", async () => {
    const EnvDependentPort = createPort<"EnvDependent", Service>("EnvDependent");

    const createEnvAdapter = (shouldFail: boolean) =>
      createAsyncAdapter({
        provides: EnvDependentPort,
        requires: [],
        factory: async () => {
          if (shouldFail) {
            throw new Error("Environment check failed: missing required config");
          }
          return { name: "env-dependent-service" };
        },
      });

    // Failure case
    const failingAdapter = createEnvAdapter(true);
    await expect(failingAdapter.factory({})).rejects.toThrow(
      "Environment check failed: missing required config"
    );

    // Success case
    const successAdapter = createEnvAdapter(false);
    const result = await successAdapter.factory({});
    expect(result).toEqual({ name: "env-dependent-service" });
  });

  it("conditional failure based on dependency state", async () => {
    const HealthCheckPort = createPort<"HealthCheck", Service>("HealthCheck");

    interface MockDep {
      isHealthy: () => boolean;
    }

    const DependencyPort = createPort<"Dependency", MockDep>("Dependency");

    const healthCheckAdapter = createAsyncAdapter({
      provides: HealthCheckPort,
      requires: [DependencyPort],
      factory: async (deps: { Dependency: MockDep }) => {
        // Check dependency health before proceeding
        if (!deps.Dependency.isHealthy()) {
          throw new Error("Dependency health check failed");
        }
        return { name: "health-check-service" };
      },
    });

    // Test with unhealthy dependency
    const unhealthyDep = { isHealthy: () => false };
    await expect(healthCheckAdapter.factory({ Dependency: unhealthyDep })).rejects.toThrow(
      "Dependency health check failed"
    );

    // Test with healthy dependency
    const healthyDep = { isHealthy: () => true };
    const result = await healthCheckAdapter.factory({ Dependency: healthyDep });
    expect(result).toEqual({ name: "health-check-service" });
  });

  it("factory that rejects with non-Error value", async () => {
    const WeirdRejectPort = createPort<"WeirdReject", Service>("WeirdReject");

    const weirdAdapter = createAsyncAdapter({
      provides: WeirdRejectPort,
      requires: [],
      factory: async () => {
        // Some code rejects with non-Error values
        return Promise.reject("string rejection");
      },
    });

    await expect(weirdAdapter.factory({})).rejects.toBe("string rejection");
  });

  it("factory retry pattern", async () => {
    const RetryPort = createPort<"Retry", Service>("Retry");
    let attemptCount = 0;
    const MAX_RETRIES = 3;
    const SUCCEED_ON_ATTEMPT = 3;

    const retryAdapter = createAsyncAdapter({
      provides: RetryPort,
      requires: [],
      factory: async () => {
        attemptCount++;
        if (attemptCount < SUCCEED_ON_ATTEMPT) {
          throw new Error(`Attempt ${attemptCount} failed`);
        }
        return { name: "retry-service" };
      },
    });

    // Helper function to retry
    async function withRetry<T>(fn: () => Promise<T>, retries: number): Promise<T> {
      try {
        return await fn();
      } catch (error) {
        if (retries > 0) {
          return withRetry(fn, retries - 1);
        }
        throw error;
      }
    }

    // Reset counter
    attemptCount = 0;

    // Should succeed after retries
    const result = await withRetry(() => retryAdapter.factory({}), MAX_RETRIES);
    expect(result).toEqual({ name: "retry-service" });
    expect(attemptCount).toBe(SUCCEED_ON_ATTEMPT);
  });

  it("factory partial initialization failure with cleanup", async () => {
    const PartialPort = createPort<"Partial", Service>("Partial");
    let cleanupCalled = false;
    let resourceAllocated = false;

    const partialAdapter = createAsyncAdapter({
      provides: PartialPort,
      requires: [],
      factory: async () => {
        // First step succeeds
        resourceAllocated = true;

        try {
          // Second step fails
          throw new Error("Second initialization step failed");
        } catch (error) {
          // Cleanup first resource
          if (resourceAllocated) {
            cleanupCalled = true;
          }
          throw error;
        }
      },
    });

    await expect(partialAdapter.factory({})).rejects.toThrow("Second initialization step failed");
    expect(cleanupCalled).toBe(true);
  });

  it("factory that fails on specific input", async () => {
    const ValidatingPort = createPort<"Validating", Service>("Validating");

    interface Config {
      value: number;
    }

    const ConfigPort = createPort<"Config", Config>("Config");

    const validatingAdapter = createAsyncAdapter({
      provides: ValidatingPort,
      requires: [ConfigPort],
      factory: async (deps: { Config: Config }) => {
        if (deps.Config.value < 0) {
          throw new Error("Config value must be non-negative");
        }
        if (deps.Config.value > 100) {
          throw new Error("Config value must not exceed 100");
        }
        return { name: `validating-service-${deps.Config.value}` };
      },
    });

    // Test negative value
    await expect(validatingAdapter.factory({ Config: { value: -1 } })).rejects.toThrow(
      "Config value must be non-negative"
    );

    // Test value too high
    await expect(validatingAdapter.factory({ Config: { value: 101 } })).rejects.toThrow(
      "Config value must not exceed 100"
    );

    // Test valid value
    const result = await validatingAdapter.factory({ Config: { value: 50 } });
    expect(result).toEqual({ name: "validating-service-50" });
  });
});
