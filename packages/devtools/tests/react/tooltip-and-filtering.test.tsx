/**
 * Tests for enhanced tooltip and filtering functionality.
 *
 * These tests verify:
 * - Tooltip shows ownership state with appropriate label and color
 * - Tooltip shows container list with per-container ownership
 * - Filter chips filter by lifetime/container/ownership
 * - Quick presets ("Overrides Only", "Async Services", etc.)
 * - Port name search with fuzzy matching
 *
 * @packageDocumentation
 */

import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import React from "react";
import { GraphTooltip } from "../../src/react/graph-visualization/graph-tooltip.js";
import type { PositionedNode } from "../../src/react/graph-visualization/types.js";
import { FilterChip, FilterChipGroup } from "../../src/react/components/filter-chips.js";
import { FilterPresets } from "../../src/react/components/filter-presets.js";
import { useGraphFilters } from "../../src/react/hooks/use-graph-filters.js";
import { renderHook } from "@testing-library/react";

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Creates a mock PositionedNode for testing.
 */
function createMockNode(overrides: Partial<PositionedNode> = {}): PositionedNode {
  return {
    id: "TestPort",
    label: "TestPort",
    lifetime: "singleton",
    factoryKind: "sync",
    x: 100,
    y: 100,
    width: 120,
    height: 50,
    ...overrides,
  };
}

// =============================================================================
// Task 6.1: Test Suite for Tooltip and Filtering (5-6 focused tests)
// =============================================================================

