/**
 * Result: Mask Effects
 *
 * Demonstrates MaskEffects, LiftEffect, and IsEffectFree —
 * type-level manipulation of a Result's error type.
 * Scenario: modular analytics platform masking internal errors at module boundaries.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import {
  ok, err, type Result,
  type MaskEffects, type LiftEffect, type IsEffectFree,
} from "@hex-di/result";

// --- Internal module errors ---
type CacheStale = { readonly _tag: "CacheStale"; readonly key: string; readonly ageMs: number };
type IndexCorrupted = { readonly _tag: "IndexCorrupted"; readonly index: string };
type QueryTimeout = { readonly _tag: "QueryTimeout"; readonly queryId: string };

type AnalyticsError = CacheStale | IndexCorrupted | QueryTimeout;

// --- Type-level demonstrations (shown via comments) ---
// MaskEffects<Result<number, AnalyticsError>, CacheStale | IndexCorrupted>
//   => Result<number, QueryTimeout>
//
// MaskEffects<Result<number, AnalyticsError>, AnalyticsError>
//   => Result<number, never>
//
// LiftEffect<Result<number, QueryTimeout>, { _tag: "RateLimited" }>
//   => Result<number, QueryTimeout | { _tag: "RateLimited" }>

// --- Runtime: mask internal errors using catchTag ---
function queryAnalytics(metric: string): Result<number, AnalyticsError> {
  if (metric === "stale") return err({ _tag: "CacheStale", key: metric, ageMs: 60000 });
  if (metric === "corrupt") return err({ _tag: "IndexCorrupted", index: "metrics_v2" });
  if (metric === "slow") return err({ _tag: "QueryTimeout", queryId: "q-123" });
  return ok(42);
}

// Public API: mask internal errors, expose only QueryTimeout
function publicQuery(metric: string): Result<number, QueryTimeout> {
  return queryAnalytics(metric)
    .catchTag("CacheStale", () => ok(0))
    .catchTag("IndexCorrupted", () => ok(-1));
}

console.log("--- Public API (internal errors handled) ---");
console.log("valid:", publicQuery("pageviews"));
console.log("stale:", publicQuery("stale"));
console.log("corrupt:", publicQuery("corrupt"));
console.log("slow:", publicQuery("slow"));

console.log("\\nMask effects demonstrated.");
`;

export const resultMaskEffects: ExampleTemplate = {
  id: "result-mask-effects",
  title: "Result: Mask Effects",
  description: "MaskEffects, LiftEffect, IsEffectFree — type-level effect manipulation",
  category: "result",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "health",
};
