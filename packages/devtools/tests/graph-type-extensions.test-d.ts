/**
 * Type tests for Graph Type Extensions (Task Group 3).
 *
 * These tests verify:
 * 1. PositionedNode accepts ownership field with 3-state type
 * 2. ExportedNode includes ownership and containerOwnership fields
 * 3. Type compatibility between graph types and components
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import type { ContainerOwnershipEntry, ExportedNode } from "@hex-di/devtools-core";
import type { ServiceOrigin } from "@hex-di/core";
import type {
  PositionedNode,
  DependencyGraphProps,
  ContainerOwnershipEntry as LocalContainerOwnershipEntry,
} from "../src/react/graph-visualization/types.js";

// =============================================================================
// PositionedNode Ownership Type Tests
// =============================================================================

describe("PositionedNode ownership field", () => {
  it("accepts ownership field with 3-state ServiceOrigin type", () => {
    // Test that PositionedNode can have ownership field
    const nodeWithOwn: PositionedNode = {
      id: "Logger",
      label: "Logger",
      lifetime: "singleton",
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      ownership: "own",
    };
    expectTypeOf(nodeWithOwn.ownership).toEqualTypeOf<ServiceOrigin | undefined>();

    const nodeWithInherited: PositionedNode = {
      id: "Logger",
      label: "Logger",
      lifetime: "singleton",
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      ownership: "inherited",
    };
    expectTypeOf(nodeWithInherited.ownership).toEqualTypeOf<ServiceOrigin | undefined>();

    const nodeWithOverridden: PositionedNode = {
      id: "Logger",
      label: "Logger",
      lifetime: "singleton",
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      ownership: "overridden",
    };
    expectTypeOf(nodeWithOverridden.ownership).toEqualTypeOf<ServiceOrigin | undefined>();
  });

  it("ownership field is optional on PositionedNode", () => {
    // Test that ownership is optional
    const nodeWithoutOwnership: PositionedNode = {
      id: "Logger",
      label: "Logger",
      lifetime: "singleton",
      x: 0,
      y: 0,
      width: 100,
      height: 50,
    };
    expectTypeOf(nodeWithoutOwnership).toMatchTypeOf<PositionedNode>();
  });
});

// =============================================================================
// ExportedNode Container Ownership Type Tests
// =============================================================================

describe("ExportedNode ownership and containerOwnership fields", () => {
  it("includes ownership field with 3-state type", () => {
    const node = {} as ExportedNode;

    // Verify ownership field exists and has correct type
    expectTypeOf(node.ownership).toEqualTypeOf<ServiceOrigin | undefined>();
  });

  it("includes containerOwnership field for per-container metadata", () => {
    const node = {} as ExportedNode;

    // Verify containerOwnership field exists with correct structure
    expectTypeOf(node.containerOwnership).toEqualTypeOf<
      ReadonlyArray<ContainerOwnershipEntry> | undefined
    >();
  });

  it("ExportedNode with containerOwnership has correct structure", () => {
    // Verify the complete ExportedNode structure with new fields
    const node: ExportedNode = {
      id: "Logger",
      label: "Logger",
      lifetime: "singleton",
      factoryKind: "sync",
      ownership: "own",
      containerOwnership: [
        { containerId: "root", ownership: "own" },
        { containerId: "child-1", ownership: "inherited" },
        { containerId: "child-2", ownership: "overridden" },
      ],
    };

    expectTypeOf(node).toMatchTypeOf<ExportedNode>();
    expectTypeOf(node.containerOwnership).toMatchTypeOf<
      ReadonlyArray<ContainerOwnershipEntry> | undefined
    >();
  });
});

// =============================================================================
// DependencyGraphProps Type Compatibility Tests
// =============================================================================

describe("DependencyGraphProps node type compatibility", () => {
  it("node type includes ownership field", () => {
    // Get the node type from props
    type NodeType = DependencyGraphProps["nodes"][number];

    // Verify ownership field exists on node type
    const nodeWithOwnership: NodeType = {
      id: "Logger",
      label: "Logger",
      lifetime: "singleton",
      ownership: "own",
    };

    expectTypeOf(nodeWithOwnership.ownership).toEqualTypeOf<ServiceOrigin | undefined>();
  });

  it("node type includes containerOwnership field", () => {
    type NodeType = DependencyGraphProps["nodes"][number];

    // Verify containerOwnership field exists on node type
    const nodeWithContainerOwnership: NodeType = {
      id: "Logger",
      label: "Logger",
      lifetime: "singleton",
      containerOwnership: [
        { containerId: "root", ownership: "own" },
        { containerId: "child-1", ownership: "inherited" },
      ],
    };

    expectTypeOf(nodeWithContainerOwnership.containerOwnership).toEqualTypeOf<
      ReadonlyArray<LocalContainerOwnershipEntry> | undefined
    >();
  });

  it("graph types are compatible for visualization pipeline", () => {
    // Verify that ExportedNode can be used where DependencyGraphProps.nodes expects
    type PropsNodeType = DependencyGraphProps["nodes"][number];

    // ExportedNode should be assignable to props node type
    const exportedNode: ExportedNode = {
      id: "Logger",
      label: "Logger",
      lifetime: "singleton",
      factoryKind: "sync",
      ownership: "inherited",
      containerOwnership: [{ containerId: "root", ownership: "own" }],
    };

    // The node should be compatible with DependencyGraphProps node type
    // (factoryKind is optional in DependencyGraphProps)
    expectTypeOf(exportedNode).toMatchTypeOf<PropsNodeType>();
  });
});
