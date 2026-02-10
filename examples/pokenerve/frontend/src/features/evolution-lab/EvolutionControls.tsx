/**
 * Evolution input controls panel.
 *
 * Provides sliders, dropdowns, and toggles for modifying the evolution
 * context. Sends SET_CONTEXT events to the machine runner and an EVOLVE
 * button to attempt evolution with the current conditions.
 *
 * @packageDocumentation
 */

import { type ReactNode, useCallback } from "react";
import type { EvolutionContext } from "../../machines/evolution-context.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VisibleControls {
  readonly level: boolean;
  readonly friendship: boolean;
  readonly affection: boolean;
  readonly heldItem: boolean;
  readonly location: boolean;
  readonly timeOfDay: boolean;
  readonly trading: boolean;
  readonly rain: boolean;
  readonly upsideDown: boolean;
}

interface EvolutionControlsProps {
  readonly context: EvolutionContext;
  readonly visibleControls: VisibleControls;
  readonly isFinalState: boolean;
  readonly onContextChange: (patch: Partial<EvolutionContext>) => void;
  readonly onEvolve: () => void;
}

// ---------------------------------------------------------------------------
// Item & Location Options
// ---------------------------------------------------------------------------

interface SelectOption {
  readonly value: string;
  readonly label: string;
}

const EVOLUTION_ITEMS: readonly SelectOption[] = [
  { value: "", label: "None" },
  { value: "water-stone", label: "Water Stone" },
  { value: "thunder-stone", label: "Thunder Stone" },
  { value: "fire-stone", label: "Fire Stone" },
  { value: "moon-stone", label: "Moon Stone" },
  { value: "leaf-stone", label: "Leaf Stone" },
  { value: "sun-stone", label: "Sun Stone" },
  { value: "dusk-stone", label: "Dusk Stone" },
  { value: "shiny-stone", label: "Shiny Stone" },
  { value: "dawn-stone", label: "Dawn Stone" },
  { value: "ice-stone", label: "Ice Stone" },
];

const LOCATION_OPTIONS: readonly SelectOption[] = [
  { value: "", label: "None" },
  { value: "moss-rock", label: "Moss Rock" },
  { value: "ice-rock", label: "Ice Rock" },
  { value: "magnetic-field", label: "Magnetic Field" },
  { value: "mount-lanakila", label: "Mount Lanakila" },
];

// ---------------------------------------------------------------------------
// Slider Component
// ---------------------------------------------------------------------------

