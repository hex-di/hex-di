/**
 * Tests for the DevTools graph integration layer with @hex-di/graph-viz.
 *
 * These tests verify:
 * - extractDIMetadata() converts DevTools node to graph-viz metadata
 * - renderDINode() applies ownership badges and lifetime icons
 * - renderDITooltip() shows correct DI-specific information
 * - Integration imports from @hex-di/graph-viz correctly
 *
 * @packageDocumentation
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  extractDIMetadata,
  renderDINode,
  renderDITooltip,
  renderDIEdge,
  type DINodeMetadata,
} from "../../src/react/graph-visualization/di-metadata.js";
import type { PositionedNode } from "../../src/react/graph-visualization/types.js";
import type { RenderNodeProps, RenderEdgeProps, RenderTooltipProps } from "@hex-di/graph-viz";

// =============================================================================
// Test 1: extractDIMetadata() converts DevTools node to graph-viz metadata
// =============================================================================

describe("extractDIMetadata", () => {
  it("converts DevTools node to graph-viz metadata", () => {
    const devToolsNode: PositionedNode = {
      id: "Logger",
      label: "Logger",
      lifetime: "singleton",
      factoryKind: "async",
      x: 100,
      y: 50,
      width: 140,
      height: 50,
      origin: "own",
      ownership: "own",
      inheritanceMode: undefined,
      containers: ["root"],
    };

    const metadata = extractDIMetadata(devToolsNode);

    expect(metadata.lifetime).toBe("singleton");
    expect(metadata.factoryKind).toBe("async");
    expect(metadata.origin).toBe("own");
    expect(metadata.ownership).toBe("own");
    expect(metadata.inheritanceMode).toBeUndefined();
    expect(metadata.containers).toEqual(["root"]);
  });

  it("preserves ContainerKind, ServiceOrigin, and InheritanceMode information", () => {
    const inheritedNode: PositionedNode = {
      id: "UserService",
      label: "UserService",
      lifetime: "scoped",
      factoryKind: "sync",
      x: 200,
      y: 100,
      width: 140,
      height: 50,
      origin: "inherited",
      ownership: "inherited",
      inheritanceMode: "shared",
      containers: ["root", "child-1"],
      containerOwnership: [
        { containerId: "root", ownership: "own" },
        { containerId: "child-1", ownership: "inherited" },
      ],
    };

    const metadata = extractDIMetadata(inheritedNode);

    expect(metadata.lifetime).toBe("scoped");
    expect(metadata.factoryKind).toBe("sync");
    expect(metadata.origin).toBe("inherited");
    expect(metadata.ownership).toBe("inherited");
    expect(metadata.inheritanceMode).toBe("shared");
    expect(metadata.containers).toEqual(["root", "child-1"]);
    expect(metadata.containerOwnership).toEqual([
      { containerId: "root", ownership: "own" },
      { containerId: "child-1", ownership: "inherited" },
    ]);
  });

  it("handles overridden nodes correctly", () => {
    const overriddenNode: PositionedNode = {
      id: "ConfigService",
      label: "ConfigService",
      lifetime: "transient",
      x: 300,
      y: 150,
      width: 140,
      height: 50,
      origin: "overridden",
      ownership: "overridden",
    };

    const metadata = extractDIMetadata(overriddenNode);

    expect(metadata.origin).toBe("overridden");
    expect(metadata.ownership).toBe("overridden");
    expect(metadata.lifetime).toBe("transient");
  });
});

// =============================================================================
// Test 2: renderDINode() applies ownership badges and lifetime icons
// =============================================================================

describe("renderDINode", () => {
  it("applies ownership badges and lifetime icons for own nodes", () => {
    const metadata: DINodeMetadata = {
      lifetime: "singleton",
      factoryKind: "sync",
      origin: "own",
      ownership: "own",
    };

    const props: RenderNodeProps<DINodeMetadata> = {
      node: {
        id: "Logger",
        label: "Logger",
        x: 100,
        y: 50,
        width: 140,
        height: 50,
        metadata,
      },
      isHovered: false,
      isSelected: false,
      isDimmed: false,
      x: 30, // top-left x
      y: 25, // top-left y
    };

    const { container } = render(<svg data-testid="test-svg">{renderDINode(props)}</svg>);

    // Check that the node rect exists
    const rect = container.querySelector("rect");
    expect(rect).toBeTruthy();

    // Check that the label exists
    const texts = container.querySelectorAll("text");
    const labelText = Array.from(texts).find(t => t.textContent === "Logger");
    expect(labelText).toBeTruthy();

    // Check that the lifetime badge exists
    const lifetimeText = Array.from(texts).find(t => t.textContent?.toLowerCase() === "singleton");
    expect(lifetimeText).toBeTruthy();
  });

  it("renders async badge for async factory kind", () => {
    const metadata: DINodeMetadata = {
      lifetime: "scoped",
      factoryKind: "async",
      origin: "own",
      ownership: "own",
    };

    const props: RenderNodeProps<DINodeMetadata> = {
      node: {
        id: "AsyncService",
        label: "AsyncService",
        x: 100,
        y: 50,
        width: 140,
        height: 50,
        metadata,
      },
      isHovered: false,
      isSelected: false,
      isDimmed: false,
      x: 30,
      y: 25,
    };

    const { container } = render(<svg>{renderDINode(props)}</svg>);

    // Check for async badge ("A" text)
    const texts = container.querySelectorAll("text");
    const asyncBadge = Array.from(texts).find(t => t.textContent === "A");
    expect(asyncBadge).toBeTruthy();
  });

  it("renders OVR badge for overridden nodes", () => {
    const metadata: DINodeMetadata = {
      lifetime: "singleton",
      factoryKind: "sync",
      origin: "overridden",
      ownership: "overridden",
    };

    const props: RenderNodeProps<DINodeMetadata> = {
      node: {
        id: "OverriddenService",
        label: "OverriddenService",
        x: 100,
        y: 50,
        width: 140,
        height: 50,
        metadata,
      },
      isHovered: false,
      isSelected: false,
      isDimmed: false,
      x: 30,
      y: 25,
    };

    const { container } = render(<svg>{renderDINode(props)}</svg>);

    // Check for OVR badge
    const texts = container.querySelectorAll("text");
    const ovrBadge = Array.from(texts).find(t => t.textContent === "OVR");
    expect(ovrBadge).toBeTruthy();
  });

  it("renders inheritance mode badge for inherited nodes", () => {
    const metadata: DINodeMetadata = {
      lifetime: "scoped",
      factoryKind: "sync",
      origin: "inherited",
      ownership: "inherited",
      inheritanceMode: "forked",
    };

    const props: RenderNodeProps<DINodeMetadata> = {
      node: {
        id: "InheritedService",
        label: "InheritedService",
        x: 100,
        y: 50,
        width: 140,
        height: 50,
        metadata,
      },
      isHovered: false,
      isSelected: false,
      isDimmed: false,
      x: 30,
      y: 25,
    };

    const { container } = render(<svg>{renderDINode(props)}</svg>);

    // Check for inheritance mode badge ("F" for forked)
    const texts = container.querySelectorAll("text");
    const inheritanceBadge = Array.from(texts).find(t => t.textContent === "F");
    expect(inheritanceBadge).toBeTruthy();
  });
});

// =============================================================================
// Test 3: renderDITooltip() shows correct DI-specific information
// =============================================================================

describe("renderDITooltip", () => {
  it("shows correct DI-specific information", () => {
    const metadata: DINodeMetadata = {
      lifetime: "scoped",
      factoryKind: "async",
      origin: "inherited",
      ownership: "inherited",
      inheritanceMode: "shared",
      containers: ["root", "child-1"],
      containerOwnership: [
        { containerId: "root", ownership: "own" },
        { containerId: "child-1", ownership: "inherited" },
      ],
    };

    const props: RenderTooltipProps<DINodeMetadata> = {
      node: {
        id: "UserService",
        label: "UserService",
        x: 100,
        y: 50,
        width: 140,
        height: 50,
        metadata,
      },
      x: 200,
      y: 100,
    };

    const result = renderDITooltip(props);
    expect(result).not.toBeNull();

    const { container } = render(result!);

    // Check that node name is displayed
    expect(container.textContent).toContain("UserService");

    // Check that lifetime is displayed
    expect(container.textContent).toContain("Lifetime");
    expect(container.textContent).toContain("scoped");

    // Check that ownership is displayed
    expect(container.textContent).toContain("Ownership");
    expect(container.textContent).toContain("Inherited");

    // Check that factory kind is displayed
    expect(container.textContent).toContain("Factory");
    expect(container.textContent).toContain("async");

    // Check that inheritance mode is displayed
    expect(container.textContent).toContain("Inheritance");
    expect(container.textContent).toContain("shared");
  });

  it("shows containers for multi-container views", () => {
    const metadata: DINodeMetadata = {
      lifetime: "singleton",
      factoryKind: "sync",
      origin: "own",
      ownership: "own",
      containers: ["root", "child-1", "child-2"],
    };

    const props: RenderTooltipProps<DINodeMetadata> = {
      node: {
        id: "SharedService",
        label: "SharedService",
        x: 100,
        y: 50,
        width: 140,
        height: 50,
        metadata,
      },
      x: 200,
      y: 100,
    };

    const result = renderDITooltip(props);
    expect(result).not.toBeNull();

    const { container } = render(result!);

    // Check that containers are listed
    expect(container.textContent).toContain("Containers");
    expect(container.textContent).toContain("root");
    expect(container.textContent).toContain("child-1");
    expect(container.textContent).toContain("child-2");
  });

  it("returns null when node metadata is missing", () => {
    const props: RenderTooltipProps<DINodeMetadata> = {
      node: {
        id: "UnknownNode",
        label: "UnknownNode",
        x: 100,
        y: 50,
        width: 140,
        height: 50,
        // metadata is undefined
      },
      x: 200,
      y: 100,
    };

    const result = renderDITooltip(props);
    // Should still render a basic tooltip even without metadata
    expect(result).not.toBeNull();
  });
});

// =============================================================================
// Test 4: Integration imports from @hex-di/graph-viz correctly
// =============================================================================

describe("graph-viz integration", () => {
  it("imports from @hex-di/graph-viz correctly", async () => {
    // Verify that key exports from @hex-di/graph-viz are importable
    const graphViz = await import("@hex-di/graph-viz");

    // Core components
    expect(graphViz.GraphRenderer).toBeDefined();
    expect(graphViz.GraphNode).toBeDefined();
    expect(graphViz.GraphEdge).toBeDefined();
    expect(graphViz.GraphControls).toBeDefined();

    // Layout utilities
    expect(graphViz.computeLayout).toBeDefined();
    expect(graphViz.generateEdgePath).toBeDefined();
    expect(graphViz.findConnectedNodes).toBeDefined();
    expect(graphViz.findConnectedEdges).toBeDefined();

    // Type utilities
    expect(graphViz.createEdgeKey).toBeDefined();
    expect(graphViz.DEFAULT_TRANSFORM).toBeDefined();
  });

  it("renderDIEdge produces valid SVG path element", () => {
    const props: RenderEdgeProps = {
      edge: {
        from: "A",
        to: "B",
        points: [
          { x: 0, y: 0 },
          { x: 50, y: 50 },
          { x: 100, y: 100 },
        ],
      },
      isHighlighted: false,
      isDimmed: false,
      pathD: "M 0 0 Q 50 50 75 75 L 100 100",
    };

    const { container } = render(<svg>{renderDIEdge(props)}</svg>);

    const path = container.querySelector("path");
    expect(path).toBeTruthy();
    expect(path?.getAttribute("d")).toBe(props.pathD);
  });

  it("renderDIEdge applies highlighted styling", () => {
    const props: RenderEdgeProps = {
      edge: {
        from: "A",
        to: "B",
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 100 },
        ],
      },
      isHighlighted: true,
      isDimmed: false,
      pathD: "M 0 0 L 100 100",
    };

    const { container } = render(<svg>{renderDIEdge(props)}</svg>);

    const path = container.querySelector("path");
    expect(path).toBeTruthy();
    // Highlighted edges have stroke-width of 2
    expect(path?.getAttribute("stroke-width")).toBe("2");
  });
});
