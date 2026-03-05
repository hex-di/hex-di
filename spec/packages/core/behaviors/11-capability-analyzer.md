# 11 — Capability Analyzer

Static and runtime analysis of adapter factories for ambient authority patterns. Adapters should receive all external authority through constructor injection (ports), not through global state, environment variables, or module singletons. See [RES-04](../../../research/RES-04-capability-based-security.md).

## BEH-CO-11-001: Detect Ambient Authority Patterns

The capability analyzer inspects adapter factory function source code (via `Function.prototype.toString()`) to detect common ambient authority patterns: global variable access, module-level singleton references, `process.env` reads, and direct file system or network access.

```ts
type AmbientAuthorityKind =
  | "global-variable"
  | "process-env"
  | "module-singleton"
  | "direct-io"
  | "date-now"
  | "math-random";

interface AmbientAuthorityDetection {
  readonly kind: AmbientAuthorityKind;
  readonly identifier: string;
  readonly confidence: "high" | "medium" | "low";
  readonly sourceSnippet?: string;
}

function detectAmbientAuthority(
  factory: (...args: never[]) => unknown
): ReadonlyArray<AmbientAuthorityDetection>;
```

**Exported from**: `capability/analyzer.ts` (proposed).

**Algorithm**:

1. Obtain the factory function's source via `factory.toString()`
2. Parse the source for known ambient authority patterns using regex matchers:
   a. `process.env` or `process.argv` -> `"process-env"`, confidence `"high"`
   b. `globalThis`, `window`, `global` property access -> `"global-variable"`, confidence `"high"`
   c. `require(...)` or dynamic `import(...)` inside factory body -> `"module-singleton"`, confidence `"medium"`
   d. `fs.`, `net.`, `http.`, `fetch(` without being a dependency parameter -> `"direct-io"`, confidence `"medium"`
   e. `Date.now()`, `new Date()` -> `"date-now"`, confidence `"low"`
   f. `Math.random()` -> `"math-random"`, confidence `"low"`
3. For each detection, extract a source snippet (surrounding 60 characters) for context
4. Return all detections as a frozen array
5. If `factory.toString()` returns `"function () { [native code] }"`, return empty array (cannot analyze)

**Behavior Table**:

| Factory Source Pattern                                      | Detection Kind       | Confidence | Rationale                                       |
| ----------------------------------------------------------- | -------------------- | ---------- | ----------------------------------------------- |
| `() => ok({ url: process.env.API_URL })`                    | `"process-env"`      | `"high"`   | Direct env var read — classic ambient authority |
| `(deps) => ok(new Service(deps.Logger, globalThis.config))` | `"global-variable"`  | `"high"`   | Global state access bypasses DI graph           |
| `() => ok(require("./singleton").instance)`                 | `"module-singleton"` | `"medium"` | Module cache acts as hidden global state        |
| `() => ok({ read: () => fs.readFileSync("/etc/config") })`  | `"direct-io"`        | `"medium"` | File system access without port injection       |
| `() => ok({ id: () => Math.random().toString(36) })`        | `"math-random"`      | `"low"`    | Non-deterministic but rarely a security concern |
| `(deps) => ok(new Service(deps.DB))`                        | (none)               | N/A        | Clean — all authority from injected deps        |

**Example**:

```ts
import { createAdapter, port, SINGLETON, ok, detectAmbientAuthority } from "@hex-di/core";

interface ConfigService {
  get(key: string): string | undefined;
}

const ConfigPort = port<ConfigService>()({ name: "Config", direction: "outbound" });

// Bad: reads process.env directly
const envConfigAdapter = createAdapter({
  provides: [ConfigPort],
  factory: () =>
    ok({
      get: (key: string) => process.env[key],
    }),
  lifetime: SINGLETON,
});

const detections = detectAmbientAuthority(envConfigAdapter.factory);
// [
//   {
//     kind: "process-env",
//     identifier: "process.env",
//     confidence: "high",
//     sourceSnippet: "get: (key) => process.env[key]"
//   }
// ]

// Good: receives config through dependency injection
const injectedConfigAdapter = createAdapter({
  provides: [ConfigPort],
  requires: [EnvPort], // EnvPort wraps process.env as an explicit capability
  factory: deps =>
    ok({
      get: (key: string) => deps.Env.get(key),
    }),
  lifetime: SINGLETON,
});

const cleanDetections = detectAmbientAuthority(injectedConfigAdapter.factory);
// [] — no ambient authority detected
```

