/**
 * Root dependency graph composing all sub-graphs.
 *
 * Merges the core, battle, trading, and tracing graphs into a single
 * root graph for the container. Singleton adapters live in the root
 * container. Scoped adapters (battle, trading) are resolved from
 * child scopes created by HexDiAutoScopeProvider.
 *
 * @packageDocumentation
 */

import { coreGraphBuilder } from "./core-graph.js";
import { battleGraphBuilder } from "./battle-graph.js";
import { tradingGraphBuilder } from "./trading-graph.js";
import { tracingGraphBuilder } from "./tracing-graph.js";
import { storeGraphBuilder } from "./store-graph.js";
import { queryGraphBuilder } from "./query-graph.js";
import { sagaGraphBuilder } from "./saga-graph.js";

// Merge all sub-graph builders into the root graph.
// The merge operation combines adapters from all builders.
const rootGraph = coreGraphBuilder
  .merge(battleGraphBuilder)
  .merge(tradingGraphBuilder)
  .merge(tracingGraphBuilder)
  .merge(storeGraphBuilder)
  .merge(queryGraphBuilder)
  .merge(sagaGraphBuilder)
  .build();

export { rootGraph };
