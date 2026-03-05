/**
 * Result: Transform Effects
 *
 * Demonstrates transformEffects — a free function that applies effect handlers
 * to a Result, removing handled error types from the error union.
 * Scenario: multi-tenant SaaS file processing with tenant-specific error handling.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import {
  ok, err, type Result,
  transformEffects, type EffectHandler,
} from "@hex-di/result";

// --- Domain errors ---
type QuotaExceeded = { readonly _tag: "QuotaExceeded"; readonly tenantId: string; readonly limit: number };
type FileCorrupted = { readonly _tag: "FileCorrupted"; readonly fileName: string; readonly checksum: string };
type PermissionDenied = { readonly _tag: "PermissionDenied"; readonly resource: string };

type FileProcessError = QuotaExceeded | FileCorrupted | PermissionDenied;

// --- Effect handlers ---
const quotaHandler: EffectHandler<QuotaExceeded, string> = Object.freeze({
  _tag: "quotaHandler",
  tags: ["QuotaExceeded"],
  handle(error: QuotaExceeded) {
    return ok(\`Queued for retry: tenant \${error.tenantId} exceeded \${error.limit}MB\`);
  },
});

const corruptionHandler: EffectHandler<FileCorrupted, string> = Object.freeze({
  _tag: "corruptionHandler",
  tags: ["FileCorrupted"],
  handle(error: FileCorrupted) {
    return ok(\`Quarantined: \${error.fileName} (bad checksum: \${error.checksum})\`);
  },
});

// --- Simulated file processing ---
function processFile(fileName: string): Result<string, FileProcessError> {
  if (fileName === "huge.zip") return err({ _tag: "QuotaExceeded", tenantId: "t-001", limit: 500 });
  if (fileName === "bad.dat") return err({ _tag: "FileCorrupted", fileName: "bad.dat", checksum: "abc123" });
  if (fileName === "secret.doc") return err({ _tag: "PermissionDenied", resource: "secret.doc" });
  return ok(\`Processed: \${fileName}\`);
}

// --- Apply handlers: only PermissionDenied remains unhandled ---
console.log("--- Transform effects: handle quota + corruption ---");

for (const file of ["report.pdf", "huge.zip", "bad.dat", "secret.doc"]) {
  const result = processFile(file);
  const handled = transformEffects(result, quotaHandler, corruptionHandler);
  const display = handled._tag === "Ok"
    ? handled.value
    : \`UNHANDLED: \${handled.error._tag}\`;
  console.log(\`\${file}: \${display}\`);
}

console.log("\\nTransform effects demonstrated.");
`;

export const resultTransformEffects: ExampleTemplate = {
  id: "result-transform-effects",
  title: "Result: Transform Effects",
  description: "transformEffects — apply handlers to Results, narrowing the error union",
  category: "result",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "health",
};
