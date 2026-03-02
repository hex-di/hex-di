/**
 * Bundled TypeScript type definitions for hex-di packages.
 *
 * At build time, `scripts/bundle-playground-types.ts` extracts `.d.ts` files
 * from each package and embeds them as string constants in `generated-types/`.
 * At runtime, `registerTypeDefinitions()` registers them with Monaco's TypeScript
 * language service so the editor provides autocomplete, type checking, and hover docs.
 *
 * When generated types are not available (e.g. packages not built yet), falls
 * back to placeholder declarations.
 *
 * @see spec/playground/03-code-editor.md Section 12
 */

// ---------------------------------------------------------------------------
// Monaco language types (minimal interface to avoid importing full Monaco)
// ---------------------------------------------------------------------------

/** Minimal interface for Monaco TypeScript defaults. */
interface MonacoTypescriptDefaults {
  addExtraLib(content: string, filePath?: string): void;
}

/** Minimal interface for the Monaco TypeScript language API we need. */
export interface MonacoTypescriptLanguage {
  readonly typescriptDefaults: MonacoTypescriptDefaults;
}

// ---------------------------------------------------------------------------
// Package list
// ---------------------------------------------------------------------------

/** All hex-di packages that have type definitions bundled. */
const PACKAGES = [
  "@hex-di/core",
  "@hex-di/graph",
  "@hex-di/runtime",
  "@hex-di/result",
  "@hex-di/flow",
  "@hex-di/store",
  "@hex-di/query",
  "@hex-di/saga",
  "@hex-di/tracing",
  "@hex-di/logger",
  "@hex-di/guard",
] as const;

/** A hex-di package name for which we provide type definitions. */
export type HexDiPackageName = (typeof PACKAGES)[number];

// ---------------------------------------------------------------------------
// Generated type definitions (with fallback to placeholders)
// ---------------------------------------------------------------------------

import * as generated from "./generated-types/index.js";

const GENERATED_MAP: Readonly<Record<string, string | undefined>> = {
  "@hex-di/core": generated.core,
  "@hex-di/graph": generated.graph,
  "@hex-di/runtime": generated.runtime,
  "@hex-di/result": generated.result,
  "@hex-di/flow": generated.flow,
  "@hex-di/store": generated.store,
  "@hex-di/query": generated.query,
  "@hex-di/saga": generated.saga,
  "@hex-di/tracing": generated.tracing,
  "@hex-di/logger": generated.logger,
  "@hex-di/guard": generated.guard,
};

function placeholderDts(packageName: string): string {
  return `declare module "${packageName}" { /* placeholder — run bundle-playground-types to populate */ }`;
}

/**
 * Build the type definitions map.
 * Uses generated types when available, falling back to placeholders.
 */
function buildTypeDefinitions(): ReadonlyMap<string, string> {
  return new Map<string, string>(
    PACKAGES.map(name => [name, GENERATED_MAP[name] ?? placeholderDts(name)])
  );
}

/**
 * Map of package name to bundled `.d.ts` string content.
 * Populated from generated types (if available) or placeholders.
 */
export const typeDefinitions: ReadonlyMap<string, string> = buildTypeDefinitions();

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register all bundled type definitions with Monaco's TypeScript language
 * service. This enables autocomplete, type checking, and hover documentation
 * for `@hex-di/*` imports in the playground editor.
 *
 * Should be called once during editor initialization.
 *
 * @param ts - The `monaco.languages.typescript` namespace object.
 */
export function registerTypeDefinitions(ts: MonacoTypescriptLanguage): void {
  for (const [packageName, dts] of typeDefinitions) {
    const filePath = `file:///node_modules/${packageName}/index.d.ts`;
    ts.typescriptDefaults.addExtraLib(dts, filePath);
  }
}
