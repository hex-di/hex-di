/**
 * Type-level tests for lazy resolution support.
 *
 * These tests verify that:
 * 1. LazyPort correctly wraps ports with thunk types
 * 2. Type predicates work correctly (IsLazyPort, UnwrapLazyPort)
 * 3. TransformLazyToOriginal converts lazy ports to original ports
 * 4. Adapters requiring lazy ports have their requirements transformed
 */
import { expectTypeOf, describe, it } from "vitest";
import {
  port,
  createAdapter,
  lazyPort,
  type Port,
  type InferService,
  type LazyPort,
} from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import type {
  IsLazyPort,
  UnwrapLazyPort,
  TransformLazyToOriginal,
  ExtractLazyPorts,
  HasLazyPorts,
} from "../src/advanced.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface UserService {
  getUser(id: string): { id: string; name: string };
}

interface NotificationService {
  send(userId: string, message: string): void;
}

const UserServicePort = port<UserService>()({ name: "UserService" });
const NotificationServicePort = port<NotificationService>()({
  name: "NotificationService",
});
const LoggerPort = port<{ log: (msg: string) => void }>()({ name: "Logger" });

// =============================================================================
// LazyPort Type Tests
// =============================================================================

describe("LazyPort type", () => {
  it("wraps port with thunk type () => T", () => {
    type Lazy = LazyPort<typeof UserServicePort>;
    type LazyService = InferService<Lazy>;

    // LazyService should be a function returning UserService
    expectTypeOf<LazyService>().toEqualTypeOf<() => UserService>();
  });

  it("prefixes port name with Lazy", () => {
    type Lazy = LazyPort<typeof UserServicePort>;
    type LazyName = Lazy["__portName"];

    expectTypeOf<LazyName>().toEqualTypeOf<"LazyUserService">();
  });

  it("is a valid Port type", () => {
    type Lazy = LazyPort<typeof UserServicePort>;

    // Should be assignable to Port
    type IsValidPort = Lazy extends Port<() => UserService, "LazyUserService"> ? true : false;
    expectTypeOf<IsValidPort>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// IsLazyPort Tests
// =============================================================================

describe("IsLazyPort type predicate", () => {
  it("returns true for LazyPort", () => {
    type Lazy = LazyPort<typeof UserServicePort>;
    expectTypeOf<IsLazyPort<Lazy>>().toEqualTypeOf<true>();
  });

  it("returns false for regular Port", () => {
    expectTypeOf<IsLazyPort<typeof UserServicePort>>().toEqualTypeOf<false>();
  });

  it("returns false for never", () => {
    // IsLazyPort<never> distributes over never, resulting in never
    expectTypeOf<IsLazyPort<never>>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// UnwrapLazyPort Tests
// =============================================================================

describe("UnwrapLazyPort", () => {
  it("extracts underlying port from LazyPort", () => {
    type Lazy = LazyPort<typeof UserServicePort>;
    type Original = UnwrapLazyPort<Lazy>;

    expectTypeOf<Original>().toEqualTypeOf<typeof UserServicePort>();
  });

  it("returns never for non-lazy port", () => {
    type Result = UnwrapLazyPort<typeof UserServicePort>;
    expectTypeOf<Result>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// TransformLazyToOriginal Tests
// =============================================================================

describe("TransformLazyToOriginal", () => {
  it("transforms LazyPort to original port", () => {
    type Lazy = LazyPort<typeof UserServicePort>;
    type Transformed = TransformLazyToOriginal<Lazy>;

    expectTypeOf<Transformed>().toEqualTypeOf<typeof UserServicePort>();
  });

  it("passes through regular port unchanged", () => {
    type Transformed = TransformLazyToOriginal<typeof LoggerPort>;
    expectTypeOf<Transformed>().toEqualTypeOf<typeof LoggerPort>();
  });

  it("transforms mixed union (lazy + regular)", () => {
    type Lazy = LazyPort<typeof UserServicePort>;
    type Mixed = Lazy | typeof LoggerPort;
    type Transformed = TransformLazyToOriginal<Mixed>;

    // Should be UserServicePort | LoggerPort
    expectTypeOf<Transformed>().toEqualTypeOf<typeof UserServicePort | typeof LoggerPort>();
  });

  it("returns never for never input", () => {
    type Transformed = TransformLazyToOriginal<never>;
    expectTypeOf<Transformed>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// ExtractLazyPorts Tests
// =============================================================================

describe("ExtractLazyPorts", () => {
  it("extracts lazy ports from union", () => {
    type LazyUser = LazyPort<typeof UserServicePort>;
    type Mixed = LazyUser | typeof LoggerPort;
    type Extracted = ExtractLazyPorts<Mixed>;

    expectTypeOf<Extracted>().toEqualTypeOf<LazyUser>();
  });

  it("returns never when no lazy ports", () => {
    type Ports = typeof UserServicePort | typeof LoggerPort;
    type Extracted = ExtractLazyPorts<Ports>;

    expectTypeOf<Extracted>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// HasLazyPorts Tests
// =============================================================================

describe("HasLazyPorts", () => {
  it("returns true when union contains lazy port", () => {
    type LazyUser = LazyPort<typeof UserServicePort>;
    type Mixed = LazyUser | typeof LoggerPort;

    expectTypeOf<HasLazyPorts<Mixed>>().toEqualTypeOf<true>();
  });

  it("returns false when no lazy ports", () => {
    type Regular = typeof UserServicePort | typeof LoggerPort;
    expectTypeOf<HasLazyPorts<Regular>>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// Adapter Integration Tests
// =============================================================================

describe("Adapter with lazy requirements", () => {
  it("transforms lazy requirement to original port in $unsatisfied", () => {
    // Create adapter that requires lazy UserService
    const LazyUserServicePort = lazyPort(UserServicePort);

    const NotificationAdapter = createAdapter({
      provides: NotificationServicePort,
      requires: [LazyUserServicePort] as const,
      lifetime: "singleton",
      factory: ({ LazyUserService }) => ({
        send: (userId, message) => {
          const userService = LazyUserService();
          const user = userService.getUser(userId);
          void `Sending "${message}" to ${user.name}`;
        },
      }),
    });

    const builder = GraphBuilder.create().provide(NotificationAdapter);

    // $unsatisfied should show UserServicePort (original), not LazyUserServicePort
    type Unsatisfied = typeof builder.$unsatisfied;
    expectTypeOf<Unsatisfied>().toEqualTypeOf<typeof UserServicePort>();
  });

  it("satisfies lazy requirement when original port is provided", () => {
    const LazyUserServicePort = lazyPort(UserServicePort);

    const UserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [] as const,
      lifetime: "singleton",
      factory: () => ({
        getUser: id => ({ id, name: "Alice" }),
      }),
    });

    const NotificationAdapter = createAdapter({
      provides: NotificationServicePort,
      requires: [LazyUserServicePort] as const,
      lifetime: "singleton",
      factory: ({ LazyUserService }) => ({
        send: (userId, message) => {
          const userService = LazyUserService();
          const user = userService.getUser(userId);
          void `Sending "${message}" to ${user.name}`;
        },
      }),
    });

    // Provide both adapters - lazy requirement should be satisfied
    const builder = GraphBuilder.create().provide(UserServiceAdapter).provide(NotificationAdapter);

    // All dependencies satisfied
    type Unsatisfied = typeof builder.$unsatisfied;
    expectTypeOf<Unsatisfied>().toEqualTypeOf<never>();
  });

  it("bidirectional dependency compiles without cycle error", () => {
    // A depends on B, B depends on lazy A
    const PortA = port<{ getValue(): number }>()({ name: "A" });
    const PortB = port<{ getDoubled(): number }>()({ name: "B" });

    const LazyA = lazyPort(PortA);

    const AdapterA = createAdapter({
      provides: PortA,
      requires: [PortB] as const,
      lifetime: "singleton",
      factory: ({ B }) => ({
        getValue: () => B.getDoubled() / 2,
      }),
    });

    const AdapterB = createAdapter({
      provides: PortB,
      requires: [LazyA] as const,
      lifetime: "singleton",
      factory: ({ LazyA: getLazyA }) => ({
        getDoubled: () => {
          const a = getLazyA();
          return a.getValue() * 2;
        },
      }),
    });

    // This should compile - B's lazy requirement for A transforms to A
    // After providing both, A is satisfied and B is satisfied
    const builder = GraphBuilder.create()
      .provide(AdapterB) // Requires A (via lazy)
      .provide(AdapterA); // Provides A, requires B

    // All dependencies satisfied
    type Unsatisfied = typeof builder.$unsatisfied;
    expectTypeOf<Unsatisfied>().toEqualTypeOf<never>();

    // Can build successfully
    const graph = builder.build();
    expectTypeOf<typeof graph>().not.toBeString();
  });
});