**Design notes**:

- `Function.prototype.toString()` is the only reflective mechanism available in standard JavaScript. It is unreliable for minified, transpiled, or native code. The `confidence` field communicates this uncertainty.
- This analysis is heuristic, not sound. False positives occur when factory source mentions these patterns in string literals or comments. False negatives occur with indirect access (e.g., accessing `process.env` through a helper function).
- Follows Miller, Tulloh, and Shapiro (2012): authority must flow through object references, not ambient channels. The analyzer makes ambient authority visible.
- Cross-ref: [BEH-CO-05-001](05-frozen-port-references.md) (frozen capabilities prevent tampering after injection).

## BEH-CO-11-002: Capability Audit Report

The capability analyzer produces a structured audit report for all adapters in a dependency graph, summarizing ambient authority detections per adapter and providing an overall authority hygiene score.

```ts
interface AdapterAuditEntry {
  readonly adapterName: string;
  readonly portName: string;
  readonly detections: ReadonlyArray<AmbientAuthorityDetection>;
  readonly isClean: boolean;
}

interface CapabilityAuditReport {
  readonly entries: ReadonlyArray<AdapterAuditEntry>;
  readonly totalAdapters: number;
  readonly cleanAdapters: number;
  readonly violatingAdapters: number;
  readonly highConfidenceViolations: number;
  readonly summary: string;
}

function auditGraph(graph: DependencyGraph): CapabilityAuditReport;
```

**Exported from**: `capability/audit.ts` (proposed).

**Algorithm**:

1. Iterate over all adapters registered in the dependency graph
2. For each adapter, call `detectAmbientAuthority(adapter.factory)`
3. Construct an `AdapterAuditEntry` with the detections and `isClean: detections.length === 0`
4. Aggregate statistics: total, clean, violating, high-confidence counts
5. Generate a human-readable summary string
6. `Object.freeze()` the entire report
7. Return the report

**Behavior Table**:

| Graph State                      | `totalAdapters` | `cleanAdapters` | `violatingAdapters` | Summary                                                  |
| -------------------------------- | --------------- | --------------- | ------------------- | -------------------------------------------------------- |
| All adapters use DI only         | 5               | 5               | 0                   | `"All 5 adapters pass capability audit"`                 |
| 1 adapter reads `process.env`    | 5               | 4               | 1                   | `"4/5 adapters clean. 1 violation (1 high confidence)"`  |
| 3 adapters with mixed violations | 5               | 2               | 3                   | `"2/5 adapters clean. 3 violations (2 high confidence)"` |
| Empty graph                      | 0               | 0               | 0                   | `"No adapters to audit"`                                 |

**Example**:

```ts
import { GraphBuilder, auditGraph } from "@hex-di/core";

const graph = new GraphBuilder()
  .add(loggerAdapter) // clean
  .add(envConfigAdapter) // reads process.env
  .add(dbAdapter) // clean
  .add(cacheAdapter) // uses globalThis.cache
  .build();

const report = auditGraph(graph);
// {
//   entries: [
//     { adapterName: "loggerAdapter", portName: "Logger", detections: [], isClean: true },
//     { adapterName: "envConfigAdapter", portName: "Config", detections: [{ kind: "process-env", ... }], isClean: false },
//     { adapterName: "dbAdapter", portName: "Database", detections: [], isClean: true },
//     { adapterName: "cacheAdapter", portName: "Cache", detections: [{ kind: "global-variable", ... }], isClean: false },
//   ],
//   totalAdapters: 4,
//   cleanAdapters: 2,
//   violatingAdapters: 2,
//   highConfidenceViolations: 2,
//   summary: "2/4 adapters clean. 2 violations (2 high confidence)"
// }
```

**Design notes**:

