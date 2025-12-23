/**
 * OpenTUI JSX intrinsic elements type declarations.
 *
 * This file provides TypeScript type definitions for OpenTUI's JSX elements
 * used in the TUI primitives. It allows the primitives.tsx file to use
 * OpenTUI elements like <box> without needing a separate tsconfig with jsxImportSource.
 *
 * Note: React 19 requires augmenting the React module's JSX namespace
 * rather than the global JSX namespace.
 *
 * IMPORTANT: We can only ADD new intrinsic elements, not override existing
 * React elements like span/text/strong. Those are handled via wrapper
 * components in opentui-elements.tsx that provide the type boundary.
 *
 * @packageDocumentation
 */

import type { ReactNode } from "react";

/**
 * OpenTUI Box element props.
 */
export interface OpenTUIBoxProps {
  key?: React.Key | null | undefined;
  children?: ReactNode;
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse" | undefined;
  justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | undefined;
  alignItems?: "flex-start" | "flex-end" | "center" | "stretch" | undefined;
  gap?: number | undefined;
  paddingLeft?: number | undefined;
  paddingRight?: number | undefined;
  paddingTop?: number | undefined;
  paddingBottom?: number | undefined;
  flexGrow?: number | undefined;
  flexShrink?: number | undefined;
  width?: number | string | undefined;
  height?: number | string | undefined;
  border?: boolean | undefined;
  borderStyle?: "single" | "double" | "rounded" | "heavy" | undefined;
  focusable?: boolean | undefined;
  title?: string | undefined;
  titleAlignment?: "left" | "center" | "right" | undefined;
  display?: "flex" | "none" | undefined;
  overflow?: "scroll" | "hidden" | "visible" | undefined;
}

// React 19 compatible JSX namespace augmentation
declare module "react" {
   
  namespace JSX {
    interface IntrinsicElements {
      // OpenTUI-specific element (doesn't conflict with React's built-in elements)
      box: OpenTUIBoxProps;
    }
  }
}
