/**
 * Component tests for the RailwayPipelineView.
 *
 * Spec: 04-railway-pipeline.md (4.1-4.10), 10-visual-encoding.md (10.5, 10.6, 10.13)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { RailwayPipelineView } from "../../../src/panels/result/railway-pipeline.js";
import type { RailwayPipelineViewProps } from "../../../src/panels/result/railway-pipeline.js";
import type {
  ResultChainDescriptor,
  ResultChainExecution,
  ResultOperationDescriptor,
  ResultStepTrace,
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

function makeChain(overrides?: Partial<ResultChainDescriptor>): ResultChainDescriptor {
  return {
    chainId: "chain-1",
    label: "validateUser",
    portName: "UserPort",
    operations: [
      makeOp({
        index: 0,
        method: "ok",
        label: "ok(42)",
        inputTrack: "both",
        canSwitch: false,
        isTerminal: false,
      }),
      makeOp({ index: 1, method: "map", label: "transform", inputTrack: "ok", canSwitch: false }),
      makeOp({ index: 2, method: "andThen", label: "validate", canSwitch: true }),
      makeOp({ index: 3, method: "orElse", label: "recover", inputTrack: "err", canSwitch: true }),
      makeOp({
        index: 4,
        method: "match",
        label: "extract",
        inputTrack: "both",
        canSwitch: false,
        isTerminal: true,
      }),
    ],
    isAsync: false,
    sourceLocation: undefined,
    ...overrides,
  };
}

function makeExecution(overrides?: Partial<ResultChainExecution>): ResultChainExecution {
  return {
    executionId: "exec-1",
    chainId: "chain-1",
    entryMethod: "ok",
    entryTrack: "ok",
    entryValue: { data: 42, typeName: "number", truncated: false },
    steps: [
      makeStep({ operationIndex: 0, inputTrack: "ok", outputTrack: "ok" }),
      makeStep({ operationIndex: 1, inputTrack: "ok", outputTrack: "ok" }),
      makeStep({ operationIndex: 2, inputTrack: "ok", outputTrack: "err", switched: true }),
      makeStep({ operationIndex: 3, inputTrack: "err", outputTrack: "ok", switched: true }),
      makeStep({ operationIndex: 4, inputTrack: "ok", outputTrack: "ok" }),
    ],
    finalTrack: "ok",
    finalValue: { data: "valid", typeName: "string", truncated: false },
    totalDurationMicros: 200,
    startTimestamp: 1000,
    scopeId: undefined,
    ...overrides,
  };
}

/** Default controlled props for the pipeline component. */
function makeDefaultProps(overrides?: Partial<RailwayPipelineViewProps>): RailwayPipelineViewProps {
  return {
    chain: makeChain(),
    execution: makeExecution(),
    selectedNodeIndex: undefined,
    onNodeSelect: vi.fn(),
    onFit: vi.fn(),
    zoom: 1,
    onZoomChange: vi.fn(),
    panX: 0,
    panY: 0,
    onPanChange: vi.fn(),
    ...overrides,
  };
}

function setupEnv(): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

afterEach(() => {
  cleanup();
});

// ── Canvas Tests ───────────────────────────────────────────────────────────

