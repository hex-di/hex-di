/**
 * Tests for node ownership styling in the dependency graph.
 *
 * These tests verify the visual styling for 3-state adapter ownership:
 * - "own": Solid 2px border, full opacity - adapter registered directly in container
 * - "inherited": Dashed 4-2 border, 85% opacity - adapter from parent container
 * - "overridden": Double 3px border, OVR badge - child override of parent adapter
 *
 * @packageDocumentation
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import {
  renderDINode,
  type DINodeMetadata,
} from "../../src/react/graph-visualization/di-metadata.js";
import type { PositionedNode } from "../../src/react/graph-visualization/types.js";
import type { RenderNodeProps, PositionedNode as GenericPositionedNode } from "@hex-di/graph-viz";
import {
  OWNERSHIP_STYLES,
  getOwnershipStyle,
} from "../../src/react/graph-visualization/graph-styles.js";

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

/**
 * Creates render props for the renderDINode function from a PositionedNode.
 */
function createRenderProps(
  node: PositionedNode,
  overrides: Partial<Omit<RenderNodeProps<DINodeMetadata>, "node">> = {}
): RenderNodeProps<DINodeMetadata> {
  const metadata: DINodeMetadata = {
    lifetime: node.lifetime,
    factoryKind: node.factoryKind,
    origin: node.origin,
    ownership: node.ownership,
    inheritanceMode: node.inheritanceMode,
    containers: node.containers,
    containerOwnership: node.containerOwnership,
  };

  const genericNode: GenericPositionedNode<DINodeMetadata> = {
    id: node.id,
    label: node.label,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    metadata,
  };

  return {
    node: genericNode,
    isHovered: false,
    isSelected: false,
    isDimmed: false,
    x: node.x - node.width / 2,
    y: node.y - node.height / 2,
    ...overrides,
  };
}

// =============================================================================
// Task 5.1: Test Suite for Ownership Styling (5-6 focused tests)
// =============================================================================

