/**
 * CaseSimulator — What-If simulation for Result chain paths.
 *
 * Spec: 06-case-explorer.md (6.5)
 *
 * @packageDocumentation
 */

import { useCallback, useMemo, useState } from "react";
import type { ResultChainDescriptor, ResultPathDescriptor } from "./types.js";

// ── Types ───────────────────────────────────────────────────────────────────

type ForceMode = "auto" | "ok" | "err";

interface SimOpState {
  readonly opIndex: number;
  readonly method: string;
  readonly label: string;
  readonly mode: ForceMode;
}

// ── Props ───────────────────────────────────────────────────────────────────

interface CaseSimulatorProps {
  readonly chain: ResultChainDescriptor;
  readonly paths: readonly ResultPathDescriptor[];
  readonly onApplyToPipeline?: () => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function findMatchingPath(
  paths: readonly ResultPathDescriptor[],
  simTrackSequence: readonly ("ok" | "err")[]
): ResultPathDescriptor | undefined {
  return paths.find(p => {
    if (p.trackSequence.length !== simTrackSequence.length) return false;
    return p.trackSequence.every((t, i) => t === simTrackSequence[i]);
  });
}

function computeSimulatedTrack(
  chain: ResultChainDescriptor,
  opStates: readonly SimOpState[],
  paths: readonly ResultPathDescriptor[]
): readonly ("ok" | "err")[] {
  const track: ("ok" | "err")[] = [];
  let currentTrack: "ok" | "err" = "ok";

  for (const op of chain.operations) {
    const simOp = opStates.find(s => s.opIndex === op.index);
    if (simOp) {
      if (simOp.mode === "ok") {
        currentTrack = "ok";
      } else if (simOp.mode === "err") {
        currentTrack = "err";
      } else {
        // Auto: use most frequent path's outcome at this index
        const bestPath = [...paths].sort((a, b) => b.frequency - a.frequency)[0];
        if (bestPath && bestPath.trackSequence[op.index]) {
          currentTrack = bestPath.trackSequence[op.index];
        }
      }
    }
    track.push(currentTrack);
  }

  return track;
}

// ── Component ───────────────────────────────────────────────────────────────

function CaseSimulator({
  chain,
  paths,
  onApplyToPipeline,
}: CaseSimulatorProps): React.ReactElement {
  const switchCapableOps = useMemo(() => chain.operations.filter(op => op.canSwitch), [chain]);

  const [opStates, setOpStates] = useState<SimOpState[]>(() =>
    switchCapableOps.map(op => ({
      opIndex: op.index,
      method: op.method,
      label: op.label,
      mode: "auto",
    }))
  );

  // ── Simulated track ───────────────────────────────────────────────────

  const simulatedTrack = useMemo(
    () => computeSimulatedTrack(chain, opStates, paths),
    [chain, opStates, paths]
  );

  const matchingPath = useMemo(
    () => findMatchingPath(paths, simulatedTrack),
    [paths, simulatedTrack]
  );

  const isUnobserved = matchingPath ? !matchingPath.observed : true;

  // ── Handlers ──────────────────────────────────────────────────────────

  const setMode = useCallback((opIndex: number, mode: ForceMode) => {
    setOpStates(prev => prev.map(s => (s.opIndex === opIndex ? { ...s, mode } : s)));
  }, []);

  const resetAll = useCallback(() => {
    setOpStates(prev => prev.map(s => ({ ...s, mode: "auto" })));
  }, []);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div data-testid="case-simulator">
      <h3>What-If Simulator</h3>

      {/* Switch-capable operations */}
      {opStates.map(state => (
        <div key={state.opIndex} data-testid="sim-operation">
          <span>
            {state.method}({state.label})
          </span>
          <button
            data-testid="sim-auto"
            onClick={() => setMode(state.opIndex, "auto")}
            aria-pressed={state.mode === "auto"}
          >
            Auto
          </button>
          <button
            data-testid="sim-force-ok"
            onClick={() => setMode(state.opIndex, "ok")}
            aria-pressed={state.mode === "ok"}
          >
            Force Ok
          </button>
          <button
            data-testid="sim-force-err"
            onClick={() => setMode(state.opIndex, "err")}
            aria-pressed={state.mode === "err"}
          >
            Force Err
          </button>
        </div>
      ))}

      {/* Simulated result */}
      <div data-testid="sim-result-path" data-path-id={matchingPath?.pathId}>
        {matchingPath?.description ?? "Unknown path"}
      </div>

      {/* Unobserved warning */}
      {isUnobserved && (
        <div data-testid="sim-unobserved-warning">
          This path has never been observed. Consider adding a test case.
        </div>
      )}

      {/* Actions */}
      <button data-testid="sim-reset-all" onClick={resetAll}>
        Reset All
      </button>
      <button data-testid="sim-apply-pipeline" onClick={onApplyToPipeline}>
        Apply to Pipeline View
      </button>
    </div>
  );
}

export { CaseSimulator };
export type { CaseSimulatorProps };
