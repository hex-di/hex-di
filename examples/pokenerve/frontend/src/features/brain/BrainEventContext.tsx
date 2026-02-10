/**
 * Brain Event Context for sharing a single inspector subscription
 * across all Brain View panels.
 *
 * Instead of each panel subscribing independently, this context
 * establishes one subscription and distributes events via React context.
 *
 * @packageDocumentation
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useInspector } from "@hex-di/react";
import type { InspectorEvent } from "@hex-di/core";
import { RingBuffer } from "./utils/ring-buffer.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ResolutionEvent {
  readonly id: number;
  readonly portName: string;
  readonly duration: number;
  readonly isCacheHit: boolean;
  readonly timestamp: number;
  readonly status: "ok" | "error";
}

interface BrainEventState {
  readonly recentResolutions: readonly ResolutionEvent[];
  readonly resolvedPortNames: ReadonlySet<string>;
  readonly eventVersion: number;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const BrainEventContext = createContext<BrainEventState | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface BrainEventProviderProps {
  readonly children: ReactNode;
}

function BrainEventProvider({ children }: BrainEventProviderProps): ReactNode {
  const inspector = useInspector();
  const bufferRef = useRef(new RingBuffer<ResolutionEvent>(500));
  const resolvedSetRef = useRef(new Set<string>());
  const idCounterRef = useRef(0);
  const [eventVersion, setEventVersion] = useState(0);

  const processEvent = useCallback((event: InspectorEvent) => {
    if (event.type === "resolution") {
      idCounterRef.current += 1;
      const entry: ResolutionEvent = {
        id: idCounterRef.current,
        portName: event.portName,
        duration: event.duration,
        isCacheHit: event.isCacheHit,
        timestamp: Date.now(),
        status: "ok",
      };
      bufferRef.current.push(entry);
      resolvedSetRef.current.add(event.portName);
      setEventVersion(v => v + 1);
    } else if (event.type === "result:err") {
      idCounterRef.current += 1;
      const entry: ResolutionEvent = {
        id: idCounterRef.current,
        portName: event.portName,
        duration: 0,
        isCacheHit: false,
        timestamp: event.timestamp,
        status: "error",
      };
      bufferRef.current.push(entry);
      setEventVersion(v => v + 1);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = inspector.subscribe(processEvent);
    return unsubscribe;
  }, [inspector, processEvent]);

  const state: BrainEventState = {
    recentResolutions: bufferRef.current.toArray(),
    resolvedPortNames: resolvedSetRef.current,
    eventVersion,
  };

  return <BrainEventContext.Provider value={state}>{children}</BrainEventContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

function useBrainEvents(): BrainEventState {
  const context = useContext(BrainEventContext);
  if (context === null) {
    throw new Error("useBrainEvents must be used within a BrainEventProvider");
  }
  return context;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { BrainEventProvider, useBrainEvents };
export type { ResolutionEvent, BrainEventState };
