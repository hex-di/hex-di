/**
 * Pre-built DI adapter for TracerLikePort.
 *
 * Bridges TracerPort to TracerLikePort so that any graph with a TracerPort
 * adapter automatically provides TracerLike to all libraries.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { TracerPort } from "../ports/index.js";
import { TracerLikePort, createTracerLikeAdapter } from "./tracer-like.js";

/**
 * DI adapter that bridges TracerPort to TracerLikePort.
 *
 * Add to your graph with `.provide(tracerLikeAdapter)` — any library
 * that needs a TracerLike can then resolve it from the container.
 */
export const tracerLikeAdapter = createAdapter({
  provides: TracerLikePort,
  requires: [TracerPort],
  lifetime: "singleton",
  factory: deps => createTracerLikeAdapter(deps.Tracer),
});
