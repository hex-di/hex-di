/**
 * Type Tests for Library Inspector Protocol
 *
 * Covers DoD 1 (#1-#16) and DoD 2 (#17-#24):
 * - LibraryInspector structural shape validation
 * - LibraryEvent required fields
 * - LibraryEventListener signature
 * - UnifiedSnapshot fields
 * - InspectorEvent discrimination on new library variants
 * - InspectorAPI new method signatures
 *
 * @packageDocumentation
 */

import { describe, it, expectTypeOf, assertType } from "vitest";
import type {
  LibraryInspector,
  LibraryEvent,
  LibraryEventListener,
  UnifiedSnapshot,
  ContainerSnapshot,
  InspectorEvent,
  InspectorAPI,
} from "../src/index.js";

// =============================================================================
// DoD 1: LibraryInspector Protocol Types (#1-#16)
// =============================================================================

describe("LibraryInspector structural shape", () => {
  it("#1 accepts object with name: string and getSnapshot(): Record<string, unknown>", () => {
    const inspector: LibraryInspector = {
      name: "test",
      getSnapshot: () => Object.freeze({}),
    };
    expectTypeOf(inspector).toMatchTypeOf<LibraryInspector>();
  });

  it("#2 rejects object missing name property", () => {
    // @ts-expect-error - missing name property
    const _bad: LibraryInspector = {
      getSnapshot: () => Object.freeze({}),
    };
  });

  it("#3 rejects object missing getSnapshot method", () => {
    // @ts-expect-error - missing getSnapshot method
    const _bad: LibraryInspector = {
      name: "test",
    };
  });

  it("#4 accepts object with optional subscribe method", () => {
    const inspector: LibraryInspector = {
      name: "test",
      getSnapshot: () => Object.freeze({}),
      subscribe: _listener => () => {},
    };
    expectTypeOf(inspector).toMatchTypeOf<LibraryInspector>();
  });

  it("#5 accepts object with optional dispose method", () => {
    const inspector: LibraryInspector = {
      name: "test",
      getSnapshot: () => Object.freeze({}),
      dispose: () => {},
    };
    expectTypeOf(inspector).toMatchTypeOf<LibraryInspector>();
  });

  it("#6 rejects subscribe that returns non-function", () => {
    const _bad: LibraryInspector = {
      name: "test",
      getSnapshot: () => Object.freeze({}),
      // @ts-expect-error - subscribe must return () => void, not string
      subscribe: (_listener: LibraryEventListener) => "not a function",
    };
  });
});

describe("LibraryEvent required fields", () => {
  it("#7 requires source: string", () => {
    expectTypeOf<LibraryEvent["source"]>().toBeString();
  });

  it("#8 requires type: string", () => {
    expectTypeOf<LibraryEvent["type"]>().toBeString();
  });

  it("#9 requires payload: Readonly<Record<string, unknown>>", () => {
    expectTypeOf<LibraryEvent["payload"]>().toMatchTypeOf<Readonly<Record<string, unknown>>>();
  });

  it("#10 requires timestamp: number", () => {
    expectTypeOf<LibraryEvent["timestamp"]>().toBeNumber();
  });

  it("#11 rejects object missing any of the four required fields", () => {
    // @ts-expect-error - missing source
    const _bad1: LibraryEvent = { type: "test", payload: {}, timestamp: 0 };
    // @ts-expect-error - missing type
    const _bad2: LibraryEvent = { source: "test", payload: {}, timestamp: 0 };
    // @ts-expect-error - missing payload
    const _bad3: LibraryEvent = { source: "test", type: "test", timestamp: 0 };
    // @ts-expect-error - missing timestamp
    const _bad4: LibraryEvent = { source: "test", type: "test", payload: {} };
  });
});

describe("LibraryEventListener", () => {
  it("#12 is (event: LibraryEvent) => void", () => {
    expectTypeOf<LibraryEventListener>().toMatchTypeOf<(event: LibraryEvent) => void>();
  });
});

