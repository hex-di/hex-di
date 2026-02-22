/**
 * usePlaygroundState hook
 *
 * Convenience hook that returns the PlaygroundContext value.
 *
 * @packageDocumentation
 */

import { usePlaygroundContext } from "../context/playground-context.js";
import type { PlaygroundContextValue } from "../context/playground-context.js";

/**
 * Returns the top-level playground state including virtual filesystem,
 * active file, open files, and modification tracking.
 *
 * @throws {Error} If used outside a PlaygroundProvider.
 */
export function usePlaygroundState(): PlaygroundContextValue {
  return usePlaygroundContext();
}
