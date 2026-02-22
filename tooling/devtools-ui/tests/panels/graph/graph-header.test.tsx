/**
 * Tests for GraphHeader component.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { GraphHeader } from "../../../src/panels/graph/components/graph-header.js";
import type {
  MultiContainerGraphState,
  ContainerGraphData,
} from "../../../src/panels/graph/types.js";

afterEach(() => {
  cleanup();
});

const rootGraph: ContainerGraphData = {
  adapters: [
    {
      portName: "Logger",
      lifetime: "singleton",
      factoryKind: "sync",
      dependencyNames: [],
      origin: "own",
    },
    {
      portName: "Database",
      lifetime: "scoped",
      factoryKind: "sync",
      dependencyNames: ["Logger"],
      origin: "own",
    },
  ],
  containerName: "RootApp",
  kind: "root",
  parentName: null,
};

function createMultiState(extra?: ContainerGraphData): MultiContainerGraphState {
  const containers = new Map<string, ContainerGraphData>();
  containers.set("RootApp", rootGraph);
  if (extra !== undefined) {
    containers.set(extra.containerName, extra);
  }
  return {
    containers,
    parentMap: new Map(),
    activeGraph: rootGraph,
  };
}

describe("GraphHeader", () => {
  it("renders with test id", () => {
    render(
      <GraphHeader
        multiContainerState={createMultiState()}
        selectedContainerName={undefined}
        layoutDirection="TB"
        onContainerChange={vi.fn()}
      />
    );
    expect(screen.getByTestId("graph-header")).toBeDefined();
  });

  it("renders container selector", () => {
    render(
      <GraphHeader
        multiContainerState={createMultiState()}
        selectedContainerName={undefined}
        layoutDirection="TB"
        onContainerChange={vi.fn()}
      />
    );
    expect(screen.getByTestId("container-selector")).toBeDefined();
  });

  it("renders kind badge", () => {
    render(
      <GraphHeader
        multiContainerState={createMultiState()}
        selectedContainerName={undefined}
        layoutDirection="TB"
        onContainerChange={vi.fn()}
      />
    );
    expect(screen.getByTestId("kind-badge")).toBeDefined();
    expect(screen.getByTestId("kind-badge").textContent).toBe("root");
  });

  it("shows adapter count", () => {
    render(
      <GraphHeader
        multiContainerState={createMultiState()}
        selectedContainerName={undefined}
        layoutDirection="TB"
        onContainerChange={vi.fn()}
      />
    );
    expect(screen.getByTestId("graph-header").textContent).toContain("2 adapters");
  });

  it("shows direction indicator for TB", () => {
    render(
      <GraphHeader
        multiContainerState={createMultiState()}
        selectedContainerName={undefined}
        layoutDirection="TB"
        onContainerChange={vi.fn()}
      />
    );
    expect(screen.getByTestId("graph-header").textContent).toContain("\u2193");
  });

  it("shows direction indicator for LR", () => {
    render(
      <GraphHeader
        multiContainerState={createMultiState()}
        selectedContainerName={undefined}
        layoutDirection="LR"
        onContainerChange={vi.fn()}
      />
    );
    expect(screen.getByTestId("graph-header").textContent).toContain("\u2192");
  });

  it("calls onContainerChange when selector changes", () => {
    const onContainerChange = vi.fn();
    render(
      <GraphHeader
        multiContainerState={createMultiState()}
        selectedContainerName={undefined}
        layoutDirection="TB"
        onContainerChange={onContainerChange}
      />
    );
    fireEvent.change(screen.getByTestId("container-selector"), { target: { value: "RootApp" } });
    expect(onContainerChange).toHaveBeenCalledWith("RootApp");
  });

  it("does not show compare button with single container", () => {
    render(
      <GraphHeader
        multiContainerState={createMultiState()}
        selectedContainerName={undefined}
        layoutDirection="TB"
        onContainerChange={vi.fn()}
        onCompare={vi.fn()}
      />
    );
    expect(screen.queryByTestId("compare-button")).toBeNull();
  });

  it("shows compare button with multiple containers", () => {
    const childGraph: ContainerGraphData = {
      adapters: [],
      containerName: "ChildApp",
      kind: "child",
      parentName: "RootApp",
    };
    render(
      <GraphHeader
        multiContainerState={createMultiState(childGraph)}
        selectedContainerName={undefined}
        layoutDirection="TB"
        onContainerChange={vi.fn()}
        onCompare={vi.fn()}
      />
    );
    expect(screen.getByTestId("compare-button")).toBeDefined();
  });
});
