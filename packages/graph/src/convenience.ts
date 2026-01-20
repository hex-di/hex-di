/**
 * @hex-di/graph/convenience
 *
 * Convenience helpers that combine port + adapter creation.
 * These intentionally cross hexagonal architecture boundaries for ergonomics.
 *
 * ## When to Use This Subpath
 *
 * Use `@hex-di/graph/convenience` when you want to reduce boilerplate by
 * creating both a port and its adapter in a single call:
 *
 * ```typescript
 * import { defineService } from "@hex-di/graph/convenience";
 *
 * const [LoggerPort, LoggerAdapter] = defineService<'Logger', Logger>('Logger', {
 *   factory: () => new ConsoleLogger(),
 * });
 * ```
 *
 * ## When to Use Separate createPort + createAdapter
 *
 * For strict hexagonal architecture separation, use the main exports:
 *
 * ```typescript
 * import { createAdapter, GraphBuilder } from "@hex-di/graph";
 * import { createPort } from "@hex-di/ports";
 *
 * // Port in domain layer
 * const StoragePort = createPort<'Storage', Storage>('Storage');
 *
 * // Adapter in infrastructure layer
 * const S3Adapter = createAdapter({
 *   provides: StoragePort,
 *   factory: () => new S3StorageImpl(),
 * });
 * ```
 *
 * This separation is recommended when:
 * - A port has multiple adapter implementations
 * - Ports are published as library interfaces
 * - Strict layer separation is required for compliance
 *
 * @packageDocumentation
 */

export { defineService, defineAsyncService } from "./adapter/service.js";
