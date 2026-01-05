/**
 * Test Dependencies
 *
 * Provides utilities for creating mock dependency objects from port tuples
 * for testing activities.
 *
 * @packageDocumentation
 */

import type { Port, InferPortName, InferService } from "@hex-di/ports";
import type { ResolvedActivityDeps } from "../types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Error thrown when a required mock is missing from the provided mocks object.
 *
 * Provides a descriptive error message including:
 * - The port name that is missing
 * - A list of all required ports
 * - A hint about how to fix the issue
 */
export class MissingMockError extends Error {
  /**
   * The port name that was missing.
   */
  readonly portName: string;

  /**
   * All required port names for the activity.
   */
  readonly requiredPorts: readonly string[];

  constructor(portName: string, requiredPorts: readonly string[]) {
    const message = [
      `Missing mock for required port '${portName}'.`,
      "",
      `Required ports: ${requiredPorts.join(", ") || "(none)"}`,
      "",
      "Provide a mock implementation for this port in the mocks object:",
      `  createTestDeps(requires, {`,
      `    ${portName}: mockImplementation,`,
      `    ...otherMocks,`,
      `  })`,
    ].join("\n");

    super(message);
    this.name = "MissingMockError";
    this.portName = portName;
    this.requiredPorts = requiredPorts;
  }
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Creates a typed mock dependencies object from a requires tuple and partial mocks.
 *
 * This utility validates that all required ports have corresponding mock
 * implementations and returns a fully-typed deps object suitable for
 * testing activities.
 *
 * @typeParam TRequires - The tuple of Port types from the activity's requires
 *
 * @param requires - The activity's requires tuple (array of ports)
 * @param mocks - Partial object containing mock implementations keyed by port name
 *
 * @returns A fully-typed ResolvedActivityDeps object
 *
 * @throws MissingMockError - If any required port does not have a mock provided
 *
 * @remarks
 * - All ports in the requires tuple must have corresponding mocks
 * - Extra mocks (not in requires) are silently ignored
 * - The returned object is frozen to prevent accidental mutation
 * - Type safety ensures mocks match the expected service interface
 *
 * @example Basic usage
 * ```typescript
 * const ApiPort = port<ApiService>()('Api');
 * const LoggerPort = port<Logger>()('Logger');
 *
 * const mockApi: ApiService = {
 *   fetch: vi.fn().mockResolvedValue({ data: 'test' }),
 * };
 *
 * const mockLogger: Logger = {
 *   info: vi.fn(),
 *   warn: vi.fn(),
 * };
 *
 * const deps = createTestDeps([ApiPort, LoggerPort], {
 *   Api: mockApi,
 *   Logger: mockLogger,
 * });
 *
 * // deps is typed as { Api: ApiService; Logger: Logger }
 * ```
 *
 * @example Missing mock throws helpful error
 * ```typescript
 * const deps = createTestDeps([ApiPort, LoggerPort], {
 *   Api: mockApi,
 *   // Logger is missing!
 * });
 *
 * // Throws MissingMockError:
 * // "Missing mock for required port 'Logger'.
 * //
 * // Required ports: Api, Logger
 * //
 * // Provide a mock implementation..."
 * ```
 *
 * @example With activity testing
 * ```typescript
 * const TaskActivity = activity(TaskActivityPort, {
 *   requires: [ApiPort, LoggerPort],
 *   emits: TaskEvents,
 *   execute: async (input, { deps }) => {
 *     const result = await deps.Api.fetch(input.id);
 *     deps.Logger.info('Fetched');
 *     return result;
 *   },
 * });
 *
 * // In test:
 * const deps = createTestDeps(TaskActivity.requires, {
 *   Api: mockApi,
 *   Logger: mockLogger,
 * });
 *
 * const sink = createTestEventSink<typeof TaskEvents>();
 * const signal = createTestSignal();
 *
 * await TaskActivity.execute(input, { deps, sink, signal });
 * ```
 */
export function createTestDeps<TRequires extends readonly Port<unknown, string>[]>(
  requires: TRequires,
  mocks: Partial<ResolvedActivityDeps<TRequires>>
): ResolvedActivityDeps<TRequires> {
  // Extract port names for error reporting
  const requiredPortNames = requires.map(p => p.__portName);

  // Validate all required ports have mocks
  for (const port of requires) {
    const portName = port.__portName;
    const mockKey = portName as keyof typeof mocks;

    if (!(mockKey in mocks) || mocks[mockKey] === undefined) {
      throw new MissingMockError(portName, requiredPortNames);
    }
  }

  // Build the deps object from the requires tuple
  const deps = {} as Record<string, unknown>;

  for (const port of requires) {
    const portName = port.__portName;
    deps[portName] = mocks[portName as keyof typeof mocks];
  }

  // Freeze to prevent accidental mutation
  return Object.freeze(deps) as ResolvedActivityDeps<TRequires>;
}

// =============================================================================
// Type-Safe Mock Builder (Alternative API)
// =============================================================================

/**
 * Type for building mocks from a requires tuple.
 *
 * Maps each port in the requires tuple to its expected mock type.
 */
export type MocksFor<TRequires extends readonly Port<unknown, string>[]> = {
  [P in TRequires[number] as InferPortName<P> & string]: InferService<P>;
};
