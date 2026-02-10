/**
 * Battle scope provider.
 *
 * Wraps battle route content with HexDiAutoScopeProvider to create
 * a new DI scope when the user enters /battle and dispose it when
 * they navigate away. Battle-scoped services (BattleEngine, DamageCalc,
 * AiStrategy) get fresh instances within each battle scope.
 *
 * @packageDocumentation
 */

import type { ReactNode } from "react";
import { HexDiAutoScopeProvider } from "@hex-di/react";

interface BattleScopeProviderProps {
  readonly children: ReactNode;
}

function BattleScopeProvider({ children }: BattleScopeProviderProps): ReactNode {
  return <HexDiAutoScopeProvider name="battle">{children}</HexDiAutoScopeProvider>;
}

export { BattleScopeProvider };
export type { BattleScopeProviderProps };
