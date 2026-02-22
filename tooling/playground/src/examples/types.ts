/**
 * Example Template Types
 *
 * Defines the data structures for curated, runnable code samples
 * that demonstrate HexDi patterns in the playground.
 *
 * @packageDocumentation
 */

// =============================================================================
// Category
// =============================================================================

/**
 * Categories for organizing example templates in the dropdown.
 *
 * - `"basics"` — Fundamental DI concepts
 * - `"patterns"` — Common patterns and best practices
 * - `"result"` — @hex-di/result API coverage
 * - `"libraries"` — Library-specific examples (flow, store, query, saga)
 * - `"advanced"` — Complex multi-library composition
 */
export type ExampleCategory = "basics" | "patterns" | "result" | "libraries" | "advanced";

// =============================================================================
// Template
// =============================================================================

/**
 * A curated, runnable code sample for the playground.
 *
 * Each template is a self-contained workspace (one or more files)
 * that compiles and executes to produce meaningful inspector output.
 */
export interface ExampleTemplate {
  /** URL-safe identifier, e.g. "basic-registration" */
  readonly id: string;
  /** Display name, e.g. "Basic Port & Adapter Registration" */
  readonly title: string;
  /** One-line description for the dropdown */
  readonly description: string;
  /** Category for grouping in the dropdown */
  readonly category: ExampleCategory;
  /** path -> content mapping of all files in the example workspace */
  readonly files: ReadonlyMap<string, string>;
  /** Main file to execute (default: "main.ts") */
  readonly entryPoint: string;
  /** Override default 5s timeout */
  readonly timeoutMs?: number;
  /** Panel to show after execution, e.g. "graph" */
  readonly defaultPanel?: string;
}

// =============================================================================
// Registry
// =============================================================================

/**
 * Read-only registry providing access to all example templates.
 */
export interface ExampleRegistryInterface {
  /** Returns all registered example templates */
  getAll(): readonly ExampleTemplate[];
  /** Returns a template by its ID, or undefined if not found */
  getById(id: string): ExampleTemplate | undefined;
  /** Returns all templates in the given category */
  getByCategory(category: ExampleCategory): readonly ExampleTemplate[];
}
