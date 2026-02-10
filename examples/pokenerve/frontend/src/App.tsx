/**
 * Application root with React Router setup.
 *
 * Configures BrowserRouter with all feature routes. Battle and Trading
 * routes are wrapped in their respective scope providers to create
 * isolated DI scopes for each session.
 *
 * @packageDocumentation
 */

import type { ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { BrainViewProvider } from "./context/BrainViewContext.js";
import { AppLayout } from "./layout/AppLayout.js";
import { DiscoveryPage } from "./features/discovery/DiscoveryPage.js";
import { EvolutionLabPage } from "./features/evolution-lab/EvolutionLabPage.js";
import { TypeGraphPage } from "./features/type-graph/TypeGraphPage.js";
import { BattlePage } from "./features/battle/BattlePage.js";
import { TradingPage } from "./features/trading/TradingPage.js";
import { ResearchPage } from "./features/research/ResearchPage.js";
import { BattleScopeProvider } from "./providers/battle-scope.js";
import { TradingScopeProvider } from "./providers/trading-scope.js";

function App(): ReactNode {
  return (
    <BrowserRouter>
      <BrainViewProvider>
        <Routes>
          <Route element={<AppLayout />}>
            {/* Default redirect */}
            <Route index element={<Navigate to="/discovery" replace />} />

            {/* Feature routes */}
            <Route path="discovery" element={<DiscoveryPage />} />
            <Route path="evolution" element={<EvolutionLabPage />} />
            <Route path="type-graph" element={<TypeGraphPage />} />

            {/* Scoped routes */}
            <Route
              path="battle"
              element={
                <BattleScopeProvider>
                  <BattlePage />
                </BattleScopeProvider>
              }
            />
            <Route
              path="trading"
              element={
                <TradingScopeProvider>
                  <TradingPage />
                </TradingScopeProvider>
              }
            />

            {/* Standard routes */}
            <Route path="research" element={<ResearchPage />} />
          </Route>
        </Routes>
      </BrainViewProvider>
    </BrowserRouter>
  );
}

export { App };
