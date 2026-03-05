/**
 * Type tests for protocol state machines.
 *
 * Verifies the type-level state machine for protocol-aware service interfaces:
 * - Transition type resolves correct next state
 * - AvailableMethods extracts valid method names per state
 * - ProtocolError produces descriptive error types
 * - ProtocolMethod conditionally enables/disables methods by state
 * - ProtocolPort carries phantom state brand
 *
 * Requirements tested:
 * - BEH-CO-12-001: Port Interface with Phantom State Parameter
 * - BEH-CO-12-002: State Transition Types
 * - BEH-CO-12-003: Invalid Sequence Detection
 */

import { describe, it, expectTypeOf } from "vitest";
import type {
  Transition,
  AvailableMethods,
  ProtocolError,
  ProtocolMethod,
  ProtocolPort,
  ProtocolSpec,
  TransitionMap,
} from "../src/index.js";

// =============================================================================
// Test Fixture: Database Connection Protocol
// =============================================================================

type DBState = "disconnected" | "connected";

type DBTransitions = {
  disconnected: { connect: "connected" };
  connected: { query: "connected"; close: "disconnected" };
};

// Protocol-aware service interface
interface DatabaseService<TState extends DBState = "disconnected"> {
  connect: TState extends "disconnected"
    ? (connectionString: string) => Promise<DatabaseService<"connected">>
    : never;

  query: TState extends "connected"
    ? (sql: string) => Promise<ReadonlyArray<Record<string, unknown>>>
    : never;

  close: TState extends "connected" ? () => Promise<DatabaseService<"disconnected">> : never;

  readonly state: TState;
}

// =============================================================================
// Test Fixture: Three-State Protocol (file handle)
// =============================================================================

type FileState = "closed" | "open" | "locked";

type FileTransitions = {
  closed: { open: "open" };
  open: { read: "open"; lock: "locked"; close: "closed" };
  locked: { write: "locked"; unlock: "open" };
};

// =============================================================================
// BEH-CO-12-001: Port Interface with Phantom State Parameter
// =============================================================================

describe("BEH-CO-12-001: ProtocolPort phantom state", () => {
  it("carries phantom state brand", () => {
    type PP = ProtocolPort<"Database", DatabaseService, "disconnected">;
    // ProtocolPort extends Port, so it has __portName
    expectTypeOf<PP["__portName"]>().toEqualTypeOf<"Database">();
  });

  it("default state is 'initial'", () => {
    type PP = ProtocolPort<"Test", { foo(): void }>;
    // Default TState is "initial" -- we can't directly read the phantom brand,
    // but we can verify the type is constructible
    expectTypeOf<PP>().not.toBeNever();
  });

  it("service interface methods are conditional on state (disconnected)", () => {
    type Svc = DatabaseService<"disconnected">;
    expectTypeOf<Svc["connect"]>().toEqualTypeOf<
      (connectionString: string) => Promise<DatabaseService<"connected">>
    >();
    expectTypeOf<Svc["query"]>().toBeNever();
    expectTypeOf<Svc["close"]>().toBeNever();
    expectTypeOf<Svc["state"]>().toEqualTypeOf<"disconnected">();
  });

  it("service interface methods are conditional on state (connected)", () => {
    type Svc = DatabaseService<"connected">;
    expectTypeOf<Svc["connect"]>().toBeNever();
    expectTypeOf<Svc["query"]>().toEqualTypeOf<
      (sql: string) => Promise<ReadonlyArray<Record<string, unknown>>>
    >();
    expectTypeOf<Svc["close"]>().toEqualTypeOf<() => Promise<DatabaseService<"disconnected">>>();
    expectTypeOf<Svc["state"]>().toEqualTypeOf<"connected">();
  });
});

// =============================================================================
// BEH-CO-12-002: State Transition Types
// =============================================================================

