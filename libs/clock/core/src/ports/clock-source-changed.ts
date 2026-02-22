/**
 * ClockSourceChangedSinkPort — receives notifications when the clock source changes.
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";

/** Immutable event emitted when the active clock adapter is replaced. */
export interface ClockSourceChangedEvent {
  readonly _tag: "ClockSourceChanged";
  readonly previousAdapter: string;
  readonly newAdapter: string;
  readonly timestamp: string;
  readonly reason: string;
}

/** Factory for ClockSourceChangedEvent — frozen per GxP error immutability. */
export function createClockSourceChangedEvent(args: {
  readonly previousAdapter: string;
  readonly newAdapter: string;
  readonly timestamp: string;
  readonly reason: string;
}): ClockSourceChangedEvent {
  return Object.freeze({
    _tag: "ClockSourceChanged" as const,
    previousAdapter: args.previousAdapter,
    newAdapter: args.newAdapter,
    timestamp: args.timestamp,
    reason: args.reason,
  });
}

/** Service interface for ClockSourceChangedSinkPort. */
export interface ClockSourceChangedSinkService {
  readonly onClockSourceChanged: (event: ClockSourceChangedEvent) => void;
}

/** Injectable sink port for clock source change notifications. */
export const ClockSourceChangedSinkPort = port<ClockSourceChangedSinkService>()({
  name: "ClockSourceChangedSink",
  direction: "outbound",
  description: "Sink for clock source change notifications",
  category: "clock/source-changed",
  tags: ["clock", "events", "gxp"],
});
