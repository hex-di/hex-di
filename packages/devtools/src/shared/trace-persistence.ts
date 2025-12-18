/**
 * Trace Persistence Service - Save and restore traces across sessions.
 *
 * Provides platform-specific implementations for persisting trace data:
 * - Browser: localStorage with JSON serialization
 * - TUI: File-based persistence (configurable path)
 *
 * @packageDocumentation
 */

import type { TraceEntry } from "@hex-di/devtools-core";

// =============================================================================
// Persistence Interface
// =============================================================================

/**
 * Contract for trace persistence implementations.
 */
export interface TracePersistenceContract {
  /**
   * Save traces to persistent storage.
   * @param traces - The traces to save
   */
  save(traces: readonly TraceEntry[]): void;

  /**
   * Load traces from persistent storage.
   * @returns The loaded traces, or empty array if none exist
   */
  load(): TraceEntry[];

  /**
   * Clear all persisted traces.
   */
  clear(): void;

  /**
   * Check if persistence is available.
   */
  isAvailable(): boolean;
}

// =============================================================================
// Browser Persistence (localStorage)
// =============================================================================

const BROWSER_STORAGE_KEY = "hex-devtools-traces";
const MAX_PERSISTED_TRACES = 500;

/**
 * Browser-based trace persistence using localStorage.
 *
 * Serializes traces to JSON and stores them in localStorage.
 * Limits the number of persisted traces to prevent storage overflow.
 */
export class BrowserTracePersistence implements TracePersistenceContract {
  private readonly storageKey: string;
  private readonly maxTraces: number;

  constructor(options?: { storageKey?: string; maxTraces?: number }) {
    this.storageKey = options?.storageKey ?? BROWSER_STORAGE_KEY;
    this.maxTraces = options?.maxTraces ?? MAX_PERSISTED_TRACES;
  }

  save(traces: readonly TraceEntry[]): void {
    if (!this.isAvailable()) {
      return;
    }

    try {
      // Limit the number of traces to persist
      const tracesToSave = traces.slice(-this.maxTraces);
      const serialized = JSON.stringify(tracesToSave);
      localStorage.setItem(this.storageKey, serialized);
    } catch (error) {
      // Silently fail if storage is full or unavailable
      console.warn("[HexDI DevTools] Failed to persist traces:", error);
    }
  }

  load(): TraceEntry[] {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const serialized = localStorage.getItem(this.storageKey);
      if (!serialized) {
        return [];
      }

      const parsed = JSON.parse(serialized);
      if (!Array.isArray(parsed)) {
        return [];
      }

      // Validate and reconstruct trace entries
      return parsed.filter(isValidTraceEntry);
    } catch (error) {
      console.warn("[HexDI DevTools] Failed to load persisted traces:", error);
      return [];
    }
  }

  clear(): void {
    if (!this.isAvailable()) {
      return;
    }

    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn("[HexDI DevTools] Failed to clear persisted traces:", error);
    }
  }

  isAvailable(): boolean {
    try {
      const testKey = "__hex_devtools_test__";
      localStorage.setItem(testKey, "1");
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
}

// =============================================================================
// TUI Persistence (File-based)
// =============================================================================

const DEFAULT_TRACE_FILE_PATH = ".hex-devtools-traces.json";

/**
 * Configuration for TUI file-based persistence.
 */
export interface TUITracePersistenceOptions {
  /** Path to the trace file */
  filePath?: string;
  /** Maximum number of traces to persist */
  maxTraces?: number;
  /** File system interface for reading/writing */
  fs?: {
    readFileSync: (path: string, encoding: string) => string;
    writeFileSync: (path: string, data: string) => void;
    existsSync: (path: string) => boolean;
    unlinkSync: (path: string) => void;
  };
}

/**
 * TUI-based trace persistence using file system.
 *
 * Stores traces in a JSON file at a configurable path.
 * Designed for Node.js/terminal environments.
 */
export class TUITracePersistence implements TracePersistenceContract {
  private readonly filePath: string;
  private readonly maxTraces: number;
  private readonly fs: TUITracePersistenceOptions["fs"] | null;

  constructor(options?: TUITracePersistenceOptions) {
    this.filePath = options?.filePath ?? DEFAULT_TRACE_FILE_PATH;
    this.maxTraces = options?.maxTraces ?? MAX_PERSISTED_TRACES;
    this.fs = options?.fs ?? null;
  }

  save(traces: readonly TraceEntry[]): void {
    if (!this.isAvailable()) {
      return;
    }

    try {
      const tracesToSave = traces.slice(-this.maxTraces);
      const serialized = JSON.stringify(tracesToSave, null, 2);
      this.fs!.writeFileSync(this.filePath, serialized);
    } catch (error) {
      console.warn("[HexDI DevTools] Failed to persist traces to file:", error);
    }
  }

  load(): TraceEntry[] {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      if (!this.fs!.existsSync(this.filePath)) {
        return [];
      }

      const content = this.fs!.readFileSync(this.filePath, "utf-8");
      const parsed = JSON.parse(content);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(isValidTraceEntry);
    } catch (error) {
      console.warn("[HexDI DevTools] Failed to load traces from file:", error);
      return [];
    }
  }

  clear(): void {
    if (!this.isAvailable()) {
      return;
    }

    try {
      if (this.fs!.existsSync(this.filePath)) {
        this.fs!.unlinkSync(this.filePath);
      }
    } catch (error) {
      console.warn("[HexDI DevTools] Failed to clear trace file:", error);
    }
  }

  isAvailable(): boolean {
    return this.fs !== null;
  }
}

