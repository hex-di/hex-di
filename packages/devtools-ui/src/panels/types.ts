/**
 * Panel type definitions for @hex-di/devtools-ui.
 *
 * Defines the PanelProps interface that every panel component receives,
 * and the DevToolsPanel registration interface.
 *
 * @packageDocumentation
 */

import type { InspectorDataSource } from "../data/inspector-data-source.js";

/**
 * Resolved theme value passed to panels.
 */
export type ResolvedTheme = "light" | "dark";

/**
 * Props received by every panel component.
 * Panels MUST NOT import transport-specific types.
 */
export interface PanelProps {
  readonly dataSource: InspectorDataSource;
  readonly theme: ResolvedTheme;
  readonly width: number;
  readonly height: number;
}

/**
 * Registration interface for a devtools panel.
 *
 * Panels register with an order for tab positioning and provide
 * a component that receives PanelProps.
 */
export interface DevToolsPanel {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly order: number;
  readonly component: React.ComponentType<PanelProps>;
}
