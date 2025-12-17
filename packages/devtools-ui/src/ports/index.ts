/**
 * Ports - Presentation port definitions for DevTools views.
 *
 * These ports define the contracts that framework-specific adapters must
 * implement. React adapters use D3/SVG, TUI adapters use ASCII art, but
 * both implement the same port contracts.
 *
 * @packageDocumentation
 */

// =============================================================================
// Graph View Port
// =============================================================================

export type { NodeClickEvent, EdgeClickEvent, GraphViewContract, GraphView } from "./graph-view.port.js";
export { GraphViewPort } from "./graph-view.port.js";

// =============================================================================
// Timeline View Port
// =============================================================================

export type { TraceSelectEvent, TimelineViewContract, TimelineView } from "./timeline-view.port.js";
export { TimelineViewPort } from "./timeline-view.port.js";

// =============================================================================
// Stats View Port
// =============================================================================

export type { StatsViewContract, StatsView } from "./stats-view.port.js";
export { StatsViewPort } from "./stats-view.port.js";

// =============================================================================
// Inspector View Port
// =============================================================================

export type { InspectorViewContract, InspectorView } from "./inspector-view.port.js";
export { InspectorViewPort } from "./inspector-view.port.js";

// =============================================================================
// Panel View Port
// =============================================================================

export type { PanelViewContract, PanelView } from "./panel-view.port.js";
export { PanelViewPort } from "./panel-view.port.js";
