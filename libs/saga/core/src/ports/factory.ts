/**
 * Saga Port Factories
 *
 * Creates branded port tokens for saga execution and management.
 * Follows the same curried factory pattern as @hex-di/core's createPort.
 *
 * @packageDocumentation
 */

import { createPort } from "@hex-di/core";
import type { Port } from "@hex-di/core";
import type { SagaPort, SagaManagementPort, SagaPortConfig, SagaPersister } from "./types.js";
import type { SagaRegistry, SagaInspector } from "../introspection/types.js";

// =============================================================================
// Runtime Kind Symbol
// =============================================================================

const SAGA_PORT_KIND = Symbol.for("@hex-di/saga/SagaPortKind");

// =============================================================================
// Branding Helpers (Overload Pattern)
// =============================================================================

/**
 * Bridges the type gap between `Port<{ execute: ... }, TName>` and
 * `SagaPort<TName, TInput, TOutput, TError>`.
 *
 * The SagaPort type extends Port with phantom brand symbols that exist
 * only at the type level. This helper uses the overload pattern
 * (see packages/core/src/ports/directed.ts:99-108) to bridge the gap
 * without a cast.
 *
 * Also injects a runtime kind symbol for isSagaPort() type guard.
 */
function brandAsSagaPort<TName extends string, TInput, TOutput, TError>(
  port: Port<TName, { execute: (input: TInput) => unknown }>
): SagaPort<TName, TInput, TOutput, TError>;
function brandAsSagaPort(port: object): object {
  return Object.freeze({ ...port, [SAGA_PORT_KIND]: "execution" });
}

/**
 * Bridges the type gap between `Port<{ resume: ... }, TName>` and
 * `SagaManagementPort<TName, TOutput, TError>`.
 *
 * Also injects a runtime kind symbol for isSagaManagementPort() type guard.
 */
function brandAsSagaManagementPort<TName extends string, TOutput, TError>(
  port: Port<TName, { resume: (id: string) => unknown }>
): SagaManagementPort<TName, TOutput, TError>;
function brandAsSagaManagementPort(port: object): object {
  return Object.freeze({ ...port, [SAGA_PORT_KIND]: "management" });
}

// =============================================================================
// sagaPort Factory
// =============================================================================

/**
 * Creates a SagaPort token for domain-level saga execution.
 *
 * Uses the curried pattern: sagaPort<TInput, TOutput, TError>()({ name })
 * This preserves literal name inference from the config.
 *
 * @example
 * ```typescript
 * const OrderSagaPort = sagaPort<OrderInput, OrderOutput, OrderErrors>()({
 *   name: "OrderSaga",
 *   description: "Processes order checkout",
 * });
 * ```
 */
export function sagaPort<TInput, TOutput, TError = never>(): <const TName extends string>(
  config: SagaPortConfig<TName>
) => SagaPort<TName, TInput, TOutput, TError> {
  return <const TName extends string>(config: SagaPortConfig<TName>) => {
    return brandAsSagaPort<TName, TInput, TOutput, TError>(
      createPort<TName, { execute: (input: TInput) => unknown }>({
        name: config.name,
        description: config.description,
        category: "saga/saga",
      })
    );
  };
}

// =============================================================================
// sagaManagementPort Factory
// =============================================================================

/**
 * Creates a SagaManagementPort for operational control of saga executions.
 *
 * @example
 * ```typescript
 * const OrderSagaManagementPort = sagaManagementPort<OrderOutput, OrderErrors>()({
 *   name: "OrderSagaManagement",
 * });
 * ```
 */
export function sagaManagementPort<TOutput, TError = never>(): <const TName extends string>(
  config: SagaPortConfig<TName>
) => SagaManagementPort<TName, TOutput, TError> {
  return <const TName extends string>(config: SagaPortConfig<TName>) => {
    return brandAsSagaManagementPort<TName, TOutput, TError>(
      createPort<TName, { resume: (id: string) => unknown }>({
        name: config.name,
        description: config.description,
        category: "saga/saga-management",
      })
    );
  };
}

// =============================================================================
// SagaPersisterPort
// =============================================================================

/**
 * Pre-defined port for the saga persistence adapter.
 */
export const SagaPersisterPort = createPort<"SagaPersister", SagaPersister>({
  name: "SagaPersister",
  description: "Persistence layer for saga execution state",
  category: "saga/saga",
});

// =============================================================================
// SagaRegistryPort
// =============================================================================

/**
 * Pre-defined port for the saga registry (live execution tracking).
 */
export const SagaRegistryPort = createPort<"SagaRegistry", SagaRegistry>({
  name: "SagaRegistry",
  description: "Registry for tracking live saga executions",
  category: "saga/saga",
});

// =============================================================================
// SagaInspectorPort
// =============================================================================

/**
 * Pre-defined port for the saga inspector (introspection API).
 */
export const SagaInspectorPort = createPort<"SagaInspector", SagaInspector>({
  name: "SagaInspector",
  description: "Read-only introspection API for saga state and history",
  category: "saga/saga",
});

// =============================================================================
// Type Guards
// =============================================================================

function isNonNullObject(value: unknown): value is Record<string | symbol, unknown> {
  return typeof value === "object" && value !== null;
}

function hasPortName(value: unknown): value is { __portName: string } {
  return isNonNullObject(value) && "__portName" in value && typeof value.__portName === "string";
}

function hasSagaPortKind(value: unknown, kind: string): boolean {
  return isNonNullObject(value) && SAGA_PORT_KIND in value && value[SAGA_PORT_KIND] === kind;
}

/**
 * Runtime type guard that narrows a value to SagaPort.
 *
 * Checks both the `__portName` property (from createPort) and the
 * runtime kind symbol injected by brandAsSagaPort.
 */
export function isSagaPort(value: unknown): value is SagaPort<string, unknown, unknown, unknown> {
  return hasPortName(value) && hasSagaPortKind(value, "execution");
}

/**
 * Runtime type guard that narrows a value to SagaManagementPort.
 *
 * Checks both the `__portName` property (from createPort) and the
 * runtime kind symbol injected by brandAsSagaManagementPort.
 */
export function isSagaManagementPort(
  value: unknown
): value is SagaManagementPort<string, unknown, unknown> {
  return hasPortName(value) && hasSagaPortKind(value, "management");
}
