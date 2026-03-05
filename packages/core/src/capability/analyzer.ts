/**
 * Capability Analyzer — Ambient Authority Detection.
 *
 * Inspects adapter factory function source code (via `Function.prototype.toString()`)
 * to detect common ambient authority patterns: global variable access, module-level
 * singleton references, `process.env` reads, and direct file system or network access.
 *
 * This analysis is heuristic, not sound. False positives occur when factory source
 * mentions these patterns in string literals or comments. False negatives occur with
 * indirect access (e.g., accessing `process.env` through a helper function).
 *
 * @see {@link https://hex-di.dev/spec/core/behaviors/11-capability-analyzer | BEH-CO-11-001}
 *
 * @packageDocumentation
 */

import type { AmbientAuthorityDetection, AmbientAuthorityKind } from "./types.js";

// =============================================================================
// Pattern Definitions
// =============================================================================

/**
 * A pattern matcher for ambient authority detection.
 * @internal
 */
interface PatternMatcher {
  readonly pattern: RegExp;
  readonly kind: AmbientAuthorityKind;
  readonly confidence: "high" | "medium" | "low";
  readonly identifierExtractor: (match: RegExpExecArray) => string;
}

/**
 * Ordered list of ambient authority pattern matchers.
 *
 * Each matcher is applied to the factory source in order. Multiple matches
 * of the same kind at different positions produce separate detections.
 *
 * @internal
 */
const MATCHERS: ReadonlyArray<PatternMatcher> = Object.freeze([
  // High confidence: process.env / process.argv
  {
    pattern: /\bprocess\.env\b/g,
    kind: "process-env",
    confidence: "high",
    identifierExtractor: () => "process.env",
  },
  {
    pattern: /\bprocess\.argv\b/g,
    kind: "process-env",
    confidence: "high",
    identifierExtractor: () => "process.argv",
  },

  // High confidence: globalThis / window / global property access
  {
    pattern: /\bglobalThis\b\.\w+/g,
    kind: "global-variable",
    confidence: "high",
    identifierExtractor: match => match[0],
  },
  {
    pattern: /\bwindow\b\.\w+/g,
    kind: "global-variable",
    confidence: "high",
    identifierExtractor: match => match[0],
  },
  {
    pattern: /\bglobal\b\.\w+/g,
    kind: "global-variable",
    confidence: "high",
    identifierExtractor: match => match[0],
  },

  // Medium confidence: require(...) or dynamic import(...)
  {
    pattern: /\brequire\s*\(/g,
    kind: "module-singleton",
    confidence: "medium",
    identifierExtractor: () => "require(...)",
  },
  {
    pattern: /\bimport\s*\(/g,
    kind: "module-singleton",
    confidence: "medium",
    identifierExtractor: () => "import(...)",
  },

  // Medium confidence: direct I/O
  {
    pattern: /\bfs\.\w+/g,
    kind: "direct-io",
    confidence: "medium",
    identifierExtractor: match => match[0],
  },
  {
    pattern: /\bnet\.\w+/g,
    kind: "direct-io",
    confidence: "medium",
    identifierExtractor: match => match[0],
  },
  {
    pattern: /\bhttp\.\w+/g,
    kind: "direct-io",
    confidence: "medium",
    identifierExtractor: match => match[0],
  },
  {
    pattern: /\bfetch\s*\(/g,
    kind: "direct-io",
    confidence: "medium",
    identifierExtractor: () => "fetch(...)",
  },

  // Low confidence: Date.now() / new Date()
  {
    pattern: /\bDate\.now\s*\(\)/g,
    kind: "date-now",
    confidence: "low",
    identifierExtractor: () => "Date.now()",
  },
  {
    pattern: /\bnew\s+Date\s*\(/g,
    kind: "date-now",
    confidence: "low",
    identifierExtractor: () => "new Date()",
  },

  // Low confidence: Math.random()
  {
    pattern: /\bMath\.random\s*\(\)/g,
    kind: "math-random",
    confidence: "low",
    identifierExtractor: () => "Math.random()",
  },
]);

// =============================================================================
// Native Code Detection
// =============================================================================

/**
 * Pattern matching native code toString output.
 * @internal
 */
const NATIVE_CODE_PATTERN = /\[native code\]/;

// =============================================================================
// Snippet Extraction
// =============================================================================

/**
 * Extracts a source snippet of approximately 60 characters around a match.
 *
 * @param source - The full factory source string
 * @param matchIndex - The index of the match in the source
 * @param matchLength - The length of the matched text
 * @returns A trimmed snippet of surrounding context
 *
 * @internal
 */
function extractSnippet(source: string, matchIndex: number, matchLength: number): string {
  const snippetRadius = 30;
  const start = Math.max(0, matchIndex - snippetRadius);
  const end = Math.min(source.length, matchIndex + matchLength + snippetRadius);
  return source.slice(start, end).trim();
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Detects ambient authority patterns in an adapter factory function.
 *
 * Analyzes the factory function's source code (obtained via `Function.prototype.toString()`)
 * for known ambient authority patterns using regex matchers.
 *
 * @param factory - The factory function to analyze
 * @returns A frozen array of detections, empty if no patterns found or if the function is native code
 *
 * @example
 * ```typescript
 * const detections = detectAmbientAuthority(
 *   () => ok({ get: (key: string) => process.env[key] })
 * );
 * // [{ kind: "process-env", identifier: "process.env", confidence: "high", sourceSnippet: "..." }]
 * ```
 *
 * @example Clean factory (no ambient authority)
 * ```typescript
 * const detections = detectAmbientAuthority(
 *   (deps) => ok(new Service(deps.DB))
 * );
 * // []
 * ```
 */
export function detectAmbientAuthority(
  factory: (...args: never[]) => unknown
): ReadonlyArray<AmbientAuthorityDetection> {
  const source = Function.prototype.toString.call(factory);

  // Cannot analyze native code
  if (NATIVE_CODE_PATTERN.test(source)) {
    return Object.freeze([]);
  }

  const detections: AmbientAuthorityDetection[] = [];

  for (const matcher of MATCHERS) {
    // Reset regex state for each matcher (global regexes are stateful)
    const regex = new RegExp(matcher.pattern.source, matcher.pattern.flags);
    let match = regex.exec(source);

    while (match !== null) {
      const snippet = extractSnippet(source, match.index, match[0].length);
      detections.push(
        Object.freeze({
          kind: matcher.kind,
          identifier: matcher.identifierExtractor(match),
          confidence: matcher.confidence,
          sourceSnippet: snippet,
        })
      );
      match = regex.exec(source);
    }
  }

  return Object.freeze(detections);
}
