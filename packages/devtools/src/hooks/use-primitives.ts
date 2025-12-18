/**
 * usePrimitives hook for accessing render primitives.
 *
 * This hook provides type-safe access to platform-specific primitive
 * components (Box, Text, Button, etc.) from within shared headless
 * components.
 *
 * @packageDocumentation
 */

import { useContext } from "react";
import type { RenderPrimitives, RendererType } from "../ports/render-primitives.port.js";
import { PrimitivesContext } from "./primitives-context.js";

// =============================================================================
// Error Messages
// =============================================================================

/**
 * Error message for missing provider.
 *
 * This message is intentionally detailed to help developers understand
 * what went wrong and how to fix it.
 */
const MISSING_PROVIDER_ERROR =
  "usePrimitives must be used within a PrimitivesProvider. " +
  "Wrap your component tree with <PrimitivesProvider primitives={...}>.";

// =============================================================================
// usePrimitives Hook
// =============================================================================

/**
 * Hook that returns the render primitives from the nearest PrimitivesProvider.
 *
 * This hook provides access to all primitive components and the style system.
 * It is the primary way shared headless components access platform-specific
 * rendering capabilities.
 *
 * @returns The render primitives object containing all primitive components
 *
 * @throws {Error} If called outside a PrimitivesProvider tree.
 *   This indicates a programming error - components using usePrimitives must
 *   be descendants of a PrimitivesProvider.
 *
 * @remarks
 * - The returned primitives object is memoized (same reference across renders)
 * - Components should destructure what they need: `const { Box, Text } = usePrimitives()`
 * - The primitives are platform-specific but have identical APIs
 *
 * @example Basic usage
 * ```tsx
 * function MyComponent() {
 *   const { Box, Text, Button } = usePrimitives();
 *
 *   return (
 *     <Box flexDirection="column" gap="sm">
 *       <Text variant="heading">Hello</Text>
 *       <Button label="Click me" onClick={() => {}} />
 *     </Box>
 *   );
 * }
 * ```
 *
 * @example Using style system
 * ```tsx
 * function StyledComponent() {
 *   const { Box, Text, styleSystem } = usePrimitives();
 *   const primaryColor = styleSystem.getColor('primary');
 *
 *   return (
 *     <Box>
 *       <Text color="primary">Primary colored text</Text>
 *     </Box>
 *   );
 * }
 * ```
 *
 * @example Checking renderer type
 * ```tsx
 * function PlatformAwareComponent() {
 *   const primitives = usePrimitives();
 *
 *   if (primitives.rendererType === 'dom') {
 *     // DOM-specific behavior
 *   } else {
 *     // TUI-specific behavior
 *   }
 *
 *   return <primitives.Box>...</primitives.Box>;
 * }
 * ```
 */
export function usePrimitives(): RenderPrimitives<RendererType> {
  const primitives = useContext(PrimitivesContext);

  if (primitives === null) {
    throw new Error(MISSING_PROVIDER_ERROR);
  }

  return primitives;
}