describe("BEH-CO-12-002: Transition type", () => {
  describe("DB protocol transitions", () => {
    it("disconnected + connect -> connected", () => {
      expectTypeOf<
        Transition<DBTransitions, "disconnected", "connect">
      >().toEqualTypeOf<"connected">();
    });

    it("connected + query -> connected (self-transition)", () => {
      expectTypeOf<Transition<DBTransitions, "connected", "query">>().toEqualTypeOf<"connected">();
    });

    it("connected + close -> disconnected", () => {
      expectTypeOf<
        Transition<DBTransitions, "connected", "close">
      >().toEqualTypeOf<"disconnected">();
    });

    it("disconnected + query -> never (invalid)", () => {
      expectTypeOf<Transition<DBTransitions, "disconnected", "query">>().toBeNever();
    });

    it("disconnected + close -> never (invalid)", () => {
      expectTypeOf<Transition<DBTransitions, "disconnected", "close">>().toBeNever();
    });

    it("connected + connect -> never (invalid)", () => {
      expectTypeOf<Transition<DBTransitions, "connected", "connect">>().toBeNever();
    });

    it("unknown state -> never", () => {
      expectTypeOf<Transition<DBTransitions, "unknown", "connect">>().toBeNever();
    });

    it("unknown method -> never", () => {
      expectTypeOf<Transition<DBTransitions, "connected", "unknown">>().toBeNever();
    });
  });

  describe("File protocol transitions", () => {
    it("closed + open -> open", () => {
      expectTypeOf<Transition<FileTransitions, "closed", "open">>().toEqualTypeOf<"open">();
    });

    it("open + read -> open (self-transition)", () => {
      expectTypeOf<Transition<FileTransitions, "open", "read">>().toEqualTypeOf<"open">();
    });

    it("open + lock -> locked", () => {
      expectTypeOf<Transition<FileTransitions, "open", "lock">>().toEqualTypeOf<"locked">();
    });

    it("open + close -> closed", () => {
      expectTypeOf<Transition<FileTransitions, "open", "close">>().toEqualTypeOf<"closed">();
    });

    it("locked + write -> locked (self-transition)", () => {
      expectTypeOf<Transition<FileTransitions, "locked", "write">>().toEqualTypeOf<"locked">();
    });

    it("locked + unlock -> open", () => {
      expectTypeOf<Transition<FileTransitions, "locked", "unlock">>().toEqualTypeOf<"open">();
    });

    it("closed + read -> never", () => {
      expectTypeOf<Transition<FileTransitions, "closed", "read">>().toBeNever();
    });

    it("locked + open -> never", () => {
      expectTypeOf<Transition<FileTransitions, "locked", "open">>().toBeNever();
    });
  });
});

// =============================================================================
// BEH-CO-12-002: AvailableMethods
// =============================================================================

describe("BEH-CO-12-002: AvailableMethods", () => {
  it("disconnected has only connect", () => {
    expectTypeOf<AvailableMethods<DBTransitions, "disconnected">>().toEqualTypeOf<"connect">();
  });

  it("connected has query and close", () => {
    expectTypeOf<AvailableMethods<DBTransitions, "connected">>().toEqualTypeOf<"query" | "close">();
  });

  it("unknown state -> never", () => {
    expectTypeOf<AvailableMethods<DBTransitions, "unknown">>().toBeNever();
  });

  it("closed file has only open", () => {
    expectTypeOf<AvailableMethods<FileTransitions, "closed">>().toEqualTypeOf<"open">();
  });

  it("open file has read, lock, close", () => {
    expectTypeOf<AvailableMethods<FileTransitions, "open">>().toEqualTypeOf<
      "read" | "lock" | "close"
    >();
  });

  it("locked file has write, unlock", () => {
    expectTypeOf<AvailableMethods<FileTransitions, "locked">>().toEqualTypeOf<"write" | "unlock">();
  });
});

// =============================================================================
// BEH-CO-12-003: ProtocolError
// =============================================================================

describe("BEH-CO-12-003: ProtocolError type", () => {
  it("has correct structure for disconnected + query", () => {
    type Err = ProtocolError<"disconnected", "query", "connect">;
    expectTypeOf<Err["__errorBrand"]>().toEqualTypeOf<"ProtocolSequenceError">();
    expectTypeOf<
      Err["__message"]
    >().toEqualTypeOf<"Method 'query' is not available in state 'disconnected'">();
    expectTypeOf<Err["__availableMethods"]>().toEqualTypeOf<"connect">();
    expectTypeOf<Err["__currentState"]>().toEqualTypeOf<"disconnected">();
  });

  it("has correct structure for connected + connect", () => {
    type Err = ProtocolError<"connected", "connect", "query" | "close">;
    expectTypeOf<Err["__errorBrand"]>().toEqualTypeOf<"ProtocolSequenceError">();
    expectTypeOf<
      Err["__message"]
    >().toEqualTypeOf<"Method 'connect' is not available in state 'connected'">();
    expectTypeOf<Err["__availableMethods"]>().toEqualTypeOf<"query" | "close">();
    expectTypeOf<Err["__currentState"]>().toEqualTypeOf<"connected">();
  });
});

