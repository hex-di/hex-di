/**
 * Tests for FilterPresetManager and serialization helpers.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import {
  FilterPresetManager,
  serializeFilter,
  deserializeFilter,
} from "../../../src/panels/graph/components/filter-preset-manager.js";
import type { GraphFilterState } from "../../../src/panels/graph/types.js";
import { DEFAULT_FILTER_STATE } from "../../../src/panels/graph/constants.js";

afterEach(() => {
  cleanup();
});

describe("serializeFilter", () => {
  it("converts Sets to Arrays", () => {
    const filter: GraphFilterState = {
      ...DEFAULT_FILTER_STATE,
      lifetimes: new Set(["singleton", "scoped"]),
      origins: new Set(["own"]),
    };
    const serialized = serializeFilter(filter);
    expect(Array.isArray(serialized["lifetimes"])).toBe(true);
    expect(Array.isArray(serialized["origins"])).toBe(true);
  });

  it("preserves scalar values", () => {
    const filter: GraphFilterState = {
      ...DEFAULT_FILTER_STATE,
      searchText: "test",
      category: "domain",
      minErrorRate: 0.1,
    };
    const serialized = serializeFilter(filter);
    expect(serialized["searchText"]).toBe("test");
    expect(serialized["category"]).toBe("domain");
    expect(serialized["minErrorRate"]).toBe(0.1);
  });
});

describe("deserializeFilter", () => {
  it("converts Arrays back to Sets", () => {
    const raw = {
      lifetimes: ["singleton"],
      origins: ["own", "inherited"],
      libraryKinds: ["store-state"],
      inheritanceModes: ["shared"],
      searchText: "",
      category: "",
      tags: [],
      tagMode: "any",
      direction: "all",
      minErrorRate: 0,
      resolutionStatus: "all",
      compoundMode: "and",
    };
    const deserialized = deserializeFilter(raw);
    expect(deserialized.lifetimes).toBeInstanceOf(Set);
    expect(deserialized.lifetimes.has("singleton")).toBe(true);
    expect(deserialized.origins.has("own")).toBe(true);
    expect(deserialized.origins.has("inherited")).toBe(true);
  });

  it("handles missing fields with defaults", () => {
    const deserialized = deserializeFilter({});
    expect(deserialized.searchText).toBe("");
    expect(deserialized.lifetimes.size).toBe(0);
    expect(deserialized.direction).toBe("all");
    expect(deserialized.compoundMode).toBe("and");
  });

  it("roundtrips with serializeFilter", () => {
    const original: GraphFilterState = {
      ...DEFAULT_FILTER_STATE,
      searchText: "foo",
      lifetimes: new Set(["singleton"]),
      direction: "inbound",
      minErrorRate: 0.05,
    };
    const roundtripped = deserializeFilter(serializeFilter(original));
    expect(roundtripped.searchText).toBe("foo");
    expect(roundtripped.lifetimes.has("singleton")).toBe(true);
    expect(roundtripped.direction).toBe("inbound");
    expect(roundtripped.minErrorRate).toBe(0.05);
  });
});

describe("FilterPresetManager", () => {
  it("renders with test id", () => {
    render(
      <FilterPresetManager
        currentFilter={DEFAULT_FILTER_STATE}
        activePreset={undefined}
        onApplyPreset={vi.fn()}
        onSetActivePreset={vi.fn()}
      />
    );
    expect(screen.getByTestId("filter-preset-manager")).toBeDefined();
  });

  it("shows 'No saved presets' initially", () => {
    render(
      <FilterPresetManager
        currentFilter={DEFAULT_FILTER_STATE}
        activePreset={undefined}
        onApplyPreset={vi.fn()}
        onSetActivePreset={vi.fn()}
      />
    );
    expect(screen.getByText("No saved presets")).toBeDefined();
  });

  it("has save button disabled when name is empty", () => {
    render(
      <FilterPresetManager
        currentFilter={DEFAULT_FILTER_STATE}
        activePreset={undefined}
        onApplyPreset={vi.fn()}
        onSetActivePreset={vi.fn()}
      />
    );
    const saveBtn = screen.getByText("Save");
    expect(saveBtn.getAttribute("disabled")).not.toBeNull();
  });
});
