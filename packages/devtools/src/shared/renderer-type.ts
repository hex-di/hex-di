/**
 * Renderer type definitions for the unified DevTools architecture.
 *
 * This module defines the discriminated union type used to identify
 * which platform renderer is being used (DOM or TUI).
 *
 * @packageDocumentation
 */

// =============================================================================
// Renderer Type
// =============================================================================

/**
 * Supported renderer types for the DevTools UI.
 *
 * - `'dom'`: Browser DOM rendering using React DOM and D3/SVG
 * - `'tui'`: Terminal UI rendering using OpenTUI and ASCII art
 *
 * @remarks
 * This type is used by conditional types to provide platform-specific
 * props and behavior while maintaining type safety.
 *
 * @example Using RendererType for conditional props
 * ```typescript
 * type Props<R extends RendererType> = R extends 'dom'
 *   ? { className?: string }
 *   : { focusable?: boolean };
 * ```
 */
export type RendererType = "dom" | "tui";