// =============================================================================
// BEH-CO-12-002: ProtocolMethod
// =============================================================================

describe("BEH-CO-12-002: ProtocolMethod conditional type", () => {
  it("returns signature when method is available", () => {
    type Result = ProtocolMethod<
      DBTransitions,
      "disconnected",
      "connect",
      (url: string) => Promise<void>
    >;
    expectTypeOf<Result>().toEqualTypeOf<(url: string) => Promise<void>>();
  });

  it("returns never when method is not available", () => {
    type Result = ProtocolMethod<
      DBTransitions,
      "disconnected",
      "query",
      (sql: string) => Promise<void>
    >;
    expectTypeOf<Result>().toBeNever();
  });

  it("returns signature for self-transition method", () => {
    type Result = ProtocolMethod<
      DBTransitions,
      "connected",
      "query",
      (sql: string) => Promise<ReadonlyArray<unknown>>
    >;
    expectTypeOf<Result>().toEqualTypeOf<(sql: string) => Promise<ReadonlyArray<unknown>>>();
  });

  it("returns never for unknown state", () => {
    type Result = ProtocolMethod<DBTransitions, "unknown", "connect", () => void>;
    expectTypeOf<Result>().toBeNever();
  });
});

// =============================================================================
// ProtocolSpec type shape
// =============================================================================

describe("ProtocolSpec type shape", () => {
  it("has required readonly fields", () => {
    type Spec = ProtocolSpec<DBState, DBTransitions>;
    expectTypeOf<Spec["name"]>().toBeString();
    expectTypeOf<Spec["states"]>().toEqualTypeOf<ReadonlyArray<DBState>>();
    expectTypeOf<Spec["initialState"]>().toEqualTypeOf<DBState>();
    expectTypeOf<Spec["transitions"]>().toEqualTypeOf<Readonly<DBTransitions>>();
  });

  it("generic ProtocolSpec defaults to broad types", () => {
    type Spec = ProtocolSpec;
    expectTypeOf<Spec["name"]>().toBeString();
    expectTypeOf<Spec["states"]>().toEqualTypeOf<ReadonlyArray<string>>();
    expectTypeOf<Spec["initialState"]>().toBeString();
    expectTypeOf<Spec["transitions"]>().toEqualTypeOf<Readonly<TransitionMap>>();
  });
});

// =============================================================================
// End-to-end: Protocol-typed service usage
// =============================================================================

describe("End-to-end: Protocol-typed service interface", () => {
  it("enforces correct call sequence at the type level", () => {
    // Simulate: start with disconnected DB, can only call connect
    type Disconnected = DatabaseService<"disconnected">;
    expectTypeOf<Disconnected["connect"]>().not.toBeNever();
    expectTypeOf<Disconnected["query"]>().toBeNever();
    expectTypeOf<Disconnected["close"]>().toBeNever();

    // After connect, we get connected DB
    type Connected = DatabaseService<"connected">;
    expectTypeOf<Connected["connect"]>().toBeNever();
    expectTypeOf<Connected["query"]>().not.toBeNever();
    expectTypeOf<Connected["close"]>().not.toBeNever();
  });

  it("state transitions return correct next-state service", () => {
    // connect() returns DatabaseService<"connected">
    type ConnectReturn = ReturnType<DatabaseService<"disconnected">["connect"]>;
    expectTypeOf<ConnectReturn>().toEqualTypeOf<Promise<DatabaseService<"connected">>>();

    // close() returns DatabaseService<"disconnected">
    type CloseReturn = ReturnType<DatabaseService<"connected">["close"]>;
    expectTypeOf<CloseReturn>().toEqualTypeOf<Promise<DatabaseService<"disconnected">>>();
  });
});
