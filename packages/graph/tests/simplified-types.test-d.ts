/**
 * Type-level tests for SimplifiedView, InferBuilderProvides, InferBuilderUnsatisfied,
 * and the $provides/$unsatisfied phantom shortcuts.
 *
 * These tests verify that the simplified type utilities correctly extract and
 * expose type information from GraphBuilder instances.
 */

import { describe, expectTypeOf, it, expect } from "vitest";
import {
  GraphBuilder,
  SimplifiedView,
  InferBuilderProvides,
  InferBuilderUnsatisfied,
  PrettyBuilder,
} from "../src/index.js";
import {
  LoggerAdapter,
  DatabaseAdapter,
  UserServiceAdapter,
  type LoggerPortType,
  type DatabasePortType,
  type UserServicePortType,
} from "./fixtures.js";

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

  it("tracks override ports", () => {
    const builder = GraphBuilder.create().override(LoggerAdapter);
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

  it("tracks overrides", () => {
    const builder = GraphBuilder.create().override(LoggerAdapter);
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
