# Mask Effects

Demonstrates `MaskEffects` — type-level removal of specific effects without runtime handling. This is an escape hatch for advanced composition scenarios.

**Domain:** Modular analytics platform — mask internal errors at module boundaries.

## Code

```typescript
import {
  ok,
  err,
  type Result,
  type MaskEffects,
  type LiftEffect,
  type IsEffectFree,
} from "@hex-di/result";

// --- Internal module errors ---
type CacheStale = { readonly _tag: "CacheStale"; readonly key: string; readonly ageMs: number };
type IndexCorrupted = { readonly _tag: "IndexCorrupted"; readonly index: string };
type QueryTimeout = { readonly _tag: "QueryTimeout"; readonly queryId: string };

type AnalyticsError = CacheStale | IndexCorrupted | QueryTimeout;

// --- MaskEffects removes effects at the type level ---
type PublicErrors = MaskEffects<Result<number, AnalyticsError>, CacheStale | IndexCorrupted>;
// = Result<number, QueryTimeout>

type AllMasked = MaskEffects<Result<number, AnalyticsError>, AnalyticsError>;
// = Result<number, never>

type IsPure = IsEffectFree<AllMasked>; // true

// --- LiftEffect adds effects ---
type WithRateLimit = LiftEffect<
  Result<number, QueryTimeout>,
  { readonly _tag: "RateLimited"; readonly retryAfter: number }
>;
// = Result<number, QueryTimeout | { _tag: "RateLimited"; retryAfter: number }>

// --- Runtime: simulate analytics queries ---
function queryAnalytics(metric: string): Result<number, AnalyticsError> {
  if (metric === "stale") return err({ _tag: "CacheStale", key: metric, ageMs: 60000 });
  if (metric === "corrupt") return err({ _tag: "IndexCorrupted", index: "metrics_v2" });
  if (metric === "slow") return err({ _tag: "QueryTimeout", queryId: "q-123" });
  return ok(42);
}

// Mask internal errors at module boundary (runtime: use catchTags or mapErr)
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
```

## Key Takeaways

- `MaskEffects<R, Mask>` removes specified effects from a Result's error type at the type level
- `LiftEffect<R, NewEffect>` adds new effects to a Result's error type
- `IsEffectFree<R>` confirms when all effects have been eliminated
- Use `catchTag`/`catchTags` at runtime to actually handle the masked errors — `MaskEffects` is type-level only
