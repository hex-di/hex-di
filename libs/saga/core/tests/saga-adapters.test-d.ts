import { describe, it, expectTypeOf } from "vitest";
import { createSagaAdapter } from "../src/adapters/factory.js";
import { sagaPort, sagaManagementPort } from "../src/ports/factory.js";
import type { SagaAdapter, SagaAdapterConfig } from "../src/adapters/types.js";
import type { SagaManagementPort } from "../src/ports/types.js";
import type { AnySagaDefinition } from "../src/saga/types.js";
import { createPort } from "@hex-di/core";

// =============================================================================
// Test Setup
// =============================================================================

const TestPort = sagaPort<{ orderId: string }, { result: string }, { kind: "err" }>()({
  name: "TestSaga",
});

// =============================================================================
// Type-Level Tests (DOD 4)
// =============================================================================

describe("Saga Adapters - Type Level", () => {
  // DOD 4 type #1
  it("createSagaAdapter infers port type from first argument", () => {
    const adapter = createSagaAdapter(TestPort, {
      saga: {
        name: "test",
        steps: [],
        outputMapper: () => ({}),
        options: { compensationStrategy: "sequential" },
      },
    });
    expectTypeOf(adapter.port).toEqualTypeOf<typeof TestPort>();
  });

  // DOD 4 type #4
  it("Adapter lifetime is 'scoped' | 'singleton' | 'transient'", () => {
    type Lifetime = SagaAdapterConfig["lifetime"];
    expectTypeOf<NonNullable<Lifetime>>().toEqualTypeOf<"singleton" | "scoped" | "transient">();
  });

  // DOD 4 type #5
  it("SagaAdapter type carries correct port type", () => {
    type Adapter = SagaAdapter<typeof TestPort>;
    expectTypeOf<Adapter["port"]>().toEqualTypeOf<typeof TestPort>();
  });

  // DOD 4 type #6
  it("Adapter config saga field accepts AnySagaDefinition", () => {
    type Config = SagaAdapterConfig;
    expectTypeOf<Config>().toHaveProperty("saga");
  });

  // DOD 4 type #7
  it("Adapter requires accepts an array of port tokens", () => {
    const StepPort = createPort<"StepPort", unknown>({ name: "StepPort" });
    const adapter = createSagaAdapter(TestPort, {
      saga: {
        name: "test",
        steps: [],
        outputMapper: () => ({}),
        options: { compensationStrategy: "sequential" },
      },
      requires: [StepPort],
    });
    expectTypeOf(adapter.requires).toMatchTypeOf<readonly unknown[]>();
  });

  // DOD 4 type #8
  it("Adapter requires with multiple ports is readonly unknown[]", () => {
    const PortA = createPort<"PortA", unknown>({ name: "PortA" });
    const PortB = createPort<"PortB", unknown>({ name: "PortB" });
    const adapter = createSagaAdapter(TestPort, {
      saga: {
        name: "test",
        steps: [],
        outputMapper: () => ({}),
        options: { compensationStrategy: "sequential" },
      },
      requires: [PortA, PortB],
    });
    expectTypeOf(adapter.requires).toMatchTypeOf<readonly unknown[]>();
  });

  // DOD 4 type #9
  it("Adapter saga field typed as AnySagaDefinition", () => {
    type Adapter = SagaAdapter<typeof TestPort>;
    expectTypeOf<Adapter["saga"]>().toMatchTypeOf<AnySagaDefinition>();
  });

  // DOD 4 type #10
  it("SagaManagementPort excludes TInput from type parameters", () => {
    const _MgmtPort = sagaManagementPort<{ result: string }>()({ name: "MgmtPort" });
    type MgmtPort = typeof _MgmtPort;
    // Management port only has TName, TOutput, TError - no TInput
    expectTypeOf<MgmtPort>().toMatchTypeOf<SagaManagementPort<string, unknown, unknown>>();
  });
});
