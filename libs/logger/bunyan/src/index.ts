/**
 * @hex-di/logger-bunyan - Bunyan Backend for HexDI Structured Logging
 *
 * This package bridges @hex-di/logger to the Bunyan logging library.
 *
 * @packageDocumentation
 */

export { BunyanHandlerAdapter, createBunyanHandler, type BunyanHandlerOptions } from "./handler.js";
export { mapLevel, type BunyanLevel } from "./level-map.js";
