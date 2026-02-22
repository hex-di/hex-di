/**
 * Logger inspector event types.
 *
 * Defines the discriminated union of events emitted by the LoggerInspector
 * for real-time monitoring of the logging system.
 *
 * @packageDocumentation
 */

import type { LogLevel } from "../types/index.js";
import type { HandlerInfo } from "./snapshot.js";

/**
 * Events emitted by the logger inspector.
 *
 * Discriminated union on the `type` field.
 */
export type LoggerInspectorEvent =
  | {
      readonly type: "entry-logged";
      readonly level: LogLevel;
      readonly message: string;
      readonly timestamp: number;
    }
  | {
      readonly type: "error-rate-threshold";
      readonly errorRate: number;
      readonly threshold: number;
      readonly windowMs: number;
    }
  | { readonly type: "handler-error"; readonly handlerName: string; readonly error: Error }
  | { readonly type: "sampling-dropped"; readonly level: LogLevel; readonly dropCount: number }
  | { readonly type: "redaction-applied"; readonly fieldPath: string; readonly count: number }
  | { readonly type: "handler-added"; readonly handler: HandlerInfo }
  | { readonly type: "handler-removed"; readonly handlerName: string }
  | { readonly type: "snapshot-changed" }
  | {
      readonly type: "entries-dropped";
      readonly count: number;
      readonly reason: "rate-limit" | "console-unavailable" | "handler-error";
    }
  | {
      readonly type: "tracing-context-missing";
      readonly field: "correlationId" | "traceId" | "spanId";
    }
  | { readonly type: "validation-warning"; readonly field: string; readonly reason: string };
