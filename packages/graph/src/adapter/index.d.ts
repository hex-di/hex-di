/**
 * Adapter module - Adapter types and factory functions.
 *
 * This module exports types and functions for creating adapters that implement
 * ports. Adapters are the concrete implementations in the hexagonal architecture:
 *
 * - **Adapter type**: Branded type with full contract information
 * - **AdapterConstraint**: Universal constraint for generic adapter handling
 * - **createAdapter**: Factory for sync adapters
 * - **createAsyncAdapter**: Factory for async adapters
 * - **lazyPort**: Creates lazy port tokens for circular dependencies
 *
 * @packageDocumentation
 */
export * from "./types/adapter-types.js";
export * from "./factory.js";
export * from "./service.js";
export * from "./lazy.js";
export * from "./types/adapter-inference.js";
