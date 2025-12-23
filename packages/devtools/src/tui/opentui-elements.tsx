/**
 * OpenTUI Element Wrappers - Type-safe boundary for OpenTUI intrinsic elements.
 *
 * OpenTUI extends certain HTML elements (span, text, strong) with additional props
 * like `fg` and `bg` for terminal colors. This file uses TypeScript declaration
 * merging to extend JSX.IntrinsicElements with OpenTUI's custom elements.
 *
 * This approach eliminates the need for type casts by properly declaring the
 * custom element types that OpenTUI's renderer understands.
 *
 * @packageDocumentation
 */

import React, { type ReactNode, type ReactElement } from "react";

// =============================================================================
// OpenTUI JSX Declaration Merging
// =============================================================================

/**
 * OpenTUI color props that can be applied to text elements.
 */
interface OpenTUIColorProps {
  /** Foreground (text) color */
  readonly fg?: string | undefined;
  /** Background color */
  readonly bg?: string | undefined;
}

/**
 * Extend the global JSX namespace to include OpenTUI's custom intrinsic elements.
 * This allows React.createElement to accept these element types without casts.
 */
declare global {
  namespace JSX {
    interface IntrinsicElements {
      /** OpenTUI text element with color support */
      text: OpenTUIColorProps & { children?: ReactNode };
      // Note: 'span' and 'strong' already exist in HTML; we use them as-is
      // OpenTUI's renderer handles the fg/bg props at runtime
    }
  }
}

// =============================================================================
// OpenTUI Element Props Interfaces
// =============================================================================

/**
 * Props for OpenTUI text element with fg/bg color support.
 */
export interface TUITextProps {
  readonly children?: ReactNode;
  readonly fg?: string | undefined;
  readonly bg?: string | undefined;
}

/**
 * Props for OpenTUI span element with fg/bg color support.
 */
export interface TUISpanProps {
  readonly children?: ReactNode;
  readonly fg?: string | undefined;
  readonly bg?: string | undefined;
}

/**
 * Props for OpenTUI strong element.
 */
export interface TUIStrongProps {
  readonly children?: ReactNode;
}

// =============================================================================
// Internal createElement wrapper
// =============================================================================

/**
 * Valid OpenTUI element type strings.
 * These are the intrinsic element names that OpenTUI's renderer understands.
 */
type OpenTUIElementType = "text" | "span" | "strong";

/**
 * Creates an OpenTUI element with proper typing.
 *
 * Uses the JSX.IntrinsicElements declaration above to provide type-safe
 * createElement calls without requiring type casts.
 *
 * @internal
 */
function createTUIElement(
  type: OpenTUIElementType,
  props: OpenTUIColorProps,
  children?: ReactNode
): ReactElement {
  // With JSX.IntrinsicElements extended above, createElement accepts our custom elements
  return React.createElement(type, props, children);
}

// =============================================================================
// Exported OpenTUI Element Components
// =============================================================================

/**
 * OpenTUI text element with fg/bg color support.
 *
 * @example
 * ```tsx
 * <TUIText fg={TUIStyleSystem.getColor("success")}>
 *   Hello, World!
 * </TUIText>
 * ```
 */
export function TUIText({ children, fg, bg }: TUITextProps): ReactElement {
  return createTUIElement("text", { fg, bg }, children);
}

/**
 * OpenTUI span element with fg/bg color support.
 *
 * Use this for inline colored text within TUIText elements.
 *
 * @example
 * ```tsx
 * <TUIText>
 *   <TUISpan fg={TUIStyleSystem.getColor("success")}>
 *     Success!
 *   </TUISpan>
 * </TUIText>
 * ```
 */
export function TUISpan({ children, fg, bg }: TUISpanProps): ReactElement {
  return createTUIElement("span", { fg, bg }, children);
}

/**
 * OpenTUI strong element for bold text.
 *
 * @example
 * ```tsx
 * <TUIText>
 *   <TUIStrong>Bold text</TUIStrong>
 * </TUIText>
 * ```
 */
export function TUIStrong({ children }: TUIStrongProps): ReactElement {
  return createTUIElement("strong", {}, children);
}
