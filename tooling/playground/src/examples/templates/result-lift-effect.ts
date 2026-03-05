/**
 * Result: Lift Effects
 *
 * Demonstrates LiftEffect — adding new effects to a Result's error type
 * as computations pass through middleware layers.
 * Scenario: IoT telemetry middleware chain where each layer introduces failures.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import {
  ok, err, type Result,
  type LiftEffect, type EffectOf,
} from "@hex-di/result";

// --- Base telemetry errors ---
type SensorOffline = { readonly _tag: "SensorOffline"; readonly sensorId: string };
type DataCorrupted = { readonly _tag: "DataCorrupted"; readonly packet: string };

// --- Middleware-introduced errors ---
type RateLimited = { readonly _tag: "RateLimited"; readonly retryAfterMs: number };
type SchemaViolation = { readonly _tag: "SchemaViolation"; readonly field: string; readonly expected: string };

// Type-level: LiftEffect progressively adds error types
// LiftEffect<Result<number, SensorOffline | DataCorrupted>, RateLimited>
//   => Result<number, SensorOffline | DataCorrupted | RateLimited>

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

console.log("\\n--- Sensor offline ---");
console.log(validationMiddleware(rateLimitMiddleware(readSensor("offline"), 50)));

console.log("\\n--- Rate limited ---");
console.log(validationMiddleware(rateLimitMiddleware(readSensor("sensor-1"), 200)));

console.log("\\nLift effect demonstrated.");
`;

export const resultLiftEffect: ExampleTemplate = {
  id: "result-lift-effect",
  title: "Result: Lift Effects",
  description: "LiftEffect, EffectOf — adding effects through middleware layers",
  category: "result",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "health",
};
