/**
 * Activity Testing Utilities
 *
 * This module provides testing utilities for activities defined with the
 * `activity()` factory. These utilities enable:
 *
 * - Capturing emitted events for assertions
 * - Controlling abort signals for cancellation testing
 * - Creating mock dependency objects from port tuples
 * - High-level test harness with comprehensive result tracking
 *
 * @packageDocumentation
 */

// =============================================================================
// Test Event Sink
// =============================================================================

/**
 * Creates a test event sink that captures emitted events.
 *
 * @example
 * ```typescript
 * const sink = createTestEventSink<typeof TaskEvents>();
 * sink.emit(TaskEvents.PROGRESS(50));
 * expect(sink.events[0]).toEqual({ type: 'PROGRESS', percent: 50 });
 * ```
 *
 * @see {@link TestEventSink} - The return type with events array and clear method
 */
export { createTestEventSink, type TestEventSink } from "./event-sink.js";

// =============================================================================
// Test Signal
// =============================================================================

/**
 * Creates a controllable AbortSignal for testing.
 *
 * @example
 * ```typescript
 * const signal = createTestSignal();
 * signal.abort('User cancelled'); // Immediate abort
 * signal.timeout(100);            // Abort after delay
 * ```
 *
 * @see {@link TestSignal} - The return type with abort and timeout methods
 */
export { createTestSignal, type TestSignal } from "./signal.js";

// =============================================================================
// Test Dependencies
// =============================================================================

/**
 * Creates typed mock dependencies from a requires tuple.
 *
 * @example
 * ```typescript
 * const deps = createTestDeps([ApiPort, LoggerPort], {
 *   Api: mockApi,
 *   Logger: mockLogger,
 * });
 * ```
 *
 * @see {@link MissingMockError} - Thrown when a required mock is missing
 * @see {@link MocksFor} - Type utility for building mock objects
 */
export { createTestDeps, MissingMockError, type MocksFor } from "./deps.js";

// =============================================================================
// Activity Test Harness
// =============================================================================

/**
 * High-level harness for testing activities with comprehensive tracking.
 *
 * @example
 * ```typescript
 * const { result, status, events, cleanupCalled } = await testActivity(TaskActivity, {
 *   input: { taskId: '123' },
 *   deps: { Api: mockApi, Logger: mockLogger },
 * });
 *
 * expect(status).toBe('completed');
 * expect(events).toContainEqual({ type: 'COMPLETED', result: expect.any(Object) });
 * ```
 *
 * @see {@link TestActivityResult} - The return type with result, events, and status
 * @see {@link TestActivityOptions} - Configuration options for the harness
 */
export { testActivity, type TestActivityResult, type TestActivityOptions } from "./harness.js";
