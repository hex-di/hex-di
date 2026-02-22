/**
 * Async factory error handling tests.
 *
 * Tests error handling, retries, and failure scenarios for async factories.
 */

import { describe, expect, it } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { ResultAsync, safeTry, ok } from "@hex-di/result";

interface Service {
  name: string;
}

describe("async factory error handling", () => {
  it("rejecting factory propagates error", async () => {
    const FailingPort = port<Service>()({ name: "Failing" });

    const failingAdapter = createAdapter({
      provides: FailingPort,
      requires: [],
      factory: () => Promise.reject(new Error("Factory initialization failed")),
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

    const FailingPort = port<Service>()({ name: "FailingCustom" });

    const failingAdapter = createAdapter({
      provides: FailingPort,
      requires: [],
      factory: () =>
        Promise.reject(new InitializationError("Database connection failed", "DB_CONN_ERR")),
    });

    await expect(failingAdapter.factory({})).rejects.toThrow(InitializationError);
    await expect(failingAdapter.factory({})).rejects.toMatchObject({
      code: "DB_CONN_ERR",
    });
  });

  it("slow factory eventually resolves", async () => {
    const SlowPort = port<Service>()({ name: "Slow" });
    let resolveCount = 0;

    const slowAdapter = createAdapter({
      provides: SlowPort,
      requires: [],
      factory: () =>
        safeTry(async function* () {
          // Simulate async work with multiple promise chains
          await Promise.resolve();
          await Promise.resolve();
          await Promise.resolve();
          resolveCount++;
          return ok({ name: "slow-service" });
        }),
    });

    const result = await slowAdapter.factory({});

    // Factory returns ResultAsync; await gives Result whose value is the service
    expect(result).toHaveProperty("_tag", "Ok");
    expect(result).toHaveProperty("value", { name: "slow-service" });
    expect(resolveCount).toBe(1);
  });

  it("factory can check abort flag pattern", async () => {
    const AbortablePort = port<Service>()({ name: "Abortable" });

    // Simulate an abort flag (common pattern without AbortController)
    let aborted = false;

    const abortableAdapter = createAdapter({
      provides: AbortablePort,
      requires: [],
      factory: () => {
        // Check abort flag before expensive operation
        if (aborted) {
          return Promise.reject(new Error("Operation aborted"));
        }
        return ResultAsync.ok({ name: "abortable-service" });
      },
    });

    // Set abort flag before calling
    aborted = true;

    await expect(abortableAdapter.factory({})).rejects.toThrow("Operation aborted");
  });

  it("conditional failure based on environment", async () => {
    const EnvDependentPort = port<Service>()({ name: "EnvDependent" });

    const createEnvAdapter = (shouldFail: boolean) =>
      createAdapter({
        provides: EnvDependentPort,
        requires: [],
        factory: () => {
          if (shouldFail) {
            return Promise.reject(new Error("Environment check failed: missing required config"));
          }
          return ResultAsync.ok({ name: "env-dependent-service" });
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
    expect(result).toHaveProperty("_tag", "Ok");
    expect(result).toHaveProperty("value", { name: "env-dependent-service" });
  });

  it("conditional failure based on dependency state", async () => {
    const HealthCheckPort = port<Service>()({ name: "HealthCheck" });

    interface MockDep {
      isHealthy: () => boolean;
    }

    const DependencyPort = port<MockDep>()({ name: "Dependency" });

    const healthCheckAdapter = createAdapter({
      provides: HealthCheckPort,
      requires: [DependencyPort],
      factory: (deps: { Dependency: MockDep }) => {
        // Check dependency health before proceeding
        if (!deps.Dependency.isHealthy()) {
          return Promise.reject(new Error("Dependency health check failed"));
        }
        return ResultAsync.ok({ name: "health-check-service" });
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
    expect(result).toHaveProperty("_tag", "Ok");
    expect(result).toHaveProperty("value", { name: "health-check-service" });
  });

  it("factory that rejects with non-Error value", async () => {
    const WeirdRejectPort = port<Service>()({ name: "WeirdReject" });

    const weirdAdapter = createAdapter({
      provides: WeirdRejectPort,
      requires: [],
      factory: () => Promise.reject("string rejection"),
    });

    await expect(weirdAdapter.factory({})).rejects.toBe("string rejection");
  });

  it("factory retry pattern", async () => {
    const RetryPort = port<Service>()({ name: "Retry" });
    let attemptCount = 0;
    const MAX_RETRIES = 3;
    const SUCCEED_ON_ATTEMPT = 3;

    const retryAdapter = createAdapter({
      provides: RetryPort,
      requires: [],
      factory: () => {
        attemptCount++;
        if (attemptCount < SUCCEED_ON_ATTEMPT) {
          return Promise.reject(new Error(`Attempt ${attemptCount} failed`));
        }
        return ResultAsync.ok({ name: "retry-service" });
      },
    });

    // Helper function to retry
    async function withRetry<T>(fn: () => PromiseLike<T>, retries: number): Promise<T> {
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
    expect(result).toHaveProperty("_tag", "Ok");
    expect(result).toHaveProperty("value", { name: "retry-service" });
    expect(attemptCount).toBe(SUCCEED_ON_ATTEMPT);
  });

  it("factory partial initialization failure with cleanup", async () => {
    const PartialPort = port<Service>()({ name: "Partial" });
    let cleanupCalled = false;
    let resourceAllocated = false;

    const partialAdapter = createAdapter({
      provides: PartialPort,
      requires: [],
      factory: () => {
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
          return Promise.reject(error);
        }
      },
    });

    await expect(partialAdapter.factory({})).rejects.toThrow("Second initialization step failed");
    expect(cleanupCalled).toBe(true);
  });

  it("factory that fails on specific input", async () => {
    const ValidatingPort = port<Service>()({ name: "Validating" });

    interface Config {
      value: number;
    }

    const ConfigPort = port<Config>()({ name: "Config" });

    const validatingAdapter = createAdapter({
      provides: ValidatingPort,
      requires: [ConfigPort],
      factory: (deps: { Config: Config }) => {
        if (deps.Config.value < 0) {
          return Promise.reject(new Error("Config value must be non-negative"));
        }
        if (deps.Config.value > 100) {
          return Promise.reject(new Error("Config value must not exceed 100"));
        }
        return ResultAsync.ok({ name: `validating-service-${deps.Config.value}` });
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
    expect(result).toHaveProperty("_tag", "Ok");
    expect(result).toHaveProperty("value", { name: "validating-service-50" });
  });
});
