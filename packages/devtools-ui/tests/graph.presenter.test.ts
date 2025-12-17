/**
 * Tests for GraphPresenter.
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createMockDataSource,
  createTestGraph,
  createComplexTestGraph,
  createEmptyGraph,
  createNode,
  createEdge,
  createGraph,
  type MockDataSourceActions,
} from "@hex-di/devtools-testing";
import type { PresenterDataSourceContract } from "@hex-di/devtools-core";
import { GraphPresenter } from "../src/presenters/graph.presenter.js";

describe("GraphPresenter", () => {
  let mockDataSource: PresenterDataSourceContract & MockDataSourceActions;
  let presenter: GraphPresenter;

  beforeEach(() => {
    mockDataSource = createMockDataSource({
      graph: createTestGraph(),
    });
    presenter = new GraphPresenter(mockDataSource);
  });

  // ===========================================================================
  // Basic View Model
  // ===========================================================================

  describe("getViewModel", () => {
    it("should return empty view model for empty graph", () => {
      mockDataSource._setGraph(createEmptyGraph());
      const vm = presenter.getViewModel();

      expect(vm.isEmpty).toBe(true);
      expect(vm.nodes).toHaveLength(0);
      expect(vm.edges).toHaveLength(0);
      expect(vm.nodeCount).toBe(0);
      expect(vm.edgeCount).toBe(0);
    });

    it("should transform nodes correctly", () => {
      const vm = presenter.getViewModel();

      expect(vm.nodes).toHaveLength(3);
      expect(vm.nodeCount).toBe(3);

      const loggerNode = vm.nodes.find((n) => n.id === "Logger");
      expect(loggerNode).toBeDefined();
      expect(loggerNode!.label).toBe("Logger");
      expect(loggerNode!.lifetime).toBe("singleton");
      expect(loggerNode!.factoryKind).toBe("sync");
      expect(loggerNode!.isSelected).toBe(false);
      expect(loggerNode!.isHighlighted).toBe(false);
    });

    it("should transform edges correctly", () => {
      const vm = presenter.getViewModel();

      expect(vm.edges).toHaveLength(2);
      expect(vm.edgeCount).toBe(2);

      const userServiceToLogger = vm.edges.find(
        (e) => e.from === "UserService" && e.to === "Logger"
      );
      expect(userServiceToLogger).toBeDefined();
      expect(userServiceToLogger!.id).toBe("UserService->Logger");
    });

    it("should include viewport information", () => {
      const vm = presenter.getViewModel();

      expect(vm.viewport).toBeDefined();
      expect(vm.viewport.width).toBeGreaterThan(0);
      expect(vm.viewport.height).toBeGreaterThan(0);
    });

    it("should include default settings", () => {
      const vm = presenter.getViewModel();

      expect(vm.direction).toBe("TB");
      expect(vm.zoom).toBe(1);
      expect(vm.panOffset).toEqual({ x: 0, y: 0 });
      expect(vm.selectedNodeId).toBeNull();
      expect(vm.highlightedNodeIds).toHaveLength(0);
    });

    it("should calculate node positions", () => {
      const vm = presenter.getViewModel();

      vm.nodes.forEach((node) => {
        expect(node.position).toBeDefined();
        expect(typeof node.position.x).toBe("number");
        expect(typeof node.position.y).toBe("number");
        expect(node.dimensions).toBeDefined();
        expect(node.dimensions.width).toBeGreaterThan(0);
        expect(node.dimensions.height).toBeGreaterThan(0);
      });
    });

    it("should return frozen objects", () => {
      const vm = presenter.getViewModel();

      expect(Object.isFrozen(vm)).toBe(true);
      expect(Object.isFrozen(vm.nodes)).toBe(true);
      expect(Object.isFrozen(vm.edges)).toBe(true);
    });
  });

  // ===========================================================================
  // Node Selection
  // ===========================================================================

  describe("selectNode", () => {
    it("should mark node as selected", () => {
      presenter.selectNode("Logger");
      const vm = presenter.getViewModel();

      expect(vm.selectedNodeId).toBe("Logger");

      const loggerNode = vm.nodes.find((n) => n.id === "Logger");
      expect(loggerNode!.isSelected).toBe(true);
    });

    it("should deselect when passing null", () => {
      presenter.selectNode("Logger");
      presenter.selectNode(null);
      const vm = presenter.getViewModel();

      expect(vm.selectedNodeId).toBeNull();
    });

    it("should highlight dependency path when selecting a node", () => {
      presenter.selectNode("UserService");
      const vm = presenter.getViewModel();

      // UserService depends on Logger and Config
      expect(vm.highlightedNodeIds).toContain("UserService");
      expect(vm.highlightedNodeIds).toContain("Logger");
      expect(vm.highlightedNodeIds).toContain("Config");
    });

    it("should clear highlights when deselecting", () => {
      presenter.selectNode("UserService");
      presenter.selectNode(null);
      const vm = presenter.getViewModel();

      expect(vm.highlightedNodeIds).toHaveLength(0);
    });

    it("should dim non-highlighted nodes when a node is selected", () => {
      // Create a graph with an unrelated node
      mockDataSource._setGraph(
        createGraph({
          nodes: [
            createNode({ id: "Logger" }),
            createNode({ id: "UserService" }),
            createNode({ id: "Unrelated" }),
          ],
          edges: [createEdge("UserService", "Logger")],
        })
      );

      presenter.selectNode("UserService");
      const vm = presenter.getViewModel();

      const unrelatedNode = vm.nodes.find((n) => n.id === "Unrelated");
      expect(unrelatedNode!.isDimmed).toBe(true);
    });
  });

  // ===========================================================================
  // Highlighting
  // ===========================================================================

  describe("highlightNodes", () => {
    it("should highlight specified nodes", () => {
      presenter.highlightNodes(["Logger", "Config"]);
      const vm = presenter.getViewModel();

      expect(vm.highlightedNodeIds).toContain("Logger");
      expect(vm.highlightedNodeIds).toContain("Config");

      const loggerNode = vm.nodes.find((n) => n.id === "Logger");
      expect(loggerNode!.isHighlighted).toBe(true);
    });

    it("should dim non-highlighted nodes", () => {
      presenter.highlightNodes(["Logger"]);
      const vm = presenter.getViewModel();

      const userServiceNode = vm.nodes.find((n) => n.id === "UserService");
      expect(userServiceNode!.isDimmed).toBe(true);
    });

    it("should highlight edges between highlighted nodes", () => {
      presenter.highlightNodes(["UserService", "Logger"]);
      const vm = presenter.getViewModel();

      const edge = vm.edges.find(
        (e) => e.from === "UserService" && e.to === "Logger"
      );
      expect(edge!.isHighlighted).toBe(true);
    });

    it("should dim edges that are not between highlighted nodes", () => {
      presenter.highlightNodes(["Logger"]);
      const vm = presenter.getViewModel();

      const edge = vm.edges.find(
        (e) => e.from === "UserService" && e.to === "Logger"
      );
      expect(edge!.isDimmed).toBe(true);
    });
  });

  // ===========================================================================
  // Layout Direction
  // ===========================================================================

  describe("setDirection", () => {
    it("should update layout direction", () => {
      presenter.setDirection("LR");
      const vm = presenter.getViewModel();

      expect(vm.direction).toBe("LR");
    });
  });

  // ===========================================================================
  // Zoom
  // ===========================================================================

  describe("setZoom", () => {
    it("should update zoom level", () => {
      presenter.setZoom(1.5);
      const vm = presenter.getViewModel();

      expect(vm.zoom).toBe(1.5);
    });

    it("should clamp zoom to minimum of 0.1", () => {
      presenter.setZoom(0.01);
      const vm = presenter.getViewModel();

      expect(vm.zoom).toBe(0.1);
    });

    it("should clamp zoom to maximum of 3", () => {
      presenter.setZoom(5);
      const vm = presenter.getViewModel();

      expect(vm.zoom).toBe(3);
    });
  });

  // ===========================================================================
  // Pan
  // ===========================================================================

  describe("setPanOffset", () => {
    it("should update pan offset", () => {
      presenter.setPanOffset({ x: 100, y: 50 });
      const vm = presenter.getViewModel();

      expect(vm.panOffset).toEqual({ x: 100, y: 50 });
    });
  });

  // ===========================================================================
  // Complex Graph Layout
  // ===========================================================================

  describe("layout with complex graph", () => {
    beforeEach(() => {
      mockDataSource._setGraph(createComplexTestGraph());
    });

    it("should handle multi-layer dependency graph", () => {
      const vm = presenter.getViewModel();

      expect(vm.nodes).toHaveLength(7);
      expect(vm.edges).toHaveLength(8);
    });

    it("should position dependent nodes at different levels", () => {
      const vm = presenter.getViewModel();

      // Find nodes at different dependency depths
      const userService = vm.nodes.find((n) => n.id === "UserService")!;
      const logger = vm.nodes.find((n) => n.id === "Logger")!;

      // UserService depends on Logger, so Logger should be at a lower y position
      // (in TB direction, dependencies are below)
      expect(userService.position.y).toBeLessThan(logger.position.y);
    });

    it("should highlight transitive dependencies", () => {
      presenter.selectNode("UserService");
      const vm = presenter.getViewModel();

      // UserService -> UserRepository -> Database
      expect(vm.highlightedNodeIds).toContain("UserService");
      expect(vm.highlightedNodeIds).toContain("UserRepository");
      expect(vm.highlightedNodeIds).toContain("Database");
      expect(vm.highlightedNodeIds).toContain("Cache");
    });
  });

  // ===========================================================================
  // Data Source Updates
  // ===========================================================================

  describe("data source updates", () => {
    it("should reflect graph updates from data source", () => {
      let vm = presenter.getViewModel();
      expect(vm.nodes).toHaveLength(3);

      mockDataSource._setGraph(createComplexTestGraph());
      vm = presenter.getViewModel();

      expect(vm.nodes).toHaveLength(7);
    });
  });
});
