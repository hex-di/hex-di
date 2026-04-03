/**
 * ResultPanel -- top-level PanelProps-compatible shell for the Result Panel.
 *
 * Bridges the InspectorDataSource interface to the Result Panel views.
 * Uses getAllResultStatistics() for Level 0 data (overview dashboard).
 * The Railway view uses real TracedResult data (Level 1) when available,
 * falling back to synthesized chain data from stats.
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { PanelProps } from "./types.js";
import { EmptyState } from "../components/empty-state.js";
import { useResultChainData } from "../hooks/use-result-chain-data.js";
import { buildOverviewFromChains } from "./result-data-adapter.js";
import type { ResultViewId } from "./result/views/types.js";
import { VIEWS } from "./result/views/constants.js";
import { OverviewContent } from "./result/views/OverviewContent.js";
import { RailwayContent } from "./result/views/RailwayContent.js";
import { ViewPlaceholder } from "./result/views/ViewPlaceholder.js";
import { LogContent } from "./result/views/LogContent.js";
import { CasesContent } from "./result/views/CasesContent.js";
import { SankeyContent } from "./result/views/SankeyContent.js";
import { WaterfallContent } from "./result/views/WaterfallContent.js";
import { CombinatorContent } from "./result/views/CombinatorContent.js";
import type { ResultChainDescriptor, ResultChainExecution } from "./result/types.js";

function ResultViewContent({
  activeView,
  stats,
  chainOverview,
  chains,
  getExecutions,
  isRealData,
  mergedChain,
  mergedExecution,
}: {
  readonly activeView: ResultViewId;
  readonly stats: ReadonlyMap<string, unknown> | undefined;
  readonly chainOverview: ReturnType<typeof buildOverviewFromChains> | undefined;
  readonly chains: ReadonlyMap<string, ResultChainDescriptor>;
  readonly getExecutions: (chainId: string) => readonly ResultChainExecution[];
  readonly isRealData: boolean;
  readonly mergedChain: ResultChainDescriptor | undefined;
  readonly mergedExecution: ResultChainExecution | undefined;
}): React.ReactElement {
  switch (activeView) {
    case "overview":
      return <OverviewContent stats={stats ?? new Map()} chainOverview={chainOverview} />;
    case "railway":
      return (
        <RailwayContent chains={chains} getExecutions={getExecutions} isRealData={isRealData} />
      );
    case "log":
      return <LogContent mergedChain={mergedChain} mergedExecution={mergedExecution} />;
    case "cases":
      return <CasesContent chains={chains} getExecutions={getExecutions} />;
    case "sankey":
      return <SankeyContent chains={chains} getExecutions={getExecutions} />;
    case "waterfall":
      return <WaterfallContent chains={chains} getExecutions={getExecutions} />;
    case "combinator":
      return <CombinatorContent chains={chains} getExecutions={getExecutions} />;
    default:
      return <ViewPlaceholder viewId={activeView} />;
  }
}

/**
 * ResultPanel displays Result<T, E> statistics and chain visualizations.
 *
 * Implements PanelProps so it can be registered in getBuiltInPanels().
 */
function ResultPanel({ dataSource }: PanelProps): React.ReactElement {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = dataSource.subscribe(event => {
      if (
        event.type === "snapshot-changed" ||
        event.type === "chain-registered" ||
        event.type === "execution-added"
      ) {
        setVersion(v => v + 1);
      }
    });
    return unsubscribe;
  }, [dataSource]);

  void version;
  const stats = dataSource.getAllResultStatistics();

  const { mergedChain, mergedExecution, chains, getExecutions, isRealData } =
    useResultChainData(dataSource);

  const hasRealChains = chains.size > 0 && isRealData;

  const chainOverview = hasRealChains ? buildOverviewFromChains(chains, getExecutions) : undefined;

  const [activeView, setActiveView] = useState<ResultViewId>("overview");
  const userSwitchedRef = useRef(false);

  const handleViewSwitch = useCallback((viewId: ResultViewId) => {
    userSwitchedRef.current = true;
    setActiveView(viewId);
  }, []);

  if (stats === undefined && !hasRealChains) {
    return (
      <div
        data-testid="result-panel-shell"
        role="region"
        aria-label="Result Panel"
        style={{
          padding: "var(--hex-space-xl)",
          overflow: "auto",
          height: "100%",
        }}
      >
        <div
          role="tablist"
          aria-label="Result Panel views"
          style={{
            display: "flex",
            gap: "var(--hex-space-xs)",
            marginBottom: "var(--hex-space-lg)",
            borderBottom: "1px solid var(--hex-border)",
            paddingBottom: "var(--hex-space-sm)",
          }}
        >
          {VIEWS.map(v => (
            <button
              key={v.id}
              role="tab"
              aria-selected={v.id === activeView}
              onClick={() => handleViewSwitch(v.id)}
              style={{
                padding: "var(--hex-space-xs) var(--hex-space-md)",
                border: "none",
                borderBottom:
                  v.id === activeView ? "2px solid var(--hex-accent)" : "2px solid transparent",
                backgroundColor: "transparent",
                color: v.id === activeView ? "var(--hex-text-primary)" : "var(--hex-text-muted)",
                fontWeight: v.id === activeView ? 600 : 400,
                fontSize: "var(--hex-font-size-sm)",
                fontFamily: "var(--hex-font-sans)",
                cursor: "pointer",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>

        <EmptyState
          icon={"\uD83D\uDD0D"}
          message="No Result data"
          description="Run your code to see Result<T, E> statistics and chain visualizations."
        />
      </div>
    );
  }

  return (
    <div
      data-testid="result-panel-shell"
      role="region"
      aria-label="Result Panel"
      style={{
        overflow: "hidden",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        role="tablist"
        aria-label="Result Panel views"
        style={{
          display: "flex",
          gap: "var(--hex-space-xs)",
          padding: "var(--hex-space-sm) var(--hex-space-xl)",
          borderBottom: "1px solid var(--hex-border)",
          flexShrink: 0,
        }}
      >
        {VIEWS.map(v => (
          <button
            key={v.id}
            role="tab"
            aria-selected={v.id === activeView}
            onClick={() => handleViewSwitch(v.id)}
            style={{
              padding: "var(--hex-space-xs) var(--hex-space-md)",
              border: "none",
              borderBottom:
                v.id === activeView ? "2px solid var(--hex-accent)" : "2px solid transparent",
              backgroundColor: "transparent",
              color: v.id === activeView ? "var(--hex-text-primary)" : "var(--hex-text-muted)",
              fontWeight: v.id === activeView ? 600 : 400,
              fontSize: "var(--hex-font-size-sm)",
              fontFamily: "var(--hex-font-sans)",
              cursor: "pointer",
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div
        style={{
          flex: 1,
          overflow: activeView === "railway" || activeView === "log" ? "hidden" : "auto",
          padding: activeView === "railway" || activeView === "log" ? 0 : "var(--hex-space-xl)",
        }}
      >
        <ResultViewContent
          activeView={activeView}
          stats={stats}
          chainOverview={chainOverview}
          chains={chains}
          getExecutions={getExecutions}
          isRealData={isRealData}
          mergedChain={mergedChain}
          mergedExecution={mergedExecution}
        />
      </div>
    </div>
  );
}

export { ResultPanel };
