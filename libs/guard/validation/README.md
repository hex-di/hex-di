# @hex-di/guard-validation

GxP validation protocols (IQ/OQ/PQ) and traceability matrix generation for `@hex-di/guard`. Provides programmatic qualification runners that produce structured evidence for regulated environments.

## Features

- **Installation Qualification (IQ)** -- verifies package installation, Node.js version, subpath exports, and peer dependencies
- **Operational Qualification (OQ)** -- verifies policy evaluation correctness, API export presence, error types, and mutation score thresholds
- **Performance Qualification (PQ)** -- benchmarks evaluation latency (p50/p95/p99), memory overhead, and concurrent evaluation determinism
- **Traceability matrix** -- maps requirements to source modules, test files, and coverage status with filtering support
- **Structured evidence** -- every protocol returns typed `ValidationResult` with step-by-step evidence and failure details

## Background

In GxP-regulated environments (pharmaceutical, biotech, medical devices), computerized systems must be validated through a qualification lifecycle:

| Protocol                            | Purpose                                                                       |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| **IQ** (Installation Qualification) | Confirms the software is installed correctly and all dependencies are present |
| **OQ** (Operational Qualification)  | Confirms the software operates correctly under expected conditions            |
| **PQ** (Performance Qualification)  | Confirms the software performs reliably under realistic workloads             |

These protocols produce auditable evidence for regulatory compliance (FDA 21 CFR Part 11, EU GMP Annex 11, GAMP 5).

## Installation

```bash
pnpm add @hex-di/guard-validation
```

Dependencies: `@hex-di/guard`

## Quick Start

```typescript
import { runIQ, runOQ, runPQ, generateTraceabilityMatrix } from "@hex-di/guard-validation";

// Run all three qualification protocols
const iq = runIQ({ packageName: "@hex-di/guard" });
const oq = runOQ({ mutationScore: 92, totalTestsPassed: 150 });
const pq = runPQ({ maxP99LatencyMs: 10 });

console.log(`IQ: ${iq.passed ? "PASS" : "FAIL"} (${iq.steps.length} steps)`);
console.log(`OQ: ${oq.passed ? "PASS" : "FAIL"} (${oq.steps.length} steps)`);
console.log(`PQ: ${pq.passed ? "PASS" : "FAIL"} (${pq.steps.length} steps)`);

// Generate traceability matrix
const matrix = generateTraceabilityMatrix();
console.log(`${matrix.coveragePercent}% of requirements covered`);
```

## Installation Qualification (IQ)

Verifies that `@hex-di/guard` is installed correctly and the environment meets requirements.

```typescript
import { runIQ } from "@hex-di/guard-validation";

const result = runIQ({
  packageName: "@hex-di/guard",
  minNodeVersion: "18.0.0",
  expectedExports: ["."],
});

// result.passed — overall pass/fail
// result.steps — individual verification steps with evidence
// result.evidence — IQEvidence with package/version details
// result.failedSteps — only the steps that failed
```

**Verification steps**: package name resolution, Node.js version check, core module importability, subpath exports verification, peer dependency presence.

## Operational Qualification (OQ)

Verifies that the guard system operates correctly under expected conditions.

```typescript
import { runOQ } from "@hex-di/guard-validation";

const result = runOQ({
  mutationScore: 92,
  mutationScoreThreshold: 80,
  totalTestsPassed: 150,
  totalTestsFailed: 0,
  expectedTestCount: 150,
  verifiedDodItems: ["DoD-001", "DoD-002"],
});

// result.evidence — OQEvidence with test counts and mutation score
```

**Verification steps**: policy evaluation correctness (allow and deny), API export presence, signature export accessibility, error type availability, mutation score threshold, DoD item verification, test count completeness.

## Performance Qualification (PQ)

Benchmarks the guard system under realistic workloads.

```typescript
import { runPQ } from "@hex-di/guard-validation";

const result = runPQ({
  maxP95LatencyMs: 5,
  maxP99LatencyMs: 10,
  benchmarkIterations: 1000,
  integrationTestsPassed: true,
});

// result.evidence.evaluationLatency — { p50, p95, p99 } in ms
// result.evidence.memoryOverheadBytes — heap overhead for 100 policies
```

**Verification steps**: p95/p99 latency thresholds, memory overhead for policy objects, integration test status, concurrent evaluation determinism.

## Traceability Matrix

Maps requirements to source modules, test files, and coverage status. Supports filtering by requirement pattern and test type.

```typescript
import { generateTraceabilityMatrix } from "@hex-di/guard-validation";

// Full matrix
const matrix = generateTraceabilityMatrix();

// Filter by requirement pattern
const guardOnly = generateTraceabilityMatrix({
  requirementPattern: "REQ-GUARD-.*",
});

// Filter by test type
const gxpTests = generateTraceabilityMatrix({
  testTypes: ["gxp"],
});

// Inspect the matrix
for (const row of matrix.rows) {
  console.log(`${row.requirementId}: ${row.status} (${row.testType})`);
}
```

## API Reference

### Protocol Runners

| Export            | Kind     | Description                             |
| ----------------- | -------- | --------------------------------------- |
| `runIQ(options)`  | function | Run Installation Qualification protocol |
| `runOQ(options?)` | function | Run Operational Qualification protocol  |
| `runPQ(options?)` | function | Run Performance Qualification protocol  |

### Traceability

| Export                                 | Kind     | Description                                 |
| -------------------------------------- | -------- | ------------------------------------------- |
| `generateTraceabilityMatrix(options?)` | function | Generate a requirements traceability matrix |

### Types

| Export                 | Kind | Description                                         |
| ---------------------- | ---- | --------------------------------------------------- |
| `ValidationStepResult` | type | Result of a single qualification step               |
| `ValidationResult`     | type | Complete result with steps, evidence, and timestamp |
| `IQEvidence`           | type | Evidence from Installation Qualification            |
| `IQResult`             | type | `ValidationResult<IQEvidence>`                      |
| `OQEvidence`           | type | Evidence from Operational Qualification             |
| `OQResult`             | type | `ValidationResult<OQEvidence>`                      |
| `PQEvidence`           | type | Evidence from Performance Qualification             |
| `PQResult`             | type | `ValidationResult<PQEvidence>`                      |
| `TraceabilityRow`      | type | A single row in the traceability matrix             |
| `TraceabilityMatrix`   | type | Complete traceability matrix report                 |
| `TraceabilityOptions`  | type | Filtering options for matrix generation             |
| `IQOptions`            | type | Options for `runIQ()`                               |
| `OQOptions`            | type | Options for `runOQ()`                               |
| `PQOptions`            | type | Options for `runPQ()`                               |

## Related Packages

| Package                 | Description                                                   |
| ----------------------- | ------------------------------------------------------------- |
| `@hex-di/guard`         | Core guard library: permissions, roles, policies, evaluation  |
| `@hex-di/guard-testing` | Test utilities: memory adapters, fixtures, conformance suites |
| `@hex-di/guard-react`   | React integration: `SubjectProvider`, `Can`/`Cannot`, hooks   |

## License

MIT
