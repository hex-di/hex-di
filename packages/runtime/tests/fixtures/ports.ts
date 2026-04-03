/**
 * Shared port definitions and service interfaces for runtime tests.
 *
 * These fixtures provide reusable port/adapter definitions that multiple
 * test files can import, reducing duplication across the test suite.
 *
 * @packageDocumentation
 */

import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";

// =============================================================================
// Common Service Interfaces
// =============================================================================

export interface Logger {
  log(message: string): void;
  error?(message: string, error?: unknown): void;
}

export interface Database {
  query(sql: string): unknown;
}

export interface RequestContext {
  requestId: string;
}

export interface Config {
  get(key: string): string;
}

export interface Cache {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
}

// =============================================================================
// Common Port Definitions
// =============================================================================

export const LoggerPort = port<Logger>()({ name: "Logger" });
export const DatabasePort = port<Database>()({ name: "Database" });
export const RequestContextPort = port<RequestContext>()({ name: "RequestContext" });
export const ConfigPort = port<Config>()({ name: "Config" });
export const CachePort = port<Cache>()({ name: "Cache" });

// =============================================================================
// Common Adapter Factories
// =============================================================================

export function createNoopLoggerAdapter() {
  return createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ log: () => {}, error: () => {} }),
  });
}

export function createSpyLoggerAdapter(logSpy = () => {}) {
  return createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ log: logSpy, error: () => {} }),
  });
}

export function createMemoryDatabaseAdapter() {
  return createAdapter({
    provides: DatabasePort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({
      query: (sql: string) => ({ rows: [], sql }),
    }),
  });
}

export function createRequestContextAdapter() {
  return createAdapter({
    provides: RequestContextPort,
    requires: [],
    lifetime: "scoped",
    factory: () => ({
      requestId: `req-${Math.random().toString(36).slice(2)}`,
    }),
  });
}

// =============================================================================
// Common Graph Builders
// =============================================================================

export function buildMinimalGraph() {
  return GraphBuilder.create().provide(createNoopLoggerAdapter()).build();
}

export function buildScopedGraph() {
  return GraphBuilder.create()
    .provide(createNoopLoggerAdapter())
    .provide(createRequestContextAdapter())
    .build();
}