function Slider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly onChange: (val: number) => void;
}): ReactNode {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-300">{label}</label>
        <span className="text-sm font-mono text-purple-400">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-700 accent-purple-500"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Select Component
// ---------------------------------------------------------------------------

function Select({
  label,
  value,
  options,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly options: readonly SelectOption[];
  readonly onChange: (val: string) => void;
}): ReactNode {
  return (
    <div className="space-y-1">
      <label className="text-sm text-gray-300">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 focus:border-purple-500 focus:outline-none"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toggle Component
// ---------------------------------------------------------------------------

function Toggle({
  label,
  checked,
  onChange,
}: {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (val: boolean) => void;
}): ReactNode {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-gray-300">{label}</label>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          checked ? "bg-purple-500" : "bg-gray-700"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Time of Day Segmented Control
// ---------------------------------------------------------------------------

function TimeOfDayControl({
  value,
  onChange,
}: {
  readonly value: "day" | "night";
  readonly onChange: (val: "day" | "night") => void;
}): ReactNode {
  return (
    <div className="space-y-1">
      <label className="text-sm text-gray-300">Time of Day</label>
      <div className="flex rounded-lg border border-gray-700">
        <button
          type="button"
          onClick={() => onChange("day")}
          className={`flex-1 rounded-l-lg px-3 py-1.5 text-sm transition-colors ${
            value === "day"
              ? "bg-amber-500/20 text-amber-400"
              : "bg-gray-800 text-gray-500 hover:text-gray-300"
          }`}
        >
          Day
        </button>
        <button
          type="button"
          onClick={() => onChange("night")}
          className={`flex-1 rounded-r-lg px-3 py-1.5 text-sm transition-colors ${
            value === "night"
              ? "bg-indigo-500/20 text-indigo-400"
              : "bg-gray-800 text-gray-500 hover:text-gray-300"
          }`}
        >
          Night
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EvolutionControls
// ---------------------------------------------------------------------------

function EvolutionControls({
  context,
  visibleControls,
  isFinalState,
  onContextChange,
  onEvolve,
}: EvolutionControlsProps): ReactNode {
  const handleLevelChange = useCallback(
    (val: number) => onContextChange({ level: val }),
    [onContextChange]
  );

  const handleFriendshipChange = useCallback(
    (val: number) => onContextChange({ friendship: val }),
    [onContextChange]
  );

  const handleAffectionChange = useCallback(
    (val: number) => onContextChange({ affection: val }),
    [onContextChange]
  );

  const handleItemChange = useCallback(
    (val: string) => onContextChange({ heldItem: val === "" ? null : val }),
    [onContextChange]
  );

  const handleLocationChange = useCallback(
    (val: string) => onContextChange({ location: val === "" ? null : val }),
    [onContextChange]
  );

  const handleTimeChange = useCallback(
    (val: "day" | "night") => onContextChange({ timeOfDay: val }),
    [onContextChange]
  );

  const handleTradingChange = useCallback(
    (val: boolean) => onContextChange({ isTrading: val }),
    [onContextChange]
  );

  const handleRainChange = useCallback(
    (val: boolean) => onContextChange({ hasOverworldRain: val }),
    [onContextChange]
  );

  const handleUpsideDownChange = useCallback(
    (val: boolean) => onContextChange({ isTurnedUpsideDown: val }),
    [onContextChange]
  );

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Controls</h3>

      {visibleControls.level && (
        <Slider
          label="Level"
          value={context.level}
          min={1}
          max={100}
          onChange={handleLevelChange}
        />
      )}

      {visibleControls.friendship && (
        <Slider
          label="Friendship"
          value={context.friendship}
          min={0}
          max={255}
          onChange={handleFriendshipChange}
        />
      )}

      {visibleControls.affection && (
        <Slider
          label="Affection"
          value={context.affection}
          min={0}
          max={5}
          onChange={handleAffectionChange}
        />
      )}

      {visibleControls.heldItem && (
        <Select
          label="Held Item"
          value={context.heldItem ?? ""}
          options={EVOLUTION_ITEMS}
          onChange={handleItemChange}
        />
      )}

      {visibleControls.location && (
        <Select
          label="Location"
          value={context.location ?? ""}
          options={LOCATION_OPTIONS}
          onChange={handleLocationChange}
        />
      )}

      {visibleControls.timeOfDay && (
        <TimeOfDayControl value={context.timeOfDay} onChange={handleTimeChange} />
      )}

      {visibleControls.trading && (
        <Toggle label="Trading" checked={context.isTrading} onChange={handleTradingChange} />
      )}

      {visibleControls.rain && (
        <Toggle
          label="Overworld Rain"
          checked={context.hasOverworldRain}
          onChange={handleRainChange}
        />
      )}

      {visibleControls.upsideDown && (
        <Toggle
          label="Turn Upside Down"
          checked={context.isTurnedUpsideDown}
          onChange={handleUpsideDownChange}
        />
      )}

      <button
        type="button"
        onClick={onEvolve}
        disabled={isFinalState}
        className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
          isFinalState
            ? "cursor-not-allowed bg-gray-800 text-gray-600"
            : "bg-purple-600 text-white hover:bg-purple-500 active:bg-purple-700"
        }`}
      >
        {isFinalState ? "Final Form" : "Evolve!"}
      </button>
    </div>
  );
}

/**
 * Computes which controls should be visible based on the evolution chain's
 * details. Scans all evolution details across the entire chain.
 */
function computeVisibleControls(
  details: readonly {
    readonly evolution_details: readonly {
      readonly min_level: number | null;
      readonly min_happiness: number | null;
      readonly min_affection: number | null;
      readonly item: { readonly name: string } | null;
      readonly held_item: { readonly name: string } | null;
      readonly location: { readonly name: string } | null;
      readonly time_of_day: string;
      readonly trigger: { readonly name: string };
      readonly needs_overworld_rain: boolean;
      readonly turn_upside_down: boolean;
    }[];
  }[]
): VisibleControls {
  let level = false;
  let friendship = false;
  let affection = false;
  let heldItem = false;
  let location = false;
  let timeOfDay = false;
  let trading = false;
  let rain = false;
  let upsideDown = false;

  for (const link of details) {
    for (const detail of link.evolution_details) {
      if (detail.min_level !== null) level = true;
      if (detail.min_happiness !== null) friendship = true;
      if (detail.min_affection !== null) affection = true;
      if (detail.item !== null || detail.held_item !== null) heldItem = true;
      if (detail.location !== null) location = true;
      if (detail.time_of_day !== "") timeOfDay = true;
      if (detail.trigger.name === "trade") trading = true;
      if (detail.needs_overworld_rain) rain = true;
      if (detail.turn_upside_down) upsideDown = true;
    }
  }

  // Always show level as a sensible default if nothing else is visible
  if (
    !level &&
    !friendship &&
    !affection &&
    !heldItem &&
    !location &&
    !timeOfDay &&
    !trading &&
    !rain &&
    !upsideDown
  ) {
    level = true;
  }

  return { level, friendship, affection, heldItem, location, timeOfDay, trading, rain, upsideDown };
}

export { EvolutionControls, computeVisibleControls };
export type { VisibleControls, EvolutionControlsProps };
