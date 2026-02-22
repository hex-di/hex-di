/**
 * CSS custom property generation for the HexDI DevTools theme.
 *
 * Generates CSS custom properties from design tokens and applies them
 * to elements scoped with `[data-hex-devtools]`.
 *
 * @packageDocumentation
 */

import { designTokens } from "./tokens.js";
import type { ResolvedTheme } from "../panels/types.js";

/**
 * Mapping from design token color keys to CSS custom property names.
 */
const colorPropertyMap: ReadonlyMap<string, string> = new Map([
  ["bgPrimary", "--hex-bg-primary"],
  ["bgSecondary", "--hex-bg-secondary"],
  ["bgTertiary", "--hex-bg-tertiary"],
  ["bgHover", "--hex-bg-hover"],
  ["bgActive", "--hex-bg-active"],
  ["bgBadge", "--hex-bg-badge"],
  ["textPrimary", "--hex-text-primary"],
  ["textSecondary", "--hex-text-secondary"],
  ["textMuted", "--hex-text-muted"],
  ["textInverse", "--hex-text-inverse"],
  ["border", "--hex-border"],
  ["borderStrong", "--hex-border-strong"],
  ["accent", "--hex-accent"],
  ["accentHover", "--hex-accent-hover"],
  ["accentMuted", "--hex-accent-muted"],
  ["success", "--hex-success"],
  ["successMuted", "--hex-success-muted"],
  ["warning", "--hex-warning"],
  ["warningMuted", "--hex-warning-muted"],
  ["error", "--hex-error"],
  ["errorMuted", "--hex-error-muted"],
  ["info", "--hex-info"],
  ["infoMuted", "--hex-info-muted"],
  ["lifetimeSingleton", "--hex-lifetime-singleton"],
  ["lifetimeScoped", "--hex-lifetime-scoped"],
  ["lifetimeTransient", "--hex-lifetime-transient"],
  ["statusConnected", "--hex-status-connected"],
  ["statusStale", "--hex-status-stale"],
  ["statusDisconnected", "--hex-status-disconnected"],
  ["shadowTooltip", "--hex-shadow-tooltip"],
  ["shadowFocus", "--hex-shadow-focus"],
  ["shadowSidebar", "--hex-shadow-sidebar"],
]);

/**
 * Generates CSS custom properties for a given resolved theme.
 *
 * @param theme - The resolved theme ("light" or "dark")
 * @returns A Record of CSS property names to values
 */
export function generateCssVariables(theme: ResolvedTheme): Record<string, string> {
  const colorTokens = designTokens[theme];
  const variables: Record<string, string> = {};

  // Color tokens (theme-specific)
  for (const [key, cssProperty] of colorPropertyMap) {
    const value = colorTokens[key as keyof typeof colorTokens];
    if (value !== undefined) {
      variables[cssProperty] = value;
    }
  }

  // Typography tokens (shared across themes)
  variables["--hex-font-mono"] = designTokens.typography.fontMono;
  variables["--hex-font-sans"] = designTokens.typography.fontSans;
  variables["--hex-font-size-xs"] = designTokens.typography.fontSizeXs;
  variables["--hex-font-size-sm"] = designTokens.typography.fontSizeSm;
  variables["--hex-font-size-md"] = designTokens.typography.fontSizeMd;
  variables["--hex-font-size-lg"] = designTokens.typography.fontSizeLg;
  variables["--hex-font-size-xl"] = designTokens.typography.fontSizeXl;
  variables["--hex-font-size-xxl"] = designTokens.typography.fontSizeXxl;
  variables["--hex-font-weight-normal"] = designTokens.typography.fontWeightNormal;
  variables["--hex-font-weight-medium"] = designTokens.typography.fontWeightMedium;
  variables["--hex-font-weight-semibold"] = designTokens.typography.fontWeightSemibold;
  variables["--hex-line-height-tight"] = designTokens.typography.lineHeightTight;
  variables["--hex-line-height-normal"] = designTokens.typography.lineHeightNormal;

  // Spacing tokens
  variables["--hex-space-xxs"] = designTokens.spacing.xxs;
  variables["--hex-space-xs"] = designTokens.spacing.xs;
  variables["--hex-space-sm"] = designTokens.spacing.sm;
  variables["--hex-space-md"] = designTokens.spacing.md;
  variables["--hex-space-lg"] = designTokens.spacing.lg;
  variables["--hex-space-xl"] = designTokens.spacing.xl;

  // Radius tokens
  variables["--hex-radius-sm"] = designTokens.radius.sm;
  variables["--hex-radius-md"] = designTokens.radius.md;
  variables["--hex-radius-lg"] = designTokens.radius.lg;
  variables["--hex-radius-pill"] = designTokens.radius.pill;

  // Transition tokens
  variables["--hex-transition-fast"] = designTokens.transitions.fast;
  variables["--hex-transition-normal"] = designTokens.transitions.normal;
  variables["--hex-transition-slow"] = designTokens.transitions.slow;

  // Z-index tokens
  variables["--hex-z-tooltip"] = designTokens.zIndex.tooltip;
  variables["--hex-z-overlay"] = designTokens.zIndex.overlay;

  // Sidebar tokens
  variables["--hex-sidebar-width"] = designTokens.sidebar.width;
  variables["--hex-sidebar-min"] = designTokens.sidebar.min;
  variables["--hex-sidebar-max"] = designTokens.sidebar.max;
  variables["--hex-sidebar-bg"] = "var(--hex-bg-secondary)";
  variables["--hex-sidebar-border"] = "var(--hex-border)";

  return variables;
}

/**
 * Applies CSS custom properties to an HTML element.
 *
 * @param element - The target element
 * @param theme - The resolved theme
 */
export function applyCssVariables(element: HTMLElement, theme: ResolvedTheme): void {
  const variables = generateCssVariables(theme);
  for (const [property, value] of Object.entries(variables)) {
    element.style.setProperty(property, value);
  }
}
