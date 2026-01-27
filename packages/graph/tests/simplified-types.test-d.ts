/**
 * Type-level tests for SimplifiedView, InferBuilderProvides, InferBuilderUnsatisfied,
 * and the $provides/$unsatisfied phantom shortcuts.
 *
 * These tests verify that the simplified type utilities correctly extract and
 * expose type information from GraphBuilder instances.
 */

import { describe, expectTypeOf, it, expect } from "vitest";
import { GraphBuilder, PrettyBuilder, createAdapter } from "../src/index.js";
import type {
  SimplifiedView,
  InferBuilderProvides,
  InferBuilderUnsatisfied,
} from "../src/internal.js";
import {
  LoggerPort,
  DatabasePort,
  UserServicePort,
  type LoggerPortType,
  type DatabasePortType,
  type UserServicePortType,
} from "./fixtures.js";

// =============================================================================
// Test Adapters (created locally for proper type inference)
// =============================================================================

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [] as const,
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [LoggerPort] as const,
  lifetime: "singleton",
  factory: () => ({ query: async () => ({}) }),
});

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [DatabasePort, LoggerPort] as const,
  lifetime: "scoped",
  factory: () => ({
    getUser: async (id: string) => ({ id, name: "Test User" }),
  }),
});

describe("SimplifiedView type utility", () => {
  it("extracts provides from builder", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    expect(builder).toBeDefined();

    type View = SimplifiedView<typeof builder>;
    expectTypeOf<View["provides"]>().toEqualTypeOf<LoggerPortType>();
  });

  it("extracts unsatisfied dependencies", () => {
    const builder = GraphBuilder.create().provide(DatabaseAdapter);
    expect(builder).toBeDefined();

    // DatabaseAdapter requires LoggerPort, which is not provided
    type View = SimplifiedView<typeof builder>;
    expectTypeOf<View["unsatisfied"]>().toEqualTypeOf<LoggerPortType>();
  });

  it("shows never for unsatisfied when all deps met", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);
    expect(builder).toBeDefined();

    type View = SimplifiedView<typeof builder>;
    expectTypeOf<View["unsatisfied"]>().toEqualTypeOf<never>();
  });

  it("tracks multiple provided ports", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    type View = SimplifiedView<typeof builder>;
    expectTypeOf<View["provides"]>().toEqualTypeOf<
      LoggerPortType | DatabasePortType | UserServicePortType
    >();
  });

  it("tracks override ports with forParent()", () => {
    // Create a parent graph that provides Logger
    const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();

    // Override the Logger in child builder
    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [] as const,
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const builder = GraphBuilder.forParent(parentGraph).override(MockLoggerAdapter);
    expect(builder).toBeDefined();

    type View = SimplifiedView<typeof builder>;
    expectTypeOf<View["overrides"]>().toEqualTypeOf<LoggerPortType>();
  });

  it("shows never for asyncPorts when none present", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    expect(builder).toBeDefined();

    type View = SimplifiedView<typeof builder>;
    expectTypeOf<View["asyncPorts"]>().toEqualTypeOf<never>();
  });

  it("hides internal phantom types", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);
    expect(builder).toBeDefined();

    type View = SimplifiedView<typeof builder>;

    // SimplifiedView should only expose these four properties
    type Keys = keyof View;
    expectTypeOf<Keys>().toEqualTypeOf<"provides" | "unsatisfied" | "asyncPorts" | "overrides">();
  });
});

describe("InferBuilderProvides type utility", () => {
  it("extracts single provided port", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    expect(builder).toBeDefined();

    type Provided = InferBuilderProvides<typeof builder>;
    expectTypeOf<Provided>().toEqualTypeOf<LoggerPortType>();
  });

  it("extracts union of multiple provided ports", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);
    expect(builder).toBeDefined();

    type Provided = InferBuilderProvides<typeof builder>;
    expectTypeOf<Provided>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
  });

  it("returns never for empty builder", () => {
    const builder = GraphBuilder.create();
    expect(builder).toBeDefined();

    type Provided = InferBuilderProvides<typeof builder>;
    expectTypeOf<Provided>().toEqualTypeOf<never>();
  });
});

describe("InferBuilderUnsatisfied type utility", () => {
  it("shows unsatisfied dependency", () => {
    const builder = GraphBuilder.create().provide(DatabaseAdapter);
    expect(builder).toBeDefined();

    // DatabaseAdapter requires LoggerPort
    type Missing = InferBuilderUnsatisfied<typeof builder>;
    expectTypeOf<Missing>().toEqualTypeOf<LoggerPortType>();
  });

  it("shows multiple unsatisfied dependencies", () => {
    const builder = GraphBuilder.create().provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    // UserServiceAdapter requires LoggerPort and DatabasePort
    type Missing = InferBuilderUnsatisfied<typeof builder>;
    expectTypeOf<Missing>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
  });

  it("returns never when all dependencies satisfied", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    type Missing = InferBuilderUnsatisfied<typeof builder>;
    expectTypeOf<Missing>().toEqualTypeOf<never>();
  });

  it("returns never for empty builder", () => {
    const builder = GraphBuilder.create();
    expect(builder).toBeDefined();

    type Missing = InferBuilderUnsatisfied<typeof builder>;
    expectTypeOf<Missing>().toEqualTypeOf<never>();
  });
});

