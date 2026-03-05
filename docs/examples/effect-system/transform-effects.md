# Transform Effects

Demonstrates `transformEffects` — a free function that applies effect handlers to a Result, removing handled error types from the error union.

**Domain:** Multi-tenant SaaS file processing — handle tenant-specific errors differently.

## Code

```typescript
import { ok, err, type Result, transformEffects, type EffectHandler } from "@hex-di/result";

// --- Domain errors ---
type QuotaExceeded = {
  readonly _tag: "QuotaExceeded";
  readonly tenantId: string;
  readonly limit: number;
};
type FileCorrupted = {
  readonly _tag: "FileCorrupted";
  readonly fileName: string;
  readonly checksum: string;
};
type PermissionDenied = { readonly _tag: "PermissionDenied"; readonly resource: string };

type FileProcessError = QuotaExceeded | FileCorrupted | PermissionDenied;

// --- Effect handlers ---
const quotaHandler: EffectHandler<QuotaExceeded, string> = Object.freeze({
  _tag: "quotaHandler",
  tags: ["QuotaExceeded"],
  handle(error: QuotaExceeded) {
    return ok(`Queued for retry: tenant ${error.tenantId} exceeded ${error.limit}MB`);
  },
});

const corruptionHandler: EffectHandler<FileCorrupted, string> = Object.freeze({
  _tag: "corruptionHandler",
  tags: ["FileCorrupted"],
  handle(error: FileCorrupted) {
    return ok(`Quarantined: ${error.fileName} (bad checksum: ${error.checksum})`);
  },
});

// --- Simulated file processing ---
function processFile(fileName: string): Result<string, FileProcessError> {
  if (fileName === "huge.zip") return err({ _tag: "QuotaExceeded", tenantId: "t-001", limit: 500 });
  if (fileName === "bad.dat")
    return err({ _tag: "FileCorrupted", fileName: "bad.dat", checksum: "abc123" });
  if (fileName === "secret.doc") return err({ _tag: "PermissionDenied", resource: "secret.doc" });
  return ok(`Processed: ${fileName}`);
}

// --- Apply handlers ---
console.log("--- Handle quota + corruption, leave permission unhandled ---");

const results = ["report.pdf", "huge.zip", "bad.dat", "secret.doc"].map(file => {
  const result = processFile(file);
  // After transformEffects, only PermissionDenied remains in the error type
  const handled = transformEffects(result, quotaHandler, corruptionHandler);
  return { file, handled };
});

for (const { file, handled } of results) {
  console.log(
    `${file}: ${handled._tag === "Ok" ? handled.value : `UNHANDLED: ${handled.error._tag}`}`
  );
}
```

## Key Takeaways

- `transformEffects(result, ...handlers)` applies handlers to errors based on `_tag` matching
- Handled error types are removed from the union via `NarrowedError<E, Tags>`
- Unhandled errors pass through unchanged — the type system tracks which errors remain
- Handlers are tried in order; the first matching handler wins
