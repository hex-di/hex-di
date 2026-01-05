/**
 * FilterPresets component for quick filter presets.
 *
 * Provides preset buttons for common filtering scenarios:
 * - "Overrides Only" - filter to ownership === "overridden"
 * - "Async Services" - filter to factoryKind === "async"
 * - "Current Container" - filter to first selected container
 * - "Inherited Only" - filter to ownership === "inherited"
 *
 * @packageDocumentation
 */

import React, { type ReactElement, useCallback } from "react";

// =============================================================================
// Types
// =============================================================================

/**
 * Available filter preset identifiers.
 */
export type FilterPresetId =
  | "overrides-only"
  | "async-services"
  | "current-container"
  | "inherited-only";

export interface FilterPresetsProps {
  /** Callback when a preset is selected */
  readonly onPresetSelect: (presetId: FilterPresetId) => void;
  /** Currently active preset, or null if none */
  readonly activePreset: FilterPresetId | null;
  /** Optional: current container ID for "Current Container" preset */
  readonly currentContainerId?: string;
}

// =============================================================================
// Preset Definitions
// =============================================================================

interface PresetDefinition {
  readonly id: FilterPresetId;
  readonly label: string;
  readonly description: string;
}

const PRESETS: readonly PresetDefinition[] = [
  {
    id: "overrides-only",
    label: "Overrides Only",
    description: "Show only services that override parent adapters",
  },
  {
    id: "async-services",
    label: "Async Services",
    description: "Show only async factory services",
  },
  {
    id: "current-container",
    label: "Current Container",
    description: "Show only services from the current container",
  },
  {
    id: "inherited-only",
    label: "Inherited Only",
    description: "Show only inherited services from parent containers",
  },
] as const;

// =============================================================================
// Styles
// =============================================================================

const presetStyles = {
  container: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "6px",
    padding: "4px 0",
  },
  button: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: "4px",
    fontSize: "10px",
    fontWeight: 500,
    fontFamily: "var(--hex-devtools-font-mono, 'JetBrains Mono', monospace)",
    border: "1px solid var(--hex-devtools-border, #45475a)",
    backgroundColor: "transparent",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    cursor: "pointer",
    transition: "all 0.15s ease",
    textTransform: "uppercase" as const,
    letterSpacing: "0.3px",
  },
  buttonActive: {
    backgroundColor: "var(--hex-devtools-bg-tertiary, #313244)",
    borderColor: "var(--hex-devtools-accent, #89b4fa)",
    color: "var(--hex-devtools-accent, #89b4fa)",
  },
  buttonHover: {
    backgroundColor: "var(--hex-devtools-bg-hover, #3a3a4e)",
  },
} as const;

// =============================================================================
// Component
// =============================================================================

/**
 * Quick preset buttons for common filtering scenarios.
 *
 * Each preset applies a specific filter configuration to quickly
 * narrow down the graph view to relevant services.
 */
export function FilterPresets({ onPresetSelect, activePreset }: FilterPresetsProps): ReactElement {
  const handlePresetClick = useCallback(
    (presetId: FilterPresetId) => {
      onPresetSelect(presetId);
    },
    [onPresetSelect]
  );

  return (
    <div style={presetStyles.container} role="group" aria-label="Filter presets">
      {PRESETS.map(preset => {
        const isActive = activePreset === preset.id;

        return (
          <button
            key={preset.id}
            type="button"
            role="button"
            aria-label={preset.label}
            aria-pressed={isActive}
            data-active={isActive ? "true" : "false"}
            title={preset.description}
            onClick={() => handlePresetClick(preset.id)}
            style={{
              ...presetStyles.button,
              ...(isActive ? presetStyles.buttonActive : {}),
            }}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Gets the filter configuration for a given preset.
 *
 * @param presetId - The preset identifier
 * @param currentContainerId - Optional current container ID
 * @returns Filter configuration object
 */
export function getPresetFilterConfig(
  presetId: FilterPresetId,
  currentContainerId?: string
): {
  ownership?: ReadonlySet<"own" | "inherited" | "overridden">;
  factoryKind?: "async" | "sync";
  containerId?: string;
} {
  switch (presetId) {
    case "overrides-only":
      return { ownership: new Set(["overridden"]) };
    case "async-services":
      return { factoryKind: "async" };
    case "current-container":
      return currentContainerId !== undefined ? { containerId: currentContainerId } : {};
    case "inherited-only":
      return { ownership: new Set(["inherited"]) };
  }
}
