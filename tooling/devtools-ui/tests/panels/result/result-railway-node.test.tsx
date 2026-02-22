/**
 * Component tests for the RailwayNode operation node.
 *
 * Spec: 04-railway-pipeline.md (4.3), 10-visual-encoding.md (10.5, 10.6)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { RailwayNode } from "../../../src/panels/result/railway-node.js";
import type {
  ResultStepTrace,
  ResultOperationDescriptor,
} from "../../../src/panels/result/types.js";

// ── Fixtures ───────────────────────────────────────────────────────────────

function makeOp(overrides?: Partial<ResultOperationDescriptor>): ResultOperationDescriptor {
  return {
    index: 0,
    method: "andThen",
    label: "validate",
    inputTrack: "ok",
    outputTracks: ["ok", "err"],
    canSwitch: true,
    isTerminal: false,
    callbackLocation: undefined,
    ...overrides,
  };
}

function makeStep(overrides?: Partial<ResultStepTrace>): ResultStepTrace {
  return {
    operationIndex: 0,
    inputTrack: "ok",
    outputTrack: "ok",
    switched: false,
    inputValue: undefined,
    outputValue: undefined,
    durationMicros: 50,
    callbackThrew: false,
    timestamp: 1000,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("RailwayNode", () => {
  it("renders method name in bold mono font", () => {
    render(<RailwayNode operation={makeOp()} step={makeStep()} state="default" />);

    const methodEl = screen.getByTestId("node-method");
    expect(methodEl.textContent).toBe("andThen");
  });

  it("renders label truncated to 12 chars", () => {
    render(
      <RailwayNode
        operation={makeOp({ label: "validateEmailAddress" })}
        step={makeStep()}
        state="default"
      />
    );

    const labelEl = screen.getByTestId("node-label");
    expect(labelEl.textContent).toBe("validateEmai…");
  });

  it("renders category icon with correct color", () => {
    render(
      <RailwayNode operation={makeOp({ method: "andThen" })} step={makeStep()} state="default" />
    );

    const iconEl = screen.getByTestId("node-category-icon");
    expect(iconEl.dataset["category"]).toBe("chaining");
  });

  it("renders track flow badges", () => {
    render(
      <RailwayNode
        operation={makeOp()}
        step={makeStep({ inputTrack: "ok", outputTrack: "err" })}
        state="default"
      />
    );

    const flowEl = screen.getByTestId("node-track-flow");
    expect(flowEl.textContent).toContain("Ok");
    expect(flowEl.textContent).toContain("Err");
  });

  it("renders duration label", () => {
    render(
      <RailwayNode operation={makeOp()} step={makeStep({ durationMicros: 1500 })} state="default" />
    );

    const durationEl = screen.getByTestId("node-duration");
    expect(durationEl.textContent).toContain("1.5ms");
  });

  it("renders lightning badge when switched === true", () => {
    render(
      <RailwayNode operation={makeOp()} step={makeStep({ switched: true })} state="default" />
    );

    expect(screen.getByTestId("node-switch-badge")).toBeDefined();
  });

  it("hovered node shows elevation shadow", () => {
    render(<RailwayNode operation={makeOp()} step={makeStep()} state="hovered" />);

    const node = screen.getByTestId("railway-node");
    expect(node.dataset["state"]).toBe("hovered");
  });

  it("selected node has accent border", () => {
    render(<RailwayNode operation={makeOp()} step={makeStep()} state="selected" />);

    const node = screen.getByTestId("railway-node");
    expect(node.dataset["state"]).toBe("selected");
  });

  it("active (playback) node has glow effect", () => {
    render(<RailwayNode operation={makeOp()} step={makeStep()} state="active" />);

    const node = screen.getByTestId("railway-node");
    expect(node.dataset["state"]).toBe("active");
  });

  it("error switch node has red-muted fill", () => {
    render(
      <RailwayNode
        operation={makeOp()}
        step={makeStep({ switched: true, outputTrack: "err" })}
        state="default"
      />
    );

    const node = screen.getByTestId("railway-node");
    expect(node.dataset["switchType"]).toBe("error");
  });

  it("recovery switch node has green-muted fill", () => {
    render(
      <RailwayNode
        operation={makeOp({ method: "orElse" })}
        step={makeStep({ switched: true, inputTrack: "err", outputTrack: "ok" })}
        state="default"
      />
    );

    const node = screen.getByTestId("railway-node");
    expect(node.dataset["switchType"]).toBe("recovery");
  });

  it("category icon maps correctly for all 9 categories", () => {
    const methodToCategory: [ResultOperationDescriptor["method"], string][] = [
      ["ok", "constructor"],
      ["map", "transformation"],
      ["andThen", "chaining"],
      ["orElse", "recovery"],
      ["inspect", "observation"],
      ["match", "extraction"],
      ["toNullable", "conversion"],
      ["all", "combinator"],
      ["safeTry", "generator"],
    ];

    for (const [method, expectedCategory] of methodToCategory) {
      cleanup();
      render(<RailwayNode operation={makeOp({ method })} step={makeStep()} state="default" />);

      const iconEl = screen.getByTestId("node-category-icon");
      expect(iconEl.dataset["category"]).toBe(expectedCategory);
    }
  });
});
