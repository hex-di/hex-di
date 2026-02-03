/**
 * Example 3: Lifetime Management
 *
 * This example demonstrates the three lifetimes (singleton, scoped, transient)
 * and how GraphBuilder prevents captive dependency errors at compile time.
 *
 * Key concepts:
 * - Singleton: One instance for the entire application
 * - Scoped: One instance per scope (e.g., per request)
 * - Transient: New instance every time
 * - Captive dependency: When a longer-lived service captures a shorter-lived one
 */

import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";

// =============================================================================
// Define Services with Different Lifetimes
// =============================================================================

interface AppConfig {
  readonly appName: string;
}

interface RequestContext {
  readonly requestId: string;
  readonly userId: string;
}

interface Logger {
  log(message: string): void;
}

interface AuditService {
  audit(action: string): void;
}

// =============================================================================
// Create Ports
// =============================================================================

const AppConfigPort = port<AppConfig>()({ name: "AppConfig" });
const RequestContextPort = port<RequestContext>()({ name: "RequestContext" });
const LoggerPort = port<Logger>()({ name: "Logger" });
const AuditServicePort = port<AuditService>()({ name: "AuditService" });

// =============================================================================
// Valid Lifetime Combinations
// =============================================================================

// Singleton - lives for the entire application
const AppConfigAdapter = createAdapter({
  provides: AppConfigPort,
  lifetime: "singleton",
  factory: () => ({ appName: "MyApp" }),
});

// Scoped - lives for the duration of a scope (e.g., HTTP request)
const RequestContextAdapter = createAdapter({
  provides: RequestContextPort,
  lifetime: "scoped",
  factory: () => ({
    requestId: Math.random().toString(36).substring(7),
    userId: "user-123",
  }),
});

// Scoped service CAN depend on Singleton (longer-lived)
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  lifetime: "scoped",
  requires: [AppConfigPort], // OK: scoped depends on singleton
  factory: deps => ({
    log: (message: string) => {
      console.log(`[${deps.AppConfig.appName}] ${message}`);
    },
  }),
});

// Scoped service CAN depend on other Scoped services
const AuditServiceAdapter = createAdapter({
  provides: AuditServicePort,
  lifetime: "scoped",
  requires: [LoggerPort, RequestContextPort], // OK: scoped depends on scoped
  factory: deps => ({
    audit: (action: string) => {
      deps.Logger.log(`[${deps.RequestContext.requestId}] Action: ${action}`);
    },
  }),
});

// =============================================================================
// Build Valid Graph
// =============================================================================

const graph = GraphBuilder.create()
  .provide(AppConfigAdapter)
  .provide(RequestContextAdapter)
  .provide(LoggerAdapter)
  .provide(AuditServiceAdapter)
  .build();

console.log("Valid graph with mixed lifetimes built successfully!");

// =============================================================================
// Invalid: Captive Dependency (Compile-Time Error)
// =============================================================================

// This would cause a compile-time error:
//
// const CacheSingletonAdapter = createAdapter({
//   provides: CachePort,
//   lifetime: "singleton",       // Lives forever
//   requires: [RequestContextPort], // But this is per-request!
//   factory: (deps) => ({...}),
// });
//
// Error: "Captive dependency: Singleton 'Cache' cannot depend on Scoped 'RequestContext'"
//
// Why? The singleton would capture the first RequestContext and never update,
// causing bugs where all requests see the same context.

// =============================================================================
// Lifetime Hierarchy Rules
// =============================================================================

console.log(`
Lifetime Hierarchy (longer → shorter):
  1. Singleton (application lifetime)
  2. Scoped (scope/request lifetime)
  3. Transient (no caching)

Valid dependency directions:
  ✓ Singleton → Singleton
  ✓ Scoped → Singleton
  ✓ Scoped → Scoped
  ✓ Transient → anything

Invalid (captive):
  ✗ Singleton → Scoped
  ✗ Singleton → Transient
  ✗ Scoped → Transient
`);
