/**
 * Test support utilities for @hex-di/runtime.
 *
 * Re-exports all test utilities for convenient imports.
 *
 * @example
 * ```typescript
 * import {
 *   TestBuilder,
 *   LoggerPort,
 *   createMockLogger,
 *   buildStandardContainer,
 * } from '../support/index.js';
 *
 * const { container } = TestBuilder.create()
 *   .withLogger()
 *   .withDatabase()
 *   .build();
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Fixtures - Ports, Interfaces, Adapters, Mock Factories
// =============================================================================

export {
  // Service interfaces
  type Logger,
  type Database,
  type RequestContext,
  type UserService,
  type CacheService,
  type ConfigService,
  // Mock interfaces
  type LoggerMock,
  type DatabaseMock,
  type CacheServiceMock,
  // Standard ports
  LoggerPort,
  DatabasePort,
  RequestContextPort,
  UserServicePort,
  CacheServicePort,
  ConfigServicePort,
  type StandardPort,
  // Adapter factories
  createLoggerAdapter,
  createDatabaseAdapter,
  createRequestContextAdapter,
  createUserServiceAdapter,
  createCacheServiceAdapter,
  createConfigServiceAdapter,
  // Mock factories
  createMockLogger,
  createMockDatabase,
  createMockCacheService,
  createMockRequestContext,
  // Container presets
  createMinimalContainer,
  createStandardContainer,
  createScopedContainer,
  createUserServiceContainer,
  // Utilities
  generateId,
  generateRequestId,
  resetIdCounter,
  createCountingFactory,
  createSpiedFactory,
} from "./fixtures.js";

// =============================================================================
// Test Builder - Fluent Container Builder
// =============================================================================

export {
  TestBuilder,
  type TestBuilderResult,
  // Quick builder functions
  buildLoggerContainer,
  buildStandardContainer as buildStandardTestContainer,
  buildScopedContainer,
  buildUserServiceContainer,
} from "./test-builder.js";
