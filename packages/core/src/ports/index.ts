/**
 * Ports Module
 *
 * Provides the Port type system - typed, branded port tokens for service interfaces.
 * This is the foundational layer of HexDI with zero dependencies.
 *
 * @packageDocumentation
 */

export type { Port, NotAPortError, InferService, InferPortName } from "./types.js";
export { createPort, port } from "./factory.js";
