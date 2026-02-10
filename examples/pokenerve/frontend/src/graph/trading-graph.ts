/**
 * Trading dependency graph for scoped trading services.
 *
 * Trading services are scoped -- one instance per trade session.
 * The TradingPort adapter gets a fresh instance within each
 * trading scope, maintaining isolated trade state.
 *
 * @packageDocumentation
 */

import { GraphBuilder } from "@hex-di/graph";
import { tradingAdapter } from "../adapters/trading/trading-adapter.js";

const tradingGraphBuilder = GraphBuilder.create().provide(tradingAdapter);

export { tradingGraphBuilder };
