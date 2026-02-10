/**
 * Typed React hooks for the PokéNerve application.
 *
 * Re-exports the global hooks from @hex-di/react which work with the
 * global HexDiContainerProvider. Also creates typed hooks via
 * createTypedHooks for compile-time port validation.
 *
 * @packageDocumentation
 */

import {
  createTypedHooks,
  usePort,
  useContainer,
  useScope,
  HexDiContainerProvider,
  HexDiAutoScopeProvider,
} from "@hex-di/react";
import type { InferGraphProvides } from "@hex-di/graph";
import type { rootGraph } from "../graph/root-graph.js";

// ---------------------------------------------------------------------------
// Type extraction from root graph
// ---------------------------------------------------------------------------

type AppPorts = InferGraphProvides<typeof rootGraph>;

// ---------------------------------------------------------------------------
// Typed hooks factory for compile-time port validation
// ---------------------------------------------------------------------------

const typedHooks = createTypedHooks<AppPorts>();

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { usePort, useContainer, useScope, HexDiContainerProvider, HexDiAutoScopeProvider };

export const usePortOptional = typedHooks.usePortOptional;

export type { AppPorts };
