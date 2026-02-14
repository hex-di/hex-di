import { expectTypeOf } from "vitest";
import type {
  MainToWorkerMessage,
  WorkerToMainMessage,
  SerializedValue,
  SerializedError,
  CompilationResult,
  CompilationError,
  SerializedLibraryInspectors,
  SerializedResultStatistics,
  SerializedLibraryInspector,
  ConsoleEntry,
} from "../../src/sandbox/worker-protocol.js";

// =============================================================================
// MainToWorkerMessage discriminated union
// =============================================================================

declare const msg: MainToWorkerMessage;

if (msg.type === "execute") {
  expectTypeOf(msg.code).toBeString();
}

if (msg.type === "request-snapshot") {
  expectTypeOf(msg.type).toEqualTypeOf<"request-snapshot">();
}

if (msg.type === "terminate") {
  expectTypeOf(msg.type).toEqualTypeOf<"terminate">();
}

// =============================================================================
// WorkerToMainMessage discriminated union
// =============================================================================

declare const wmsg: WorkerToMainMessage;

if (wmsg.type === "console") {
  expectTypeOf(wmsg.level).toEqualTypeOf<"log" | "warn" | "error" | "info" | "debug">();
  expectTypeOf(wmsg.args).toMatchTypeOf<readonly SerializedValue[]>();
  expectTypeOf(wmsg.timestamp).toBeNumber();
}

if (wmsg.type === "execution-complete") {
  expectTypeOf(wmsg.success).toEqualTypeOf<true>();
}

if (wmsg.type === "execution-error") {
  expectTypeOf(wmsg.error).toMatchTypeOf<SerializedError>();
}

if (wmsg.type === "inspector-data") {
  expectTypeOf(wmsg.libraryInspectors).toMatchTypeOf<SerializedLibraryInspectors>();
  expectTypeOf(wmsg.resultStatistics).toMatchTypeOf<SerializedResultStatistics>();
}

if (wmsg.type === "response-snapshot") {
  expectTypeOf(wmsg.data).toMatchTypeOf<unknown>();
}

// =============================================================================
// SerializedValue
// =============================================================================

declare const sv: SerializedValue;
expectTypeOf(sv.type).toEqualTypeOf<
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "undefined"
  | "object"
  | "array"
  | "error"
  | "function"
  | "symbol"
>();
expectTypeOf(sv.value).toBeString();

// =============================================================================
// SerializedError
// =============================================================================

declare const se: SerializedError;
expectTypeOf(se.name).toBeString();
expectTypeOf(se.message).toBeString();
expectTypeOf(se.stack).toEqualTypeOf<string | undefined>();

// =============================================================================
// CompilationResult
// =============================================================================

declare const cr: CompilationResult;
expectTypeOf(cr.success).toBeBoolean();
expectTypeOf(cr.errors).toMatchTypeOf<readonly CompilationError[]>();
expectTypeOf(cr.code).toEqualTypeOf<string | undefined>();

// =============================================================================
// CompilationError
// =============================================================================

declare const ce: CompilationError;
expectTypeOf(ce.file).toBeString();
expectTypeOf(ce.line).toBeNumber();
expectTypeOf(ce.column).toBeNumber();
expectTypeOf(ce.message).toBeString();

// =============================================================================
// Serialized types
// =============================================================================

declare const sli: SerializedLibraryInspector;
expectTypeOf(sli.name).toBeString();
expectTypeOf(sli.snapshot).toMatchTypeOf<Readonly<Record<string, unknown>>>();

// =============================================================================
// ConsoleEntry discriminated union
// =============================================================================

declare const entry: ConsoleEntry;

if (entry.type === "log") {
  expectTypeOf(entry.level).toEqualTypeOf<"log" | "warn" | "error" | "info" | "debug">();
  expectTypeOf(entry.args).toMatchTypeOf<readonly SerializedValue[]>();
}

if (entry.type === "compilation-error") {
  expectTypeOf(entry.errors).toMatchTypeOf<readonly CompilationError[]>();
}

if (entry.type === "runtime-error") {
  expectTypeOf(entry.error).toMatchTypeOf<SerializedError>();
}

if (entry.type === "timeout") {
  expectTypeOf(entry.timeoutMs).toBeNumber();
}

if (entry.type === "status") {
  expectTypeOf(entry.message).toBeString();
  expectTypeOf(entry.variant).toEqualTypeOf<"info" | "success" | "error">();
}
