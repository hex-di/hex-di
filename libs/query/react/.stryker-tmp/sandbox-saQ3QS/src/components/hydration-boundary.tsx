/**
 * HydrationBoundary Component
 *
 * Hydrates the QueryClient cache from a dehydrated state on mount.
 * Used in SSR scenarios to transfer server-side cache state to the client.
 *
 * @packageDocumentation
 */

import { useRef, type ReactNode } from "react";
import type { DehydratedState } from "@hex-di/query";
import { hydrate } from "@hex-di/query";
import { useQueryClient } from "../context/query-client-context.js";

// =============================================================================
// HydrationBoundaryProps
// =============================================================================

export interface HydrationBoundaryProps {
  readonly state: DehydratedState;
  readonly children: ReactNode;
}

// =============================================================================
// HydrationBoundary Component
// =============================================================================

/**
 * Hydrates the nearest QueryClient with dehydrated state.
 *
 * Hydration runs once on first render (before effects). Subsequent
 * renders with the same component instance skip hydration.
 */
export function HydrationBoundary({ state, children }: HydrationBoundaryProps): ReactNode {
  const client = useQueryClient();
  const hydrated = useRef(false);

  if (!hydrated.current) {
    hydrate(client, state);
    hydrated.current = true;
  }

  return children;
}