- The audit report is designed for CI/CD integration. A pipeline step can run `auditGraph()` and fail the build if `highConfidenceViolations > 0`.
- Inspired by Swasey, Garg, and Dreyer (2017) — compositional verification of capability patterns. The audit verifies each adapter independently, and clean adapters compose into a clean graph.
- The summary string uses a concise format suitable for terminal output and log aggregation.
- Cross-ref: [BEH-CO-11-001](#beh-co-11-001-detect-ambient-authority-patterns), [BEH-CO-11-003](#beh-co-11-003-strict-capability-mode).

## BEH-CO-11-003: Strict Capability Mode

When the container is configured with `strictCapabilities: true`, adapters with high-confidence ambient authority detections are rejected at graph build time. The graph builder refuses to register adapters that bypass the DI graph for external authority.

```ts
interface ContainerConfig {
  readonly strictCapabilities?: boolean;
  readonly capabilityAllowlist?: ReadonlyArray<{
    readonly adapterName: string;
    readonly allowedPatterns: ReadonlyArray<AmbientAuthorityKind>;
  }>;
}

interface CapabilityRejectionError {
  readonly _tag: "CapabilityRejectionError";
  readonly adapterName: string;
  readonly portName: string;
  readonly detections: ReadonlyArray<AmbientAuthorityDetection>;
  readonly blame: BlameContext;
}
```

**Exported from**: `capability/strict.ts` (proposed).

**Algorithm**:

1. When `strictCapabilities: true` is set in container config, enable strict mode
2. During `GraphBuilder.add(adapter)`, run `detectAmbientAuthority` on the adapter factory
3. Filter detections to only `confidence: "high"` entries
4. Check if the adapter is on the `capabilityAllowlist` with matching `allowedPatterns`
5. If high-confidence detections remain after allowlist filtering, reject the adapter:
   a. Construct a `CapabilityRejectionError` with blame context
   b. Return `Err(capabilityRejectionError)` from `GraphBuilder.add()`
6. If no high-confidence detections (or all are allowlisted), accept the adapter

**Behavior Table**:

| `strictCapabilities` | Detection Confidence  | Allowlisted | Outcome                             |
| -------------------- | --------------------- | ----------- | ----------------------------------- |
| `false` (default)    | Any                   | N/A         | Adapter accepted (no analysis)      |
| `true`               | `"high"`              | No          | `Err(CapabilityRejectionError)`     |
| `true`               | `"high"`              | Yes         | Adapter accepted                    |
| `true`               | `"medium"` or `"low"` | N/A         | Adapter accepted (only high blocks) |
| `true`               | None detected         | N/A         | Adapter accepted                    |

**Example**:

```ts
import { GraphBuilder } from "@hex-di/core";

// Strict mode with allowlist
const graph = new GraphBuilder({
  strictCapabilities: true,
  capabilityAllowlist: [{ adapterName: "bootstrapAdapter", allowedPatterns: ["process-env"] }],
})
  .add(loggerAdapter) // OK — no ambient authority
  .add(envConfigAdapter) // REJECTED: process.env access not allowlisted
  .add(bootstrapAdapter) // OK — allowlisted for process-env
  .build();

// envConfigAdapter rejection:
// Err({
//   _tag: "CapabilityRejectionError",
//   adapterName: "envConfigAdapter",
//   portName: "Config",
//   detections: [{ kind: "process-env", confidence: "high", ... }],
//   blame: {
//     adapterFactory: { name: "envConfigAdapter" },
//     portContract: { name: "Config", direction: "outbound" },
//     violationType: { _tag: "ContractViolation", details: "Ambient authority: process.env access" },
//     resolutionPath: []
//   }
// })
```

**Design notes**:

- Strict mode is opt-in to avoid breaking existing codebases. The allowlist provides an escape hatch for legitimate ambient authority (e.g., a bootstrap adapter that reads initial configuration from environment variables).
- Only `"high"` confidence detections trigger rejection. `"medium"` and `"low"` confidence detections are informational only, reducing false positive impact.
- Follows Miller, Yee, and Shapiro (2003) — capabilities are unforgeable and transferable only through explicit delegation. Strict mode enforces that the DI graph is the sole authority delegation mechanism.
- Cross-ref: [BEH-CO-06-001](06-blame-aware-errors.md) (blame context integration), [INV-CO-7](../invariants.md#inv-co-7-factory-errors-flow-through-result) (errors through Result).
