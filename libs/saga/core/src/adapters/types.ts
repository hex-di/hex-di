/**
 * Saga Adapter Types
 *
 * @packageDocumentation
 */

import type { SagaPort } from "../ports/types.js";
import type { AnySagaDefinition } from "../saga/types.js";

export interface SagaAdapterConfig<TRequires extends readonly unknown[] = readonly []> {
  /** The saga definition to execute */
  readonly saga: AnySagaDefinition;
  /** Required ports that the saga's steps depend on */
  readonly requires?: TRequires;
  /** Adapter lifetime (default: "scoped") */
  readonly lifetime?: "singleton" | "scoped" | "transient";
}

export interface SagaAdapter<TPort extends SagaPort<string, unknown, unknown, unknown>> {
  readonly port: TPort;
  readonly saga: AnySagaDefinition;
  readonly requires: readonly unknown[];
  readonly lifetime: "singleton" | "scoped" | "transient";
}
