/**
 * Shared test helpers for panel tests.
 *
 * Provides a mock InspectorDataSource and a wrapper that includes
 * DataSourceProvider and ThemeProvider context.
 */

import { vi } from "vitest";
import type {
  ContainerSnapshot,
  ScopeTree,
  ContainerGraphData,
  UnifiedSnapshot,
  AdapterInfo,
  LibraryInspector,
  ResultStatistics,
  InspectorEvent,
} from "@hex-di/core";
import type { InspectorDataSource } from "../../src/data/inspector-data-source.js";
import { DataSourceProvider } from "../../src/context/data-source-context.js";
import { ThemeProvider } from "../../src/theme/theme-provider.js";
import type { ResolvedTheme } from "../../src/panels/types.js";

// =============================================================================
// Fixtures
// =============================================================================

export const baseScopeTree: ScopeTree = {
  id: "root-scope",
  status: "active",
  resolvedCount: 2,
  totalCount: 5,
  children: [
    {
      id: "child-scope-1",
      status: "active",
      resolvedCount: 1,
      totalCount: 3,
      children: [],
      resolvedPorts: ["Logger"],
    },
  ],
  resolvedPorts: ["Database", "UserService"],
};

export const baseSnapshot: ContainerSnapshot = {
  kind: "root",
  containerName: "TestApp",
  phase: "initialized",
  isInitialized: true,
  isDisposed: false,
  asyncAdaptersTotal: 0,
  asyncAdaptersInitialized: 0,
  singletons: [
    { portName: "Logger", resolvedAt: 100, isResolved: true },
    { portName: "Config", resolvedAt: 0, isResolved: false },
  ],
  scopes: baseScopeTree,
};

export const baseGraphData: ContainerGraphData = {
  adapters: [
    {
      portName: "Logger",
      lifetime: "singleton",
      factoryKind: "sync",
      dependencyNames: [],
      origin: "own",
    },
    {
      portName: "Database",
      lifetime: "scoped",
      factoryKind: "sync",
      dependencyNames: ["Logger"],
      origin: "own",
    },
    {
      portName: "UserService",
      lifetime: "transient",
      factoryKind: "sync",
      dependencyNames: ["Database", "Logger"],
      origin: "own",
    },
  ],
  containerName: "TestApp",
  kind: "root",
  parentName: null,
};

export const baseUnifiedSnapshot: UnifiedSnapshot = {
  timestamp: 1000,
  container: baseSnapshot,
  libraries: {
    tracing: { totalSpans: 10, errorCount: 1 },
  },
  registeredLibraries: ["tracing"],
};

export const baseAdapterInfo: readonly AdapterInfo[] = baseGraphData.adapters.map(a => ({
  portName: a.portName,
  lifetime: a.lifetime,
  factoryKind: a.factoryKind,
  dependencyNames: [...a.dependencyNames],
}));

export const baseResultStats: ReadonlyMap<string, ResultStatistics> = new Map([
  [
    "Logger",
    {
      portName: "Logger",
      totalCalls: 10,
      okCount: 9,
      errCount: 1,
      errorRate: 0.1,
      errorsByCode: new Map([["FACTORY_ERROR", 1]]),
      lastError: { code: "FACTORY_ERROR", timestamp: 500 },
    },
  ],
]);

export const baseLibraryInspectors: ReadonlyMap<string, LibraryInspector> = new Map([
  [
    "tracing",
    {
      name: "tracing",
      getSnapshot: () => ({
        totalSpans: 10,
        errorCount: 1,
        averageDuration: 5.2,
        cacheHitRate: 0.6,
      }),
    },
  ],
]);

// =============================================================================
// Mock DataSource
// =============================================================================

export interface MockDataSource extends InspectorDataSource {
  readonly _listeners: Set<(event: InspectorEvent) => void>;
  emit(event: InspectorEvent): void;
}

export function createMockDataSource(): MockDataSource {
  const listeners = new Set<(event: InspectorEvent) => void>();

  return {
    sourceType: "local",
    displayName: "Test",
    _listeners: listeners,

    getSnapshot: vi.fn().mockReturnValue(baseSnapshot),
    getScopeTree: vi.fn().mockReturnValue(baseScopeTree),
    getGraphData: vi.fn().mockReturnValue(baseGraphData),
    getUnifiedSnapshot: vi.fn().mockReturnValue(baseUnifiedSnapshot),
    getAdapterInfo: vi.fn().mockReturnValue(baseAdapterInfo),
    getLibraryInspectors: vi.fn().mockReturnValue(baseLibraryInspectors),
    getAllResultStatistics: vi.fn().mockReturnValue(baseResultStats),

    subscribe(listener: (event: InspectorEvent) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    emit(event: InspectorEvent): void {
      for (const listener of listeners) {
        listener(event);
      }
    },
  };
}

// =============================================================================
// Environment Setup
// =============================================================================

/**
 * Sets up matchMedia and localStorage mocks for tests that use ThemeProvider.
 * Call this in beforeEach().
 */
export function setupTestEnvironment(): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });

  Object.defineProperty(window, "localStorage", {
    writable: true,
    configurable: true,
    value: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(() => null),
    },
  });
}

// =============================================================================
// Wrapper Component
// =============================================================================

interface WrapperProps {
  readonly children: React.ReactNode;
}

export function createWrapper(
  ds: InspectorDataSource,
  theme: ResolvedTheme = "light"
): React.ComponentType<WrapperProps> {
  return function TestWrapper({ children }: WrapperProps): React.ReactElement {
    return (
      <ThemeProvider theme={theme}>
        <DataSourceProvider dataSource={ds}>{children}</DataSourceProvider>
      </ThemeProvider>
    );
  };
}
