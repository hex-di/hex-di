/**
 * useSandbox hook
 *
 * Convenience hook that returns the SandboxContext value.
 *
 * @packageDocumentation
 */

import { useSandboxContext } from "../context/sandbox-context.js";
import type { SandboxContextValue } from "../context/sandbox-context.js";

/**
 * Returns sandbox lifecycle state including status, run function,
 * console entries, and the inspector bridge.
 *
 * @throws {Error} If used outside a SandboxProvider.
 */
export function useSandbox(): SandboxContextValue {
  return useSandboxContext();
}
