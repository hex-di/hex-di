/**
 * SagaManagementContext
 *
 * Provides a SagaManagementExecutor to descendant hooks without
 * requiring each hook call to pass a port parameter.
 *
 * @packageDocumentation
 */

import { createContext, useContext, type ReactNode } from "react";
import { usePort } from "@hex-di/react";
import type { Port } from "@hex-di/core";
import type {
  SagaManagementPort,
  SagaManagementExecutor,
  InferSagaManagementPortOutput,
  InferSagaManagementPortError,
} from "@hex-di/saga";

// =============================================================================
// Context
// =============================================================================

export const SagaManagementContext = createContext<SagaManagementExecutor<unknown, unknown> | null>(
  null
);

// =============================================================================
// Provider
// =============================================================================

export interface SagaManagementProviderProps<
  M extends SagaManagementPort<string, unknown, unknown>,
> {
  readonly port: M;
  readonly children: ReactNode;
}

function useResolveManagementExecutor<M extends SagaManagementPort<string, unknown, unknown>>(
  port: M
): SagaManagementExecutor<InferSagaManagementPortOutput<M>, InferSagaManagementPortError<M>>;
function useResolveManagementExecutor(port: Port<unknown, string>): unknown {
  return usePort(port);
}

/**
 * Resolves a SagaManagementPort from the container and provides
 * the executor to all descendant hooks via context.
 */
export function SagaManagementProvider<M extends SagaManagementPort<string, unknown, unknown>>({
  port,
  children,
}: SagaManagementProviderProps<M>): ReactNode {
  const executor = useResolveManagementExecutor(port);

  return (
    <SagaManagementContext.Provider value={executor}>{children}</SagaManagementContext.Provider>
  );
}

// =============================================================================
// Consumer Hook
// =============================================================================

/**
 * Returns the SagaManagementExecutor from the nearest SagaManagementProvider.
 * Throws if no provider is found in the component tree.
 */
export function useSagaManagementExecutor(): SagaManagementExecutor<unknown, unknown> {
  const executor = useContext(SagaManagementContext);
  if (!executor) {
    throw new Error(
      "useSagaManagementExecutor must be used within a <SagaManagementProvider>. " +
        "Wrap your component tree with <SagaManagementProvider port={yourManagementPort}>."
    );
  }
  return executor;
}
