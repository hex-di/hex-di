/**
 * Trading scope provider.
 *
 * Wraps trading route content with HexDiAutoScopeProvider to create
 * a new DI scope when the user enters /trading and dispose it when
 * they navigate away. The trade step adapters and saga executor get
 * fresh instances within each trading scope, maintaining isolated trade state.
 *
 * @packageDocumentation
 */

import type { ReactNode } from "react";
import { HexDiAutoScopeProvider } from "@hex-di/react";

interface TradingScopeProviderProps {
  readonly children: ReactNode;
}

function TradingScopeProvider({ children }: TradingScopeProviderProps): ReactNode {
  return <HexDiAutoScopeProvider name="trading">{children}</HexDiAutoScopeProvider>;
}

export { TradingScopeProvider };
export type { TradingScopeProviderProps };
