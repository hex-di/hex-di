/**
 * Result: Utility Methods
 *
 * Demonstrates contains, containsErr, mapOr, mapOrElse, and orDie —
 * additional extraction and assertion methods on Result.
 * Scenario: configuration validation with default fallbacks.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import {
  ok, err, type Result,
} from "@hex-di/result";

// ---------------------------------------------------------------------------
// 1. contains — check if Ok holds a specific value
// ---------------------------------------------------------------------------
console.log("--- 1. contains ---");

const result = ok(42);
console.log("ok(42).contains(42):", result.contains(42));
console.log("ok(42).contains(99):", result.contains(99));
console.log("err('x').contains(42):", err("x").contains(42));

// ---------------------------------------------------------------------------
// 2. containsErr — check if Err holds a specific error
// ---------------------------------------------------------------------------
console.log("\\n--- 2. containsErr ---");

const errResult = err("not found");
console.log("err('not found').containsErr('not found'):", errResult.containsErr("not found"));
console.log("err('not found').containsErr('timeout'):", errResult.containsErr("timeout"));
console.log("ok(42).containsErr('x'):", ok(42).containsErr("x"));

// ---------------------------------------------------------------------------
// 3. mapOr — map with a default value for Err
// ---------------------------------------------------------------------------
console.log("\\n--- 3. mapOr ---");

function getConfig(key: string): Result<string, string> {
  const config: Record<string, string> = { host: "localhost", port: "3000" };
  if (key in config) return ok(config[key]);
  return err(\`missing key: \${key}\`);
}

// mapOr: apply f on Ok, return default on Err
const host = getConfig("host").mapOr("0.0.0.0", v => v.toUpperCase());
console.log("host (found):", host);

const missing = getConfig("database").mapOr("default_db", v => v.toUpperCase());
console.log("database (missing):", missing);

// ---------------------------------------------------------------------------
// 4. mapOrElse — map with a lazy default computed from the error
// ---------------------------------------------------------------------------
console.log("\\n--- 4. mapOrElse ---");

const port = getConfig("port").mapOrElse(
  (error) => \`fallback (reason: \${error})\`,
  (value) => \`port=\${value}\`,
);
console.log("port (found):", port);

const timeout = getConfig("timeout").mapOrElse(
  (error) => \`fallback (reason: \${error})\`,
  (value) => \`timeout=\${value}\`,
);
console.log("timeout (missing):", timeout);

// ---------------------------------------------------------------------------
// 5. orDie — extract Ok value or throw on Err (escape hatch)
// ---------------------------------------------------------------------------
console.log("\\n--- 5. orDie ---");

// orDie on Ok returns the value
const safeValue = ok("hello").orDie();
console.log("ok('hello').orDie():", safeValue);

// orDie on Err throws — catch to demonstrate
try {
  (err("fatal error") as Result<string, string>).orDie();
} catch (e) {
  console.log("err.orDie() threw:", e instanceof Error ? e.message : String(e));
}

// ---------------------------------------------------------------------------
// 6. Combining utilities in a real scenario
// ---------------------------------------------------------------------------
console.log("\\n--- 6. Configuration validation scenario ---");

type ConfigError = { readonly _tag: "ConfigError"; readonly key: string };

function loadConfig(key: string): Result<string, ConfigError> {
  const env: Record<string, string> = { API_URL: "https://api.example.com", DEBUG: "true" };
  if (key in env) return ok(env[key]);
  return err({ _tag: "ConfigError", key });
}

// Check specific values
const isDebug = loadConfig("DEBUG").contains("true");
console.log("DEBUG is true:", isDebug);

// mapOr for defaults
const apiUrl = loadConfig("API_URL").mapOr("http://localhost:8080", v => v);
console.log("API_URL:", apiUrl);

const cacheUrl = loadConfig("CACHE_URL").mapOr("redis://localhost:6379", v => v);
console.log("CACHE_URL (default):", cacheUrl);

// mapOrElse with error context
const dbUrl = loadConfig("DATABASE_URL").mapOrElse(
  (e) => \`sqlite://local.db (missing: \${e.key})\`,
  (v) => v,
);
console.log("DATABASE_URL:", dbUrl);

// containsErr check
const hasConfigError = loadConfig("MISSING").containsErr({ _tag: "ConfigError", key: "MISSING" });
console.log("Has ConfigError for MISSING:", hasConfigError);

console.log("\\nUtility methods demonstrated.");
`;

export const resultUtilities: ExampleTemplate = {
  id: "result-utilities",
  title: "Result: Utility Methods",
  description:
    "contains, containsErr, mapOr, mapOrElse, orDie — extraction and assertion utilities",
  category: "result",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "health",
};
