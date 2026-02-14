/**
 * Tests for ContainerComparisonView component.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ContainerComparisonView } from "../../../src/panels/graph/components/container-comparison-view.js";
import type { ContainerGraphData, VisualizableAdapter } from "../../../src/panels/graph/types.js";

afterEach(() => {
  cleanup();
});

function createAdapter(portName: string): VisualizableAdapter {
  return {
    portName,
    lifetime: "singleton",
    factoryKind: "sync",
    dependencyNames: [],
    origin: "own",
  };
}

function createContainer(
  name: string,
  adapters: readonly VisualizableAdapter[]
): ContainerGraphData {
  return {
    containerName: name,
    kind: "root",
    adapters,
    parentName: null,
  };
}

describe("ContainerComparisonView", () => {
  it("renders with test id", () => {
    const left = createContainer("Root", [createAdapter("A"), createAdapter("B")]);
    const right = createContainer("Child", [createAdapter("B"), createAdapter("C")]);
    render(
      <ContainerComparisonView
        leftContainer={left}
        rightContainer={right}
        width={800}
        height={600}
      />
    );
    expect(screen.getByTestId("container-comparison")).toBeDefined();
  });

  it("shows container names", () => {
    const left = createContainer("Root", [createAdapter("A")]);
    const right = createContainer("Child", [createAdapter("B")]);
    render(
      <ContainerComparisonView
        leftContainer={left}
        rightContainer={right}
        width={800}
        height={600}
      />
    );
    const text = screen.getByTestId("container-comparison").textContent ?? "";
    expect(text).toContain("Root");
    expect(text).toContain("Child");
  });

  it("shows adapter counts", () => {
    const left = createContainer("Root", [createAdapter("A"), createAdapter("B")]);
    const right = createContainer("Child", [createAdapter("C")]);
    render(
      <ContainerComparisonView
        leftContainer={left}
        rightContainer={right}
        width={800}
        height={600}
      />
    );
    const text = screen.getByTestId("container-comparison").textContent ?? "";
    expect(text).toContain("2 adapters");
    expect(text).toContain("1 adapters");
  });

  it("renders comparison legend", () => {
    const left = createContainer("Root", [createAdapter("A"), createAdapter("B")]);
    const right = createContainer("Child", [createAdapter("B"), createAdapter("C")]);
    render(
      <ContainerComparisonView
        leftContainer={left}
        rightContainer={right}
        width={800}
        height={600}
      />
    );
    const legend = screen.getByTestId("comparison-legend");
    expect(legend.textContent).toContain("Common: 1");
    expect(legend.textContent).toContain("Left only: 1");
    expect(legend.textContent).toContain("Right only: 1");
  });

  it("shows unique ports per side", () => {
    const left = createContainer("Root", [createAdapter("OnlyLeft"), createAdapter("Shared")]);
    const right = createContainer("Child", [createAdapter("Shared"), createAdapter("OnlyRight")]);
    render(
      <ContainerComparisonView
        leftContainer={left}
        rightContainer={right}
        width={800}
        height={600}
      />
    );
    const text = screen.getByTestId("container-comparison").textContent ?? "";
    expect(text).toContain("OnlyLeft");
    expect(text).toContain("OnlyRight");
  });

  it("handles containers with all common ports", () => {
    const left = createContainer("Root", [createAdapter("A"), createAdapter("B")]);
    const right = createContainer("Child", [createAdapter("A"), createAdapter("B")]);
    render(
      <ContainerComparisonView
        leftContainer={left}
        rightContainer={right}
        width={800}
        height={600}
      />
    );
    const legend = screen.getByTestId("comparison-legend");
    expect(legend.textContent).toContain("Common: 2");
    expect(legend.textContent).toContain("Left only: 0");
    expect(legend.textContent).toContain("Right only: 0");
  });
});
