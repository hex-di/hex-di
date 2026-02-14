/**
 * FilterPresetManager — save/load/delete filter presets.
 *
 * @packageDocumentation
 */

import { useState, useCallback } from "react";
import type { GraphFilterState, SavedFilterPreset } from "../types.js";
import { usePersistedState } from "../../../hooks/use-persisted-state.js";
import { STORAGE_KEY_PRESETS } from "../constants.js";

interface FilterPresetManagerProps {
  readonly currentFilter: GraphFilterState;
  readonly activePreset: string | undefined;
  readonly onApplyPreset: (filter: GraphFilterState) => void;
  readonly onSetActivePreset: (name: string | undefined) => void;
}

/**
 * Serialize filter state for storage (Sets -> Arrays).
 */
function serializeFilter(filter: GraphFilterState): Record<string, unknown> {
  return {
    ...filter,
    lifetimes: [...filter.lifetimes],
    origins: [...filter.origins],
    libraryKinds: [...filter.libraryKinds],
    inheritanceModes: [...filter.inheritanceModes],
  };
}

/**
 * Deserialize filter state from storage (Arrays -> Sets).
 */
function deserializeFilter(raw: Record<string, unknown>): GraphFilterState {
  return {
    searchText: typeof raw["searchText"] === "string" ? raw["searchText"] : "",
    lifetimes: new Set(Array.isArray(raw["lifetimes"]) ? raw["lifetimes"] : []),
    origins: new Set(Array.isArray(raw["origins"]) ? raw["origins"] : []),
    libraryKinds: new Set(Array.isArray(raw["libraryKinds"]) ? raw["libraryKinds"] : []),
    category: typeof raw["category"] === "string" ? raw["category"] : "",
    tags: Array.isArray(raw["tags"]) ? raw["tags"] : [],
    tagMode: raw["tagMode"] === "all" ? "all" : "any",
    direction:
      raw["direction"] === "inbound" || raw["direction"] === "outbound" ? raw["direction"] : "all",
    minErrorRate: typeof raw["minErrorRate"] === "number" ? raw["minErrorRate"] : 0,
    inheritanceModes: new Set(
      Array.isArray(raw["inheritanceModes"]) ? raw["inheritanceModes"] : []
    ),
    resolutionStatus:
      raw["resolutionStatus"] === "resolved" || raw["resolutionStatus"] === "unresolved"
        ? raw["resolutionStatus"]
        : "all",
    compoundMode: raw["compoundMode"] === "or" ? "or" : "and",
  };
}

interface StoredPreset {
  readonly name: string;
  readonly filter: Record<string, unknown>;
  readonly createdAt: number;
}

function FilterPresetManager({
  currentFilter,
  activePreset,
  onApplyPreset,
  onSetActivePreset,
}: FilterPresetManagerProps): React.ReactElement {
  const [presets, setPresets] = usePersistedState<readonly StoredPreset[]>(STORAGE_KEY_PRESETS, []);
  const [newName, setNewName] = useState("");

  const handleSave = useCallback(() => {
    if (newName.trim() === "") return;
    const preset: StoredPreset = {
      name: newName.trim(),
      filter: serializeFilter(currentFilter),
      createdAt: Date.now(),
    };
    setPresets(prev => [...prev.filter(p => p.name !== preset.name), preset]);
    onSetActivePreset(preset.name);
    setNewName("");
  }, [newName, currentFilter, setPresets, onSetActivePreset]);

  const handleLoad = useCallback(
    (preset: StoredPreset) => {
      onApplyPreset(deserializeFilter(preset.filter));
      onSetActivePreset(preset.name);
    },
    [onApplyPreset, onSetActivePreset]
  );

  const handleDelete = useCallback(
    (name: string) => {
      setPresets(prev => prev.filter(p => p.name !== name));
      if (activePreset === name) {
        onSetActivePreset(undefined);
      }
    },
    [setPresets, activePreset, onSetActivePreset]
  );

  return (
    <div
      data-testid="filter-preset-manager"
      style={{
        padding: "var(--hex-space-sm)",
        borderTop: "1px solid var(--hex-border)",
        fontFamily: "var(--hex-font-sans)",
        fontSize: "var(--hex-font-size-sm)",
      }}
    >
      <div style={{ fontWeight: "var(--hex-font-weight-medium)", marginBottom: 4 }}>Presets</div>

      {/* Save */}
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Preset name..."
          style={{
            flex: 1,
            padding: "var(--hex-space-xs)",
            border: "1px solid var(--hex-border)",
            borderRadius: "var(--hex-radius-sm)",
            backgroundColor: "var(--hex-bg-primary)",
            color: "var(--hex-text-primary)",
            fontSize: "var(--hex-font-size-sm)",
          }}
        />
        <button
          onClick={handleSave}
          disabled={newName.trim() === ""}
          style={{
            padding: "var(--hex-space-xs) var(--hex-space-sm)",
            border: "1px solid var(--hex-border)",
            borderRadius: "var(--hex-radius-sm)",
            backgroundColor: "var(--hex-bg-secondary)",
            color: "var(--hex-text-primary)",
            cursor: newName.trim() === "" ? "default" : "pointer",
            opacity: newName.trim() === "" ? 0.5 : 1,
            fontSize: "var(--hex-font-size-sm)",
          }}
        >
          Save
        </button>
      </div>

      {/* Preset list */}
      {presets.map(preset => (
        <div
          key={preset.name}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 0",
          }}
        >
          <button
            onClick={() => handleLoad(preset)}
            style={{
              flex: 1,
              textAlign: "left",
              border: "none",
              background: "none",
              color: activePreset === preset.name ? "var(--hex-accent)" : "var(--hex-text-primary)",
              cursor: "pointer",
              fontFamily: "var(--hex-font-sans)",
              fontSize: "var(--hex-font-size-sm)",
              fontWeight:
                activePreset === preset.name
                  ? ("var(--hex-font-weight-medium)" as string)
                  : "normal",
            }}
          >
            {preset.name}
          </button>
          <button
            onClick={() => handleDelete(preset.name)}
            style={{
              border: "none",
              background: "none",
              color: "var(--hex-text-muted)",
              cursor: "pointer",
              fontSize: "var(--hex-font-size-xs)",
            }}
            aria-label={`Delete preset ${preset.name}`}
          >
            {"\u2715"}
          </button>
        </div>
      ))}

      {presets.length === 0 && (
        <div style={{ color: "var(--hex-text-muted)", fontStyle: "italic" }}>No saved presets</div>
      )}
    </div>
  );
}

export { FilterPresetManager, serializeFilter, deserializeFilter };
export type { FilterPresetManagerProps };
