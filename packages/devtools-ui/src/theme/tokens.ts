/**
 * Design token definitions for the HexDI DevTools theme system.
 *
 * All visual values are expressed as CSS custom properties.
 * Theming is achieved by swapping the variable set based on
 * the resolved theme ("light" or "dark").
 *
 * @packageDocumentation
 */

/**
 * Color token values for a specific theme.
 */
interface ColorTokens {
  readonly bgPrimary: string;
  readonly bgSecondary: string;
  readonly bgTertiary: string;
  readonly bgHover: string;
  readonly bgActive: string;
  readonly bgBadge: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly textMuted: string;
  readonly textInverse: string;
  readonly border: string;
  readonly borderStrong: string;
  readonly accent: string;
  readonly accentHover: string;
  readonly accentMuted: string;
  readonly success: string;
  readonly successMuted: string;
  readonly warning: string;
  readonly warningMuted: string;
  readonly error: string;
  readonly errorMuted: string;
  readonly info: string;
  readonly infoMuted: string;
  readonly lifetimeSingleton: string;
  readonly lifetimeScoped: string;
  readonly lifetimeTransient: string;
  readonly lifetimeScopedText: string;
  readonly lifetimeTransientText: string;
  readonly statusConnected: string;
  readonly statusStale: string;
  readonly statusDisconnected: string;
  readonly shadowTooltip: string;
  readonly shadowFocus: string;
  readonly shadowSidebar: string;
}

/**
 * Typography token values.
 */
interface TypographyTokens {
  readonly fontMono: string;
  readonly fontSans: string;
  readonly fontSizeXs: string;
  readonly fontSizeSm: string;
  readonly fontSizeMd: string;
  readonly fontSizeLg: string;
  readonly fontSizeXl: string;
  readonly fontSizeXxl: string;
  readonly fontWeightNormal: string;
  readonly fontWeightMedium: string;
  readonly fontWeightSemibold: string;
  readonly lineHeightTight: string;
  readonly lineHeightNormal: string;
}

/**
 * Spacing token values.
 */
interface SpacingTokens {
  readonly xxs: string;
  readonly xs: string;
  readonly sm: string;
  readonly md: string;
  readonly lg: string;
  readonly xl: string;
}

/**
 * Radius token values.
 */
interface RadiusTokens {
  readonly sm: string;
  readonly md: string;
  readonly lg: string;
  readonly pill: string;
}

/**
 * Transition token values.
 */
interface TransitionTokens {
  readonly fast: string;
  readonly normal: string;
  readonly slow: string;
}

/**
 * Z-index token values.
 */
interface ZIndexTokens {
  readonly tooltip: string;
  readonly overlay: string;
}

/**
 * Sidebar layout token values.
 */
interface SidebarTokens {
  readonly width: string;
  readonly min: string;
  readonly max: string;
}

/**
 * Complete design token set.
 */
export interface DesignTokens {
  readonly light: ColorTokens;
  readonly dark: ColorTokens;
  readonly typography: TypographyTokens;
  readonly spacing: SpacingTokens;
  readonly radius: RadiusTokens;
  readonly transitions: TransitionTokens;
  readonly zIndex: ZIndexTokens;
  readonly sidebar: SidebarTokens;
}

/**
 * Design tokens for the HexDI DevTools theme system.
 *
 * Color tokens include light and dark variants. Other tokens
 * (typography, spacing, radius, transitions) are shared.
 */
export const designTokens: DesignTokens = {
  light: {
    bgPrimary: "#ffffff",
    bgSecondary: "#f5f5f7",
    bgTertiary: "#ebebf0",
    bgHover: "#e8e8ec",
    bgActive: "#dcdce4",
    bgBadge: "#f0f0f5",
    textPrimary: "#1a1a2e",
    textSecondary: "#6b6b80",
    textMuted: "#9b9bb0",
    textInverse: "#ffffff",
    border: "#e0e0e8",
    borderStrong: "#c8c8d4",
    accent: "#6366f1",
    accentHover: "#5558e6",
    accentMuted: "rgba(99,102,241,0.12)",
    success: "#22c55e",
    successMuted: "rgba(34,197,94,0.12)",
    warning: "#f59e0b",
    warningMuted: "rgba(245,158,11,0.12)",
    error: "#ef4444",
    errorMuted: "rgba(239,68,68,0.12)",
    info: "#3b82f6",
    infoMuted: "rgba(59,130,246,0.12)",
    lifetimeSingleton: "#6366f1",
    lifetimeScoped: "#22c55e",
    lifetimeTransient: "#f59e0b",
    lifetimeScopedText: "#15803d",
    lifetimeTransientText: "#92400e",
    statusConnected: "#22c55e",
    statusStale: "#f59e0b",
    statusDisconnected: "#ef4444",
    shadowTooltip: "0 2px 10px rgba(0,0,0,0.12)",
    shadowFocus: "0 0 0 2px rgba(99,102,241,0.12)",
    shadowSidebar: "1px 0 4px rgba(0,0,0,0.06)",
  },
  dark: {
    bgPrimary: "#1a1a2a",
    bgSecondary: "#2a2a3e",
    bgTertiary: "#383852",
    bgHover: "#363650",
    bgActive: "#45456a",
    bgBadge: "#3a3a54",
    textPrimary: "#e4e4f0",
    textSecondary: "#9b9bb0",
    textMuted: "#6b6b80",
    textInverse: "#1a1a2e",
    border: "#424260",
    borderStrong: "#5a5a72",
    accent: "#818cf8",
    accentHover: "#9299f9",
    accentMuted: "rgba(129,140,248,0.15)",
    success: "#4ade80",
    successMuted: "rgba(74,222,128,0.15)",
    warning: "#fbbf24",
    warningMuted: "rgba(251,191,36,0.15)",
    error: "#f87171",
    errorMuted: "rgba(248,113,113,0.15)",
    info: "#60a5fa",
    infoMuted: "rgba(96,165,250,0.15)",
    lifetimeSingleton: "#818cf8",
    lifetimeScoped: "#4ade80",
    lifetimeTransient: "#fbbf24",
    lifetimeScopedText: "#bbf7d0",
    lifetimeTransientText: "#fef3c7",
    statusConnected: "#4ade80",
    statusStale: "#fbbf24",
    statusDisconnected: "#f87171",
    shadowTooltip: "0 4px 16px rgba(0,0,0,0.6)",
    shadowFocus: "0 0 0 2px rgba(129,140,248,0.15)",
    shadowSidebar: "1px 0 4px rgba(0,0,0,0.3)",
  },
  typography: {
    fontMono: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', 'Consolas', monospace",
    fontSans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSizeXs: "11px",
    fontSizeSm: "12px",
    fontSizeMd: "13px",
    fontSizeLg: "14px",
    fontSizeXl: "16px",
    fontSizeXxl: "20px",
    fontWeightNormal: "400",
    fontWeightMedium: "500",
    fontWeightSemibold: "600",
    lineHeightTight: "1.3",
    lineHeightNormal: "1.5",
  },
  spacing: {
    xxs: "2px",
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
  },
  radius: {
    sm: "4px",
    md: "6px",
    lg: "8px",
    pill: "9999px",
  },
  transitions: {
    fast: "100ms ease",
    normal: "200ms ease-out",
    slow: "300ms ease-out",
  },
  zIndex: {
    tooltip: "100",
    overlay: "200",
  },
  sidebar: {
    width: "240px",
    min: "180px",
    max: "400px",
  },
};