describe("Enhanced Tooltip & Filtering", () => {
  afterEach(() => {
    cleanup();
  });

  // ---------------------------------------------------------------------------
  // Test 1: Tooltip shows ownership state with appropriate label and color
  // ---------------------------------------------------------------------------
  describe("tooltip ownership display", () => {
    it("shows ownership state with appropriate label and color", () => {
      // Test "own" ownership - green color
      const ownNode = createMockNode({
        ownership: "own",
      });

      const { rerender } = render(
        <GraphTooltip node={ownNode} x={100} y={100} dependencyCount={2} dependentCount={1} />
      );

      // Should have an ownership row with "Own" label
      expect(screen.getByText("Ownership")).toBeDefined();
      expect(screen.getByText("Own")).toBeDefined();

      // Test "inherited" ownership - gray color
      const inheritedNode = createMockNode({
        ownership: "inherited",
        inheritanceMode: "shared",
      });

      rerender(
        <GraphTooltip node={inheritedNode} x={100} y={100} dependencyCount={2} dependentCount={1} />
      );

      expect(screen.getByText("Inherited")).toBeDefined();

      // Test "overridden" ownership - orange color
      const overriddenNode = createMockNode({
        ownership: "overridden",
      });

      rerender(
        <GraphTooltip
          node={overriddenNode}
          x={100}
          y={100}
          dependencyCount={2}
          dependentCount={1}
        />
      );

      expect(screen.getByText("Overridden")).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 2: Tooltip shows container list with per-container ownership
  // ---------------------------------------------------------------------------
  describe("tooltip container ownership list", () => {
    it("shows container list with per-container ownership state", () => {
      const node = createMockNode({
        containers: ["RootContainer", "ChildContainer", "GrandchildContainer"],
        containerOwnership: [
          { containerId: "RootContainer", ownership: "own" },
          { containerId: "ChildContainer", ownership: "inherited" },
          { containerId: "GrandchildContainer", ownership: "overridden" },
        ],
      });

      render(<GraphTooltip node={node} x={100} y={100} dependencyCount={2} dependentCount={1} />);

      // Should show container list section
      expect(screen.getByText("Containers")).toBeDefined();

      // Each container should show its ownership state
      expect(screen.getByText(/RootContainer.*\(own\)/i)).toBeDefined();
      expect(screen.getByText(/ChildContainer.*\(inherited.*\)/i)).toBeDefined();
      expect(screen.getByText(/GrandchildContainer.*\(overridden\)/i)).toBeDefined();
    });

    it("shows inheritance mode badge for inherited containers", () => {
      const node = createMockNode({
        containers: ["ParentContainer", "ChildContainer"],
        containerOwnership: [
          { containerId: "ParentContainer", ownership: "own" },
          // Include inheritanceMode in the containerOwnership entry
          { containerId: "ChildContainer", ownership: "inherited", inheritanceMode: "shared" },
        ],
        inheritanceMode: "shared",
      });

      render(<GraphTooltip node={node} x={100} y={100} dependencyCount={0} dependentCount={0} />);

      // For inherited containers with inheritanceMode, should show S/F/I badge
      expect(screen.getByText(/inherited.*\[S\]/i)).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 3: Filter chips filter by lifetime/container/ownership
  // ---------------------------------------------------------------------------
  describe("filter chips", () => {
    it("renders filter chip with label and active state", () => {
      const handleClick = vi.fn();

      render(<FilterChip label="Singleton" isActive={false} onClick={handleClick} />);

      const chip = screen.getByRole("button", { name: /singleton/i });
      expect(chip).toBeDefined();

      // Click the chip
      fireEvent.click(chip);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("shows active visual state when isActive is true", () => {
      render(<FilterChip label="Singleton" isActive={true} onClick={() => {}} />);

      const chip = screen.getByRole("button", { name: /singleton/i });
      // Active chips should have distinct styling (data attribute for testing)
      expect(chip.getAttribute("data-active")).toBe("true");
    });

    it("groups related chips in FilterChipGroup", () => {
      render(
        <FilterChipGroup label="Lifetime">
          <FilterChip label="Singleton" isActive={false} onClick={() => {}} />
          <FilterChip label="Scoped" isActive={true} onClick={() => {}} />
          <FilterChip label="Transient" isActive={false} onClick={() => {}} />
        </FilterChipGroup>
      );

      expect(screen.getByText("Lifetime")).toBeDefined();
      expect(screen.getByRole("button", { name: /singleton/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /scoped/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /transient/i })).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 4: Quick presets ("Overrides Only", "Async Services", etc.)
  // ---------------------------------------------------------------------------
  describe("quick presets", () => {
    it("renders all preset buttons", () => {
      const handlePresetSelect = vi.fn();

      render(<FilterPresets onPresetSelect={handlePresetSelect} activePreset={null} />);

      expect(screen.getByRole("button", { name: /overrides only/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /async services/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /current container/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /inherited only/i })).toBeDefined();
    });

    it("calls onPresetSelect with correct preset value", () => {
      const handlePresetSelect = vi.fn();

      render(<FilterPresets onPresetSelect={handlePresetSelect} activePreset={null} />);

      // Click "Overrides Only" preset
      fireEvent.click(screen.getByRole("button", { name: /overrides only/i }));
      expect(handlePresetSelect).toHaveBeenCalledWith("overrides-only");

      // Click "Async Services" preset
      fireEvent.click(screen.getByRole("button", { name: /async services/i }));
      expect(handlePresetSelect).toHaveBeenCalledWith("async-services");
    });

    it("shows active visual state for selected preset", () => {
      render(<FilterPresets onPresetSelect={() => {}} activePreset="overrides-only" />);

      const overridesButton = screen.getByRole("button", { name: /overrides only/i });
      expect(overridesButton.getAttribute("data-active")).toBe("true");

      const asyncButton = screen.getByRole("button", { name: /async services/i });
      expect(asyncButton.getAttribute("data-active")).toBe("false");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 5: Port name search with fuzzy matching
  // ---------------------------------------------------------------------------
  describe("port name search", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("filters nodes by search term with fuzzy matching", async () => {
      const testNodes: ReadonlyArray<PositionedNode> = [
        createMockNode({ id: "UserService", label: "UserService" }),
        createMockNode({ id: "AuthService", label: "AuthService" }),
        createMockNode({ id: "Logger", label: "Logger" }),
        createMockNode({ id: "DatabaseClient", label: "DatabaseClient" }),
      ];

      const { result } = renderHook(() => useGraphFilters(testNodes));

      // Initially all nodes are visible
      expect(result.current.filteredNodes.length).toBe(4);

      // Search for "Service" - should match UserService and AuthService
      act(() => {
        result.current.setSearchTerm("Service");
      });

      // Wait for debounce (300ms)
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.filteredNodes.length).toBe(2);
      expect(result.current.filteredNodes.map(n => n.id)).toContain("UserService");
      expect(result.current.filteredNodes.map(n => n.id)).toContain("AuthService");
    });

    it("shows match count indicator", async () => {
      const testNodes: ReadonlyArray<PositionedNode> = [
        createMockNode({ id: "UserService", label: "UserService" }),
        createMockNode({ id: "AuthService", label: "AuthService" }),
        createMockNode({ id: "Logger", label: "Logger" }),
      ];

      const { result } = renderHook(() => useGraphFilters(testNodes));

      act(() => {
        result.current.setSearchTerm("Service");
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.matchCount).toBe(2);
      expect(result.current.totalCount).toBe(3);
    });

    it("debounces search input (300ms)", async () => {
      const testNodes: ReadonlyArray<PositionedNode> = [
        createMockNode({ id: "UserService", label: "UserService" }),
        createMockNode({ id: "Logger", label: "Logger" }),
      ];

      const { result } = renderHook(() => useGraphFilters(testNodes));

      // Type search term
      act(() => {
        result.current.setSearchTerm("User");
      });

      // Before debounce, nodes should still be unfiltered
      expect(result.current.filteredNodes.length).toBe(2);

      // Advance only 200ms (less than debounce)
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      // Still unfiltered
      expect(result.current.filteredNodes.length).toBe(2);

      // Advance remaining 100ms to complete debounce
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // Now filtered
      expect(result.current.filteredNodes.length).toBe(1);
      expect(result.current.filteredNodes[0].id).toBe("UserService");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 6: useGraphFilters hook filters by multiple criteria
  // ---------------------------------------------------------------------------
  describe("useGraphFilters hook", () => {
    it("filters by lifetime", () => {
      const testNodes: ReadonlyArray<PositionedNode> = [
        createMockNode({ id: "SingletonService", lifetime: "singleton" }),
        createMockNode({ id: "ScopedService", lifetime: "scoped" }),
        createMockNode({ id: "TransientService", lifetime: "transient" }),
      ];

      const { result } = renderHook(() => useGraphFilters(testNodes));

      // Filter to singleton only
      act(() => {
        result.current.setLifetimeFilter(new Set(["singleton"]));
      });

      expect(result.current.filteredNodes.length).toBe(1);
      expect(result.current.filteredNodes[0].id).toBe("SingletonService");
    });

    it("filters by ownership", () => {
      const testNodes: ReadonlyArray<PositionedNode> = [
        createMockNode({ id: "OwnService", ownership: "own" }),
        createMockNode({ id: "InheritedService", ownership: "inherited" }),
        createMockNode({ id: "OverriddenService", ownership: "overridden" }),
      ];

      const { result } = renderHook(() => useGraphFilters(testNodes));

      // Filter to overridden only
      act(() => {
        result.current.setOwnershipFilter(new Set(["overridden"]));
      });

      expect(result.current.filteredNodes.length).toBe(1);
      expect(result.current.filteredNodes[0].id).toBe("OverriddenService");
    });

    it("returns active filter count", () => {
      const testNodes: ReadonlyArray<PositionedNode> = [createMockNode({ id: "TestService" })];

      const { result } = renderHook(() => useGraphFilters(testNodes));

      // No filters active
      expect(result.current.activeFilterCount).toBe(0);

      // Add lifetime filter
      act(() => {
        result.current.setLifetimeFilter(new Set(["singleton"]));
      });

      expect(result.current.activeFilterCount).toBe(1);

      // Add ownership filter
      act(() => {
        result.current.setOwnershipFilter(new Set(["own"]));
      });

      expect(result.current.activeFilterCount).toBe(2);
    });

    it("clears all filters", () => {
      const testNodes: ReadonlyArray<PositionedNode> = [
        createMockNode({ id: "Service1", lifetime: "singleton", ownership: "own" }),
        createMockNode({ id: "Service2", lifetime: "scoped", ownership: "inherited" }),
      ];

      const { result } = renderHook(() => useGraphFilters(testNodes));

      // Apply filters
      act(() => {
        result.current.setLifetimeFilter(new Set(["singleton"]));
        result.current.setOwnershipFilter(new Set(["own"]));
      });

      expect(result.current.filteredNodes.length).toBe(1);

      // Clear all filters
      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filteredNodes.length).toBe(2);
      expect(result.current.activeFilterCount).toBe(0);
    });
  });
});
