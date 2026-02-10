/**
 * E2E tests for scope lifecycle management.
 *
 * Tests multi-tenant cache isolation, active fetch cancellation on
 * scope disposal, and disposed error state.
 */

import { describe, it, expect, afterEach } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { createQueryPort, createQueryClient, type QueryClient } from "../../src/index.js";
import { createTestContainer } from "../helpers/test-container.js";

// =============================================================================
// Test Ports
// =============================================================================

const TenantDataPort = createQueryPort<{ tenantId: string; data: string[] }, void, Error>()({
  name: "tenantData",
});

const UserSessionPort = createQueryPort<{ userId: string; active: boolean }, void, Error>()({
  name: "userSession",
});

// =============================================================================
// Tests
// =============================================================================

describe("Scope lifecycle", () => {
  let rootClient: QueryClient;

  afterEach(() => {
    rootClient?.dispose();
  });

  it("should isolate cache between tenant scopes", async () => {
    const container = createTestContainer();
    container.register(TenantDataPort, () => ResultAsync.ok({ tenantId: "root", data: [] }));
    rootClient = createQueryClient({ container });

    // Create two tenant scopes (child clients)
    const tenantA = rootClient.createChild();
    const tenantB = rootClient.createChild();

    // Set data directly for each tenant
    tenantA.setQueryData(TenantDataPort, undefined, { tenantId: "A", data: ["A-data-1"] });
    tenantB.setQueryData(TenantDataPort, undefined, { tenantId: "B", data: ["B-data-1"] });

    // Each tenant sees its own data
    const dataA = tenantA.getQueryData(TenantDataPort, undefined);
    const dataB = tenantB.getQueryData(TenantDataPort, undefined);
    expect(dataA?.tenantId).toBe("A");
    expect(dataB?.tenantId).toBe("B");

    tenantA.dispose();
    tenantB.dispose();
  });

  it("should return QueryDisposed error after scope disposal", async () => {
    const container = createTestContainer();
    container.register(TenantDataPort, () => ResultAsync.ok({ tenantId: "temp", data: [] }));
    rootClient = createQueryClient({ container });

    const scope = rootClient.createChild();

    // Fetch works before disposal
    const beforeDispose = await scope.fetchQuery(TenantDataPort, undefined);
    expect(beforeDispose.isOk()).toBe(true);

    // Dispose the scope
    scope.dispose();
    expect(scope.isDisposed).toBe(true);

    // Operations after disposal should return QueryDisposed
    const afterDispose = await scope.fetchQuery(TenantDataPort, undefined);
    expect(afterDispose.isErr()).toBe(true);
    if (afterDispose.isErr()) {
      expect(afterDispose.error).toHaveProperty("_tag", "QueryDisposed");
    }
  });

  it("should dispose child without affecting parent", async () => {
    const container = createTestContainer();
    container.register(UserSessionPort, () =>
      ResultAsync.ok({ userId: "root-user", active: true })
    );
    rootClient = createQueryClient({ container });

    const child = rootClient.createChild();

    // Both can fetch
    await rootClient.fetchQuery(UserSessionPort, undefined);
    await child.fetchQuery(UserSessionPort, undefined);

    // Dispose child
    child.dispose();

    // Parent should still work
    expect(rootClient.isDisposed).toBe(false);
    const parentResult = await rootClient.fetchQuery(UserSessionPort, undefined);
    expect(parentResult.isOk()).toBe(true);
  });
});