// =============================================================================
// Trace Persistence Service
// =============================================================================

/**
 * High-level trace persistence service.
 *
 * Provides a unified interface for trace persistence with auto-save
 * and auto-restore capabilities.
 */
export class TracePersistenceService {
  private readonly persistence: TracePersistenceContract;
  private autoSaveEnabled = true;
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly saveDebounceMs = 1000;

  constructor(persistence: TracePersistenceContract) {
    this.persistence = persistence;
  }

  /**
   * Enable or disable auto-save.
   */
  setAutoSave(enabled: boolean): void {
    this.autoSaveEnabled = enabled;
  }

  /**
   * Save traces immediately.
   */
  save(traces: readonly TraceEntry[]): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }
    this.persistence.save(traces);
  }

  /**
   * Save traces with debouncing.
   */
  debouncedSave(traces: readonly TraceEntry[]): void {
    if (!this.autoSaveEnabled) {
      return;
    }

    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    this.saveDebounceTimer = setTimeout(() => {
      this.persistence.save(traces);
      this.saveDebounceTimer = null;
    }, this.saveDebounceMs);
  }

  /**
   * Load persisted traces.
   */
  load(): TraceEntry[] {
    return this.persistence.load();
  }

  /**
   * Clear all persisted traces.
   */
  clear(): void {
    this.persistence.clear();
  }

  /**
   * Check if persistence is available.
   */
  isAvailable(): boolean {
    return this.persistence.isAvailable();
  }
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Type guard to validate a trace entry structure.
 */
function isValidTraceEntry(entry: unknown): entry is TraceEntry {
  if (typeof entry !== "object" || entry === null) {
    return false;
  }

  const e = entry as Record<string, unknown>;

  return (
    typeof e['id'] === "string" &&
    typeof e['portName'] === "string" &&
    (e['lifetime'] === "singleton" || e['lifetime'] === "scoped" || e['lifetime'] === "transient") &&
    typeof e['startTime'] === "number" &&
    typeof e['duration'] === "number" &&
    typeof e['isCacheHit'] === "boolean" &&
    (e['parentId'] === null || typeof e['parentId'] === "string") &&
    Array.isArray(e['childIds']) &&
    (e['scopeId'] === null || typeof e['scopeId'] === "string") &&
    typeof e['order'] === "number" &&
    typeof e['isPinned'] === "boolean"
  );
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates a trace persistence service for the browser environment.
 */
export function createBrowserTracePersistence(
  options?: { storageKey?: string; maxTraces?: number }
): TracePersistenceService {
  return new TracePersistenceService(new BrowserTracePersistence(options));
}

/**
 * Creates a trace persistence service for the TUI environment.
 */
export function createTUITracePersistence(
  options?: TUITracePersistenceOptions
): TracePersistenceService {
  return new TracePersistenceService(new TUITracePersistence(options));
}
