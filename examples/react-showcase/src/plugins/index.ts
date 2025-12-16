/**
 * Plugins module exports.
 *
 * @packageDocumentation
 */

// Plugin types and composition helpers
export type { FeatureBundle, Plugin } from "./types.js";
export { createPlugin, createFeature } from "./types.js";
export {
  withFeature,
  installPlugin,
  composeFeatures,
  composeFeaturesWithPlugins,
} from "./compose.js";

// Analytics plugin
export {
  AnalyticsPlugin,
  AnalyticsPort,
  AnalyticsAdapter,
  type AnalyticsService,
  type AnalyticsEvent,
} from "./analytics/index.js";