describe("Node Ownership Styling", () => {
  afterEach(() => {
    cleanup();
  });

  // ---------------------------------------------------------------------------
  // Test 1: "own" nodes render with solid 2px border, full opacity
  // ---------------------------------------------------------------------------
  describe("own nodes", () => {
    it("renders with solid 2px border and full opacity", () => {
      const node = createMockNode({
        ownership: "own",
      });
      const props = createRenderProps(node);

      render(
        <svg>
          <g className="graph-node">{renderDINode(props)}</g>
        </svg>
      );

      const rect = document.querySelector("rect");
      expect(rect).not.toBeNull();

      // Own nodes should have solid border (no strokeDasharray)
      expect(rect?.getAttribute("stroke-dasharray")).toBeNull();

      // Own nodes should have strokeWidth of 2
      expect(rect?.getAttribute("stroke-width")).toBe("2");

      // Own nodes should have full opacity (parent g element)
      const nodeGroup = document.querySelector(".graph-node g");
      const computedStyle = nodeGroup?.getAttribute("style");
      expect(computedStyle).toContain("opacity");
      // The opacity should be 1 (not dimmed)
      expect(computedStyle).not.toContain("opacity: 0.85");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 2: "inherited" nodes render with dashed 4-2 border, 85% opacity
  // ---------------------------------------------------------------------------
  describe("inherited nodes", () => {
    it("renders with dashed 4-2 border and 85% opacity", () => {
      const node = createMockNode({
        ownership: "inherited",
        inheritanceMode: "shared",
      });
      const props = createRenderProps(node);

      render(
        <svg>
          <g className="graph-node">{renderDINode(props)}</g>
        </svg>
      );

      const rect = document.querySelector("rect");
      expect(rect).not.toBeNull();

      // Inherited nodes should have dashed border
      expect(rect?.getAttribute("stroke-dasharray")).toBe("4 2");

      // Inherited nodes should have strokeWidth of 2
      expect(rect?.getAttribute("stroke-width")).toBe("2");

      // Inherited nodes should have 85% opacity
      const nodeGroup = document.querySelector(".graph-node g");
      const computedStyle = nodeGroup?.getAttribute("style");
      expect(computedStyle).toContain("opacity: 0.85");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 3: "overridden" nodes render with double 3px border, OVR badge
  // ---------------------------------------------------------------------------
  describe("overridden nodes", () => {
    it("renders with double 3px border and OVR badge", () => {
      const node = createMockNode({
        ownership: "overridden",
      });
      const props = createRenderProps(node);

      render(
        <svg>
          <g className="graph-node">{renderDINode(props)}</g>
        </svg>
      );

      const rect = document.querySelector("rect");
      expect(rect).not.toBeNull();

      // Overridden nodes should have double border style (double stroke-dasharray pattern)
      expect(rect?.getAttribute("stroke-dasharray")).toBe("1 0");

      // Overridden nodes should have strokeWidth of 3
      expect(rect?.getAttribute("stroke-width")).toBe("3");

      // OVR badge should be rendered
      const ovrBadge = screen.getByTestId("ovr-badge");
      expect(ovrBadge).toBeDefined();
      expect(ovrBadge.textContent).toBe("OVR");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 4: Inheritance mode badge (S/F/I) appears on inherited nodes
  // ---------------------------------------------------------------------------
  describe("inheritance mode badge", () => {
    it("renders S/F/I badge for inherited nodes based on inheritance mode", () => {
      // Test Shared mode (S)
      const sharedNode = createMockNode({
        ownership: "inherited",
        inheritanceMode: "shared",
      });
      const sharedProps = createRenderProps(sharedNode);

      const { rerender } = render(
        <svg>
          <g className="graph-node">{renderDINode(sharedProps)}</g>
        </svg>
      );

      // Should show "S" for shared
      const sharedBadge = document.querySelector("[data-testid='inheritance-mode-badge']");
      expect(sharedBadge).not.toBeNull();
      expect(sharedBadge?.textContent).toBe("S");

      // Test Forked mode (F)
      const forkedNode = createMockNode({
        ownership: "inherited",
        inheritanceMode: "forked",
      });
      const forkedProps = createRenderProps(forkedNode);

      rerender(
        <svg>
          <g className="graph-node">{renderDINode(forkedProps)}</g>
        </svg>
      );

      const forkedBadge = document.querySelector("[data-testid='inheritance-mode-badge']");
      expect(forkedBadge?.textContent).toBe("F");

      // Test Isolated mode (I)
      const isolatedNode = createMockNode({
        ownership: "inherited",
        inheritanceMode: "isolated",
      });
      const isolatedProps = createRenderProps(isolatedNode);

      rerender(
        <svg>
          <g className="graph-node">{renderDINode(isolatedProps)}</g>
        </svg>
      );

      const isolatedBadge = document.querySelector("[data-testid='inheritance-mode-badge']");
      expect(isolatedBadge?.textContent).toBe("I");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 5: Count badge appears for ports with 3+ adapters
  // ---------------------------------------------------------------------------
  describe("count badge for multi-adapter ports", () => {
    it("shows count badge when port has 3+ adapters from different containers", () => {
      const node = createMockNode({
        containers: ["Container1", "Container2", "Container3", "Container4"],
      });
      const props = createRenderProps(node);

      render(
        <svg>
          <g className="graph-node">{renderDINode(props)}</g>
        </svg>
      );

      // Count badge should be rendered showing "+2" (4 containers - 2 = 2 additional)
      const countBadge = screen.getByTestId("adapter-count-badge");
      expect(countBadge).toBeDefined();
      expect(countBadge.textContent).toBe("+2");
    });

    it("does not show count badge when port has fewer than 3 adapters", () => {
      const node = createMockNode({
        containers: ["Container1", "Container2"],
      });
      const props = createRenderProps(node);

      render(
        <svg>
          <g className="graph-node">{renderDINode(props)}</g>
        </svg>
      );

      // Count badge should NOT be rendered
      expect(screen.queryByTestId("adapter-count-badge")).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 6: OWNERSHIP_STYLES constant and getOwnershipStyle() utility
  // ---------------------------------------------------------------------------
  describe("OWNERSHIP_STYLES constant and getOwnershipStyle utility", () => {
    it("OWNERSHIP_STYLES defines correct configurations for all ownership states", () => {
      // Own
      expect(OWNERSHIP_STYLES.own.borderStyle).toBe("solid");
      expect(OWNERSHIP_STYLES.own.strokeWidth).toBe(2);
      expect(OWNERSHIP_STYLES.own.opacity).toBe(1);

      // Inherited
      expect(OWNERSHIP_STYLES.inherited.borderStyle).toBe("dashed");
      expect(OWNERSHIP_STYLES.inherited.strokeDasharray).toBe("4 2");
      expect(OWNERSHIP_STYLES.inherited.strokeWidth).toBe(2);
      expect(OWNERSHIP_STYLES.inherited.opacity).toBe(0.85);

      // Overridden
      expect(OWNERSHIP_STYLES.overridden.borderStyle).toBe("double");
      expect(OWNERSHIP_STYLES.overridden.strokeWidth).toBe(3);
      expect(OWNERSHIP_STYLES.overridden.opacity).toBe(1);
      expect(OWNERSHIP_STYLES.overridden.showOvrBadge).toBe(true);
    });

    it("getOwnershipStyle returns appropriate styles based on ownership state", () => {
      const ownStyle = getOwnershipStyle("own");
      expect(ownStyle.strokeWidth).toBe(2);
      expect(ownStyle.opacity).toBe(1);

      const inheritedStyle = getOwnershipStyle("inherited");
      expect(inheritedStyle.strokeDasharray).toBe("4 2");
      expect(inheritedStyle.opacity).toBe(0.85);

      const overriddenStyle = getOwnershipStyle("overridden");
      expect(overriddenStyle.strokeWidth).toBe(3);
      expect(overriddenStyle.showOvrBadge).toBe(true);
    });

    it("getOwnershipStyle defaults to 'own' styling for undefined ownership", () => {
      const defaultStyle = getOwnershipStyle(undefined);
      expect(defaultStyle.strokeWidth).toBe(2);
      expect(defaultStyle.opacity).toBe(1);
      expect(defaultStyle.strokeDasharray).toBeUndefined();
    });
  });
});