describe("$provides phantom shortcut", () => {
  it("exposes provided ports union via typeof", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);
    expect(builder).toBeDefined();

    type Provided = typeof builder.$provides;
    expectTypeOf<Provided>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
  });

  it("matches InferBuilderProvides result", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);
    expect(builder).toBeDefined();

    type ViaPhantom = typeof builder.$provides;
    type ViaUtility = InferBuilderProvides<typeof builder>;

    expectTypeOf<ViaPhantom>().toEqualTypeOf<ViaUtility>();
  });

  it("is never for empty builder", () => {
    const builder = GraphBuilder.create();
    expect(builder).toBeDefined();

    type Provided = typeof builder.$provides;
    expectTypeOf<Provided>().toEqualTypeOf<never>();
  });
});

describe("$unsatisfied phantom shortcut", () => {
  it("exposes unsatisfied dependencies via typeof", () => {
    const builder = GraphBuilder.create().provide(DatabaseAdapter);
    expect(builder).toBeDefined();

    type Missing = typeof builder.$unsatisfied;
    expectTypeOf<Missing>().toEqualTypeOf<LoggerPortType>();
  });

  it("matches InferBuilderUnsatisfied result", () => {
    const builder = GraphBuilder.create().provide(DatabaseAdapter);
    expect(builder).toBeDefined();

    type ViaPhantom = typeof builder.$unsatisfied;
    type ViaUtility = InferBuilderUnsatisfied<typeof builder>;

    expectTypeOf<ViaPhantom>().toEqualTypeOf<ViaUtility>();
  });

  it("is never when all deps satisfied", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);
    expect(builder).toBeDefined();

    type Missing = typeof builder.$unsatisfied;
    expectTypeOf<Missing>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// PrettyBuilder Tests
// =============================================================================

describe("PrettyBuilder type utility", () => {
  it("extracts simplified view from empty builder", () => {
    const builder = GraphBuilder.create();
    expect(builder).toBeDefined();

    type View = PrettyBuilder<typeof builder>;
    expectTypeOf<View["provides"]>().toEqualTypeOf<never>();
    expectTypeOf<View["unsatisfied"]>().toEqualTypeOf<never>();
    expectTypeOf<View["asyncPorts"]>().toEqualTypeOf<never>();
    expectTypeOf<View["overrides"]>().toEqualTypeOf<never>();
  });

  it("extracts provides and unsatisfied from populated builder", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);
    expect(builder).toBeDefined();

    type View = PrettyBuilder<typeof builder>;
    expectTypeOf<View["provides"]>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
    expectTypeOf<View["unsatisfied"]>().toEqualTypeOf<never>();
  });

  it("shows unsatisfied when deps missing", () => {
    const builder = GraphBuilder.create().provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    type View = PrettyBuilder<typeof builder>;
    expectTypeOf<View["provides"]>().toEqualTypeOf<UserServicePortType>();
    expectTypeOf<View["unsatisfied"]>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
  });

  it("tracks overrides with forParent()", () => {
    // Create a parent graph that provides Logger
    const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();

    // Override the Logger in child builder
    const MockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [] as const,
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const builder = GraphBuilder.forParent(parentGraph).override(MockLoggerAdapter);
    expect(builder).toBeDefined();

    type View = PrettyBuilder<typeof builder>;
    expectTypeOf<View["overrides"]>().toEqualTypeOf<LoggerPortType>();
  });

  it("is equivalent to SimplifiedView", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    type PrettyView = PrettyBuilder<typeof builder>;
    type SimpleView = SimplifiedView<typeof builder>;

    // Both should have the same structure
    expectTypeOf<PrettyView>().toEqualTypeOf<SimpleView>();
  });

  it("hides internal phantom types", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);
    expect(builder).toBeDefined();

    type View = PrettyBuilder<typeof builder>;

    // PrettyBuilder should only expose these four properties
    type Keys = keyof View;
    expectTypeOf<Keys>().toEqualTypeOf<"provides" | "unsatisfied" | "asyncPorts" | "overrides">();
  });

  it("returns never for non-builder types", () => {
    type NotABuilder = { someProperty: string };
    type View = PrettyBuilder<NotABuilder>;
    expectTypeOf<View>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// DebugBuilderInternals Tests
// =============================================================================

describe("DebugBuilderInternals type utility", () => {
  it("exposes internal state from empty builder", () => {
    const builder = GraphBuilder.create();
    expect(builder).toBeDefined();

    type Internals = import("../src/internal.js").DebugBuilderInternals<typeof builder>;

    // Default maxDepth should be 50
    expectTypeOf<Internals["maxDepth"]>().toEqualTypeOf<50>();

    // Default unsafeDepthOverride should be false
    expectTypeOf<Internals["unsafeDepthOverride"]>().toEqualTypeOf<false>();

    // No parent by default
    expectTypeOf<Internals["parentProvides"]>().toEqualTypeOf<unknown>();
  });

  it("tracks lifetimeMap after providing adapters", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    expect(builder).toBeDefined();

    type Internals = import("../src/internal.js").DebugBuilderInternals<typeof builder>;

    // lifetimeMap should have Logger with level 1 (singleton)
    type LoggerLevel = Internals["lifetimeMap"]["Logger"];
    expectTypeOf<LoggerLevel>().toEqualTypeOf<1>();
  });

  it("returns never for non-builder types", () => {
    type Internals = import("../src/internal.js").DebugBuilderInternals<{ someProperty: string }>;
    expectTypeOf<Internals>().toBeNever();
  });
});