describe("UnifiedSnapshot fields", () => {
  it("#13 has timestamp: number", () => {
    expectTypeOf<UnifiedSnapshot["timestamp"]>().toBeNumber();
  });

  it("#14 has container: ContainerSnapshot", () => {
    expectTypeOf<UnifiedSnapshot["container"]>().toMatchTypeOf<ContainerSnapshot>();
  });

  it("#15 has libraries: Readonly<Record<string, Readonly<Record<string, unknown>>>>", () => {
    expectTypeOf<UnifiedSnapshot["libraries"]>().toMatchTypeOf<
      Readonly<Record<string, Readonly<Record<string, unknown>>>>
    >();
  });

  it("#16 has registeredLibraries: readonly string[]", () => {
    expectTypeOf<UnifiedSnapshot["registeredLibraries"]>().toMatchTypeOf<readonly string[]>();
  });
});

// =============================================================================
// DoD 2: Extended InspectorEvent & InspectorAPI (#17-#24)
// =============================================================================

describe("InspectorEvent library variants", () => {
  it("#17 discriminates on type: 'library' to narrow event field to LibraryEvent", () => {
    const event = {} as InspectorEvent;
    if (event.type === "library") {
      expectTypeOf(event.event).toMatchTypeOf<LibraryEvent>();
    }
  });

  it("#18 discriminates on type: 'library-registered' to narrow name field to string", () => {
    const event = {} as InspectorEvent;
    if (event.type === "library-registered") {
      expectTypeOf(event.name).toBeString();
    }
  });

  it("#19 discriminates on type: 'library-unregistered' to narrow name field to string", () => {
    const event = {} as InspectorEvent;
    if (event.type === "library-unregistered") {
      expectTypeOf(event.name).toBeString();
    }
  });

  it("#20 exhaustive switch on InspectorEvent.type covers all variants including library variants", () => {
    function handleEvent(event: InspectorEvent): string {
      switch (event.type) {
        case "snapshot-changed":
          return "snapshot";
        case "scope-created":
          return "scope-created";
        case "scope-disposed":
          return "scope-disposed";
        case "resolution":
          return "resolution";
        case "phase-changed":
          return "phase";
        case "init-progress":
          return "init";
        case "child-created":
          return "child-created";
        case "child-disposed":
          return "child-disposed";
        case "result:ok":
          return "ok";
        case "result:err":
          return "err";
        case "result:recovered":
          return "recovered";
        case "library":
          return "library";
        case "library-registered":
          return "registered";
        case "library-unregistered":
          return "unregistered";
        case "chain-registered":
          return "chain-registered";
        case "execution-added":
          return "execution-added";
        case "guard-descriptor-registered":
          return "guard-descriptor-registered";
        case "guard-execution-added":
          return "guard-execution-added";
        case "guard-role-hierarchy-updated":
          return "guard-role-hierarchy-updated";
        default: {
          // If all variants are covered, event should be `never`
          assertType<never>(event);
          return "never";
        }
      }
    }
    expectTypeOf(handleEvent).toBeFunction();
  });
});

describe("InspectorAPI new library methods", () => {
  it("#21 registerLibrary accepts LibraryInspector and returns () => void", () => {
    expectTypeOf<InspectorAPI["registerLibrary"]>().toMatchTypeOf<
      (inspector: LibraryInspector) => () => void
    >();
  });

  it("#22 getLibraryInspectors returns ReadonlyMap<string, LibraryInspector>", () => {
    expectTypeOf<InspectorAPI["getLibraryInspectors"]>().toMatchTypeOf<
      () => ReadonlyMap<string, LibraryInspector>
    >();
  });

  it("#23 getLibraryInspector accepts string and returns LibraryInspector | undefined", () => {
    expectTypeOf<InspectorAPI["getLibraryInspector"]>().toMatchTypeOf<
      (name: string) => LibraryInspector | undefined
    >();
  });

  it("#24 getUnifiedSnapshot returns UnifiedSnapshot", () => {
    expectTypeOf<InspectorAPI["getUnifiedSnapshot"]>().toMatchTypeOf<() => UnifiedSnapshot>();
  });
});
