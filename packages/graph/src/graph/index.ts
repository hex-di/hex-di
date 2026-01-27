/**
 * Graph module - Dependency graph construction and validation.
 *
 * This module exports the GraphBuilder class and related types for constructing
 * compile-time validated dependency graphs.
 *
 * @packageDocumentation
 */

// Runtime exports
export * from "./inspection/index.js";
export { isGraph } from "./guards.js";

// Type-only exports from types folder
export * from "./types/graph-types.js";
export * from "./types/graph-inference.js";
