/**
 * Root container provider for the PokéNerve application.
 *
 * Wraps the entire application with the HexDI container context,
 * making all registered ports available for resolution via usePort().
 *
 * @packageDocumentation
 */

import type { ReactNode } from "react";
import { HexDiContainerProvider } from "@hex-di/react";
import type { Container } from "@hex-di/runtime";

interface PokenerveContainerProviderProps {
  readonly container: Container<never, never, never, "uninitialized">;
  readonly children: ReactNode;
}

function PokenerveContainerProvider({
  container,
  children,
}: PokenerveContainerProviderProps): ReactNode {
  return <HexDiContainerProvider container={container}>{children}</HexDiContainerProvider>;
}

export { PokenerveContainerProvider };
export type { PokenerveContainerProviderProps };
