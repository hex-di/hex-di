/**
 * DI-specific render props for graph-viz integration.
 *
 * This module re-exports the render props from di-metadata.ts for convenience
 * and provides a clear separation between metadata extraction and rendering.
 *
 * @packageDocumentation
 */

// Re-export everything from di-metadata for backward compatibility
// and to provide a clear "render props" entry point
export {
  // Types
  type DINodeMetadata,

  // Metadata extraction
  extractDIMetadata,

  // Render props
  renderDINode,
  renderDITooltip,
  renderDIEdge,
} from "./di-metadata.js";
