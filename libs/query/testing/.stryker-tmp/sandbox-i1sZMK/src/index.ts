/**
 * @hex-di/query-testing - Testing utilities for @hex-di/query
 *
 * Provides mock fetchers/executors, spy adapters, and assertion helpers
 * for testing query-based code without network mocking.
 *
 * @packageDocumentation
 */
// @ts-nocheck

// =============================================================================
// Mock Adapters
// =============================================================================

export {
  createMockQueryFetcher,
  createMockMutationExecutor,
  type MockQueryAdapterOptions,
  type MockMutationAdapterOptions,
} from "./mock-adapters.js";

// =============================================================================
// Spy Adapter
// =============================================================================

export {
  createSpyQueryAdapter,
  type SpyCall,
  type SpyQueryAdapterResult,
  createSpyMutationAdapter,
  type SpyMutationCall,
  type SpyMutationAdapterResult,
} from "./spy-adapter.js";

// =============================================================================
// Assertions
// =============================================================================

export {
  expectQueryState,
  expectQueryResult,
  type QueryStateAssertions,
  type QueryResultAssertions,
} from "./assertions.js";

// =============================================================================
// Cache Assertions
// =============================================================================

export { expectCacheEntry, type CacheEntryAssertions } from "./cache-assertions.js";

// =============================================================================
// Test Container
// =============================================================================

export {
  createQueryTestContainer,
  type QueryTestContainerConfig,
  type QueryTestContainer,
} from "./test-container.js";

// =============================================================================
// Test Lifecycle
// =============================================================================

export { useQueryTestContainer, createQueryTestScope } from "./test-lifecycle.js";

// =============================================================================
// React Helpers
// =============================================================================

export {
  createQueryTestWrapperProps,
  createQueryTestWrapper,
  type QueryTestWrapperConfig,
} from "./react-helpers.js";
