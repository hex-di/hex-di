# Lift Effects

Demonstrates `LiftEffect` — adding new effects to a Result's error type as computations pass through middleware layers.

**Domain:** IoT telemetry middleware chain — each middleware layer can introduce new failure modes.

## Code

```typescript
import {
  ok,
  err,
  type Result,
  type LiftEffect,
  type EffectOf,
  type EffectUnion,
} from "@hex-di/result";

// --- Base telemetry errors ---
type SensorOffline = { readonly _tag: "SensorOffline"; readonly sensorId: string };
type DataCorrupted = { readonly _tag: "DataCorrupted"; readonly packet: string };

// --- Middleware-introduced errors ---
type RateLimited = { readonly _tag: "RateLimited"; readonly retryAfterMs: number };
type SchemaViolation = {
  readonly _tag: "SchemaViolation";
  readonly field: string;
  readonly expected: string;
};
type StorageFull = {
  readonly _tag: "StorageFull";
  readonly usedBytes: number;
  readonly maxBytes: number;
};

// --- Type-level: progressive effect lifting ---
type BaseResult = Result<number, SensorOffline | DataCorrupted>;
type AfterRateLimit = LiftEffect<BaseResult, RateLimited>;
type AfterValidation = LiftEffect<AfterRateLimit, SchemaViolation>;
type AfterStorage = LiftEffect<AfterValidation, StorageFull>;

// AfterStorage = Result<number, SensorOffline | DataCorrupted | RateLimited | SchemaViolation | StorageFull>
type AllEffects = EffectOf<AfterStorage>;

// --- Runtime middleware chain ---
function readSensor(sensorId: string): Result<number, SensorOffline | DataCorrupted> {
  if (sensorId === "offline") return err({ _tag: "SensorOffline", sensorId });
  if (sensorId === "corrupt") return err({ _tag: "DataCorrupted", packet: "0xDEAD" });
  return ok(23.5);
}

function rateLimitMiddleware<T, E>(
  result: Result<T, E>,
  requestsPerSec: number
): Result<T, E | RateLimited> {
  if (result.isErr()) return result;
  if (requestsPerSec > 100) return err({ _tag: "RateLimited", retryAfterMs: 1000 });
  return result;
}

function validationMiddleware<T extends number, E>(
  result: Result<T, E>
): Result<T, E | SchemaViolation> {
  if (result.isErr()) return result;
  if (result.value < -40 || result.value > 85) {
    return err({ _tag: "SchemaViolation", field: "temperature", expected: "-40 to 85" });
  }
  return result;
}

// --- Pipeline ---
console.log("--- Normal reading ---");
const reading = readSensor("sensor-1");
const limited = rateLimitMiddleware(reading, 50);
const validated = validationMiddleware(limited);
console.log(validated);

console.log("\n--- Sensor offline ---");
console.log(validationMiddleware(rateLimitMiddleware(readSensor("offline"), 50)));

console.log("\n--- Rate limited ---");
console.log(validationMiddleware(rateLimitMiddleware(readSensor("sensor-1"), 200)));
```

## Key Takeaways

- `LiftEffect<R, NewEffect>` adds a new error type to the union without affecting the success type
- Each middleware layer can `LiftEffect` to declare the additional failures it may introduce
- `EffectOf<R>` extracts the full accumulated error union at any point in the chain
- This models real middleware chains where each layer introduces its own failure modes
