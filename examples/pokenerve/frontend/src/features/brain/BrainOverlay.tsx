/**
 * Brain View diagnostic overlay.
 *
 * Renders a bottom-anchored resizable overlay displaying real-time DI
 * container diagnostics. Visibility is controlled by the BrainViewContext.
 * The overlay contains 5 tabbed panels with a drag handle for resizing.
 *
 * Panels (Porygon metaphor + technical name):
 *   1. Neural Map (Dependency Graph)
 *   2. Synapse Activity (Trace Waterfall)
 *   3. Memory Banks (Scope Tree)
 *   4. Thought Process (State Machines)
 *   5. Vital Signs (Health Metrics)
 *
 * @packageDocumentation
 */

import { type ReactNode, useCallback, useRef } from "react";
import { useBrainView } from "../../context/BrainViewContext.js";
import type { BrainPanel } from "../../context/BrainViewContext.js";
import { BrainEventProvider } from "./BrainEventContext.js";
import { NeuralMap } from "./panels/NeuralMap.js";
import { SynapseActivity } from "./panels/SynapseActivity.js";
import { MemoryBanks } from "./panels/MemoryBanks.js";
import { ThoughtProcess } from "./panels/ThoughtProcess.js";
import { VitalSigns } from "./panels/VitalSigns.js";
import { QueryCache } from "./panels/QueryCache.js";
import { StoreState } from "./panels/StoreState.js";
import { SagaActivity } from "./panels/SagaActivity.js";

// ---------------------------------------------------------------------------
// Panel metadata
// ---------------------------------------------------------------------------

interface PanelInfo {
  readonly id: BrainPanel;
  readonly porygonLabel: string;
  readonly techLabel: string;
}

const panels: readonly PanelInfo[] = [
  {
    id: "neural-map",
    porygonLabel: "Neural Map",
    techLabel: "Dependency Graph",
  },
  {
    id: "synapse",
    porygonLabel: "Synapse Activity",
    techLabel: "Trace Waterfall",
  },
  {
    id: "memory",
    porygonLabel: "Memory Banks",
    techLabel: "Scope Tree",
  },
  {
    id: "thought",
    porygonLabel: "Thought Process",
    techLabel: "State Machines",
  },
  {
    id: "vitals",
    porygonLabel: "Vital Signs",
    techLabel: "Health Metrics",
  },
  {
    id: "query-cache",
    porygonLabel: "Data Cache",
    techLabel: "Query Cache",
  },
  {
    id: "store-state",
    porygonLabel: "Core Memory",
    techLabel: "Store State",
  },
  {
    id: "saga-activity",
    porygonLabel: "Protocols",
    techLabel: "Saga Activity",
  },
];

// ---------------------------------------------------------------------------
// Panel Content (lazy mounting)
// ---------------------------------------------------------------------------

interface PanelContentProps {
  readonly activePanel: BrainPanel;
}

function PanelContent({ activePanel }: PanelContentProps): ReactNode {
  switch (activePanel) {
    case "neural-map":
      return <NeuralMap />;
    case "synapse":
      return <SynapseActivity />;
    case "memory":
      return <MemoryBanks />;
    case "thought":
      return <ThoughtProcess />;
    case "vitals":
      return <VitalSigns />;
    case "query-cache":
      return <QueryCache />;
    case "store-state":
      return <StoreState />;
    case "saga-activity":
      return <SagaActivity />;
  }
}

// ---------------------------------------------------------------------------
// Drag Handle for resizing
// ---------------------------------------------------------------------------

interface DragHandleProps {
  readonly onDrag: (deltaY: number) => void;
}

function DragHandle({ onDrag }: DragHandleProps): ReactNode {
  const draggingRef = useRef(false);
  const lastYRef = useRef(0);
  const handleRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    lastYRef.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      const delta = lastYRef.current - e.clientY;
      lastYRef.current = e.clientY;
      onDrag(delta);
    },
    [onDrag]
  );

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  return (
    <div
      ref={handleRef}
      className="flex h-2 cursor-ns-resize items-center justify-center bg-gray-900 hover:bg-gray-800"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize Brain View panel"
    >
      <div className="h-0.5 w-12 rounded-full bg-gray-600" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

function BrainOverlay(): ReactNode {
  const { isOpen, activePanel, panelHeight, setActivePanel, toggleBrainView, setPanelHeight } =
    useBrainView();

  const handleDrag = useCallback(
    (deltaY: number) => {
      // deltaY > 0 means dragging up (increase height)
      const viewportHeight = window.innerHeight;
      const deltaPercent = (deltaY / viewportHeight) * 100;
      setPanelHeight(panelHeight + deltaPercent);
    },
    [panelHeight, setPanelHeight]
  );

  if (!isOpen) {
    return null;
  }

  // Convert panelHeight percentage to actual min/max clamped CSS
  const heightStyle = `clamp(200px, ${String(panelHeight)}vh, 80vh)`;

  return (
    <BrainEventProvider>
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col border-t border-pink-500/30 bg-gray-950/98 backdrop-blur-sm"
        style={{ height: heightStyle }}
      >
        {/* Drag handle */}
        <DragHandle onDrag={handleDrag} />

        {/* Header row */}
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-1.5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-pink-400">Brain View</span>
            <span className="rounded-full bg-pink-400/10 px-2 py-0.5 text-xs text-pink-300">
              Diagnostics
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Minimize (close) button */}
            <button
              type="button"
              onClick={toggleBrainView}
              className="rounded border border-gray-700 px-2 py-0.5 text-xs text-gray-400 transition-colors hover:border-gray-600 hover:text-white"
              title="Minimize"
            >
              _
            </button>
            {/* Close button */}
            <button
              type="button"
              onClick={toggleBrainView}
              className="rounded border border-gray-700 px-2 py-0.5 text-xs text-gray-400 transition-colors hover:border-gray-600 hover:text-white"
              title="Close (Ctrl+Shift+B)"
            >
              x
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0.5 border-b border-gray-800 px-4">
          {panels.map(panel => (
            <button
              key={panel.id}
              type="button"
              onClick={() => {
                setActivePanel(panel.id);
              }}
              className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                activePanel === panel.id
                  ? "border-pink-400 text-pink-400"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {panel.porygonLabel}
              <span className="ml-1.5 text-gray-600">({panel.techLabel})</span>
            </button>
          ))}
        </div>

        {/* Active panel content */}
        <div className="flex-1 overflow-hidden">
          <PanelContent activePanel={activePanel} />
        </div>
      </div>
    </BrainEventProvider>
  );
}

export { BrainOverlay };