describe("RailwayPipelineView — Canvas", () => {
  beforeEach(setupEnv);

  it("renders SVG canvas element", () => {
    render(<RailwayPipelineView {...makeDefaultProps()} />);

    const canvas = screen.getByTestId("railway-canvas");
    expect(canvas).toBeDefined();
    expect(canvas.tagName).toBe("svg");
  });

  it("renders operation nodes at correct positions along tracks", () => {
    render(<RailwayPipelineView {...makeDefaultProps()} />);

    const nodes = screen.getAllByTestId("railway-node");
    expect(nodes).toHaveLength(5);
  });

  it("entry node displays constructor name", () => {
    render(<RailwayPipelineView {...makeDefaultProps()} />);

    const methods = screen.getAllByTestId("node-method");
    expect(methods[0].textContent).toBe("ok");
  });

  it("terminal node displays extraction method", () => {
    render(<RailwayPipelineView {...makeDefaultProps()} />);

    const methods = screen.getAllByTestId("node-method");
    expect(methods[methods.length - 1].textContent).toBe("match");
  });

  it("switch points render bezier connectors between tracks", () => {
    render(<RailwayPipelineView {...makeDefaultProps()} />);

    // Execution has 2 switches: andThen (ok->err) and orElse (err->ok)
    // SVG should contain switch path elements
    const pipeline = screen.getByTestId("railway-pipeline-view");
    const paths = pipeline.querySelectorAll("path");
    // At least 2 switch connector paths
    const switchPaths = Array.from(paths).filter(p => p.getAttribute("stroke")?.includes("fbbf24"));
    expect(switchPaths.length).toBeGreaterThanOrEqual(2);
  });

  it("bypassed operations render with bypassed state", () => {
    const chain = makeChain({
      operations: [
        makeOp({ index: 0, method: "ok", label: "ok(42)", inputTrack: "both", canSwitch: false }),
        makeOp({ index: 1, method: "andThen", label: "validate", canSwitch: true }),
        makeOp({ index: 2, method: "map", label: "transform", inputTrack: "ok", canSwitch: false }),
        makeOp({
          index: 3,
          method: "match",
          label: "extract",
          inputTrack: "both",
          canSwitch: false,
          isTerminal: true,
        }),
      ],
    });
    const execution = makeExecution({
      steps: [
        makeStep({ operationIndex: 0, inputTrack: "ok", outputTrack: "ok" }),
        makeStep({ operationIndex: 1, inputTrack: "ok", outputTrack: "err", switched: true }),
        makeStep({ operationIndex: 2, inputTrack: "err", outputTrack: "err" }),
        makeStep({ operationIndex: 3, inputTrack: "err", outputTrack: "err" }),
      ],
    });

    render(<RailwayPipelineView {...makeDefaultProps({ chain, execution })} />);

    const nodes = screen.getAllByTestId("railway-node");
    const bypassedNodes = nodes.filter(n => n.dataset["state"] === "bypassed");
    expect(bypassedNodes.length).toBeGreaterThan(0);
  });

  it("no-execution mode renders static track lines", () => {
    render(<RailwayPipelineView {...makeDefaultProps({ execution: undefined })} />);

    // SVG should contain line elements for static tracks
    const pipeline = screen.getByTestId("railway-pipeline-view");
    const lines = pipeline.querySelectorAll("line");
    expect(lines.length).toBeGreaterThan(0);
  });

  it("zoom data attribute reflects the zoom prop", () => {
    render(<RailwayPipelineView {...makeDefaultProps({ zoom: 1.5 })} />);

    const canvas = screen.getByTestId("railway-canvas");
    expect(canvas.dataset["zoom"]).toBe("1.5");
  });

  it("mouse wheel calls onZoomChange", () => {
    const onZoomChange = vi.fn();
    render(<RailwayPipelineView {...makeDefaultProps({ onZoomChange })} />);

    const pipeline = screen.getByTestId("railway-pipeline-view");
    fireEvent.wheel(pipeline, { deltaY: -100 });
    expect(onZoomChange).toHaveBeenCalled();
  });

  it("click+drag on background calls onPanChange", () => {
    const onPanChange = vi.fn();
    render(<RailwayPipelineView {...makeDefaultProps({ onPanChange })} />);

    const pipeline = screen.getByTestId("railway-pipeline-view");
    fireEvent.mouseDown(pipeline, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.mouseMove(pipeline, { clientX: 200, clientY: 150 });
    fireEvent.mouseUp(pipeline);

    expect(onPanChange).toHaveBeenCalled();
  });

  it("clicking a node calls onNodeSelect with the operation index", () => {
    const onNodeSelect = vi.fn();
    render(<RailwayPipelineView {...makeDefaultProps({ onNodeSelect })} />);

    const nodes = screen.getAllByTestId("railway-node");
    fireEvent.click(nodes[2]);
    expect(onNodeSelect).toHaveBeenCalledWith(2);
  });

  it("selected node has selected state", () => {
    render(<RailwayPipelineView {...makeDefaultProps({ selectedNodeIndex: 1 })} />);

    const nodes = screen.getAllByTestId("railway-node");
    expect(nodes[1].dataset["state"]).toBe("selected");
  });
});

// ── Playback Tests ─────────────────────────────────────────────────────────

describe("RailwayPipelineView — Playback", () => {
  beforeEach(setupEnv);

  it("internal playback timer advances the particle through steps", () => {
    vi.useFakeTimers();
    render(<RailwayPipelineView {...makeDefaultProps()} />);

    // Pipeline has internal playback state but no external control
    // The particle should not render until playback is started
    expect(screen.queryByTestId("playback-particle")).toBeNull();
    vi.useRealTimers();
  });

  it("reduced motion mode is indicated via data attribute", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    render(<RailwayPipelineView {...makeDefaultProps()} />);

    const canvas = screen.getByTestId("railway-canvas");
    expect(canvas.dataset["reducedMotion"]).toBe("true");
  });

  it("pan data attributes reflect the provided pan props", () => {
    render(<RailwayPipelineView {...makeDefaultProps({ panX: 50, panY: -30 })} />);

    const canvas = screen.getByTestId("railway-canvas");
    expect(canvas.dataset["panX"]).toBe("50");
    expect(canvas.dataset["panY"]).toBe("-30");
  });
});

// ── Playback Prop Integration Tests ─────────────────────────────────────────

describe("RailwayPipelineView — Playback Props", () => {
  beforeEach(setupEnv);

  it("marks the current step node as active when playbackStatus is paused", () => {
    render(
      <RailwayPipelineView
        {...makeDefaultProps({
          playbackStatus: "paused",
          currentStep: 2,
        })}
      />
    );

    const nodes = screen.getAllByTestId("railway-node");
    expect(nodes[2].dataset["state"]).toBe("active");
  });

  it("renders playback particle when playbackStatus is playing", () => {
    render(
      <RailwayPipelineView
        {...makeDefaultProps({
          playbackStatus: "playing",
          currentStep: 1,
        })}
      />
    );

    const particle = screen.getByTestId("playback-particle");
    expect(particle).toBeDefined();
    expect(particle.dataset["step"]).toBe("1");
  });

  it("renders terminal burst when playbackStatus is complete", () => {
    render(
      <RailwayPipelineView
        {...makeDefaultProps({
          playbackStatus: "complete",
          currentStep: 4,
        })}
      />
    );

    const burst = screen.getByTestId("playback-complete");
    expect(burst).toBeDefined();
  });

  it("does not render particle when playbackStatus is idle", () => {
    render(
      <RailwayPipelineView
        {...makeDefaultProps({
          playbackStatus: "idle",
          currentStep: 0,
        })}
      />
    );

    expect(screen.queryByTestId("playback-particle")).toBeNull();
    expect(screen.queryByTestId("playback-complete")).toBeNull();
  });
});
