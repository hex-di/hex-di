# 06 - Validation Protocol Template

> **Document Control**
>
> | Property | Value |
> |----------|-------|
> | Document ID | GXP-CC-06 |
> | Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/cross-cutting/gxp/06-validation-protocol-template.md` |
> | Status | Effective |
> | Classification | Cross-Cutting GxP Framework |

---

## Purpose

This section defines the IQ/OQ/PQ/DQ validation protocol templates and execution guidance applicable to all `@hex-di` packages deployed in GxP environments. Per-package compliance documents define package-specific protocol steps (e.g., IQ-1 through IQ-N).

---

## Qualification Lifecycle (GAMP 5)

### Protocol Hierarchy

```
DQ (Deployment Qualification)
  └── Verifies infrastructure prerequisites (NTP, TLS, runtime, network)

IQ (Installation Qualification)
  └── Verifies the software is installed correctly and matches the specification

OQ (Operational Qualification)
  └── Verifies the software operates correctly under representative conditions

PQ (Performance Qualification)
  └── Verifies the software performs acceptably under sustained real-world conditions
```

### Execution Order

```
REQUIREMENT: Qualification protocols MUST be executed in the following order:
             DQ → IQ → OQ → PQ. Each phase MUST complete successfully before the
             next phase begins. A failure in any phase MUST halt progression and
             trigger the deviation handling procedure.
```

---

## Deployment Qualification (DQ)

DQ verifies that the infrastructure surrounding the software meets the requirements for correct operation. DQ is a prerequisite for IQ.

### Generic DQ Checklist

| Step | Verification | Expected Result | Evidence |
|------|-------------|-----------------|----------|
| DQ-G1 | Target runtime is installed and at the validated version | Runtime version matches CS | `node --version` or equivalent output |
| DQ-G2 | Operating system is at a supported version | OS version within support window | `uname -a` or equivalent output |
| DQ-G3 | Package manager is installed and at a supported version | Package manager version is documented | `pnpm --version` or equivalent |
| DQ-G4 | Lock file is present and committed to version control | Lock file exists in repository | `ls pnpm-lock.yaml` or equivalent |
| DQ-G5 | Network connectivity to npm registry (if online install) | Registry is reachable | `npm ping` or equivalent |

Per-package compliance documents add package-specific DQ steps (e.g., NTP synchronization for clock, TLS certificates for http-client).

---

## Installation Qualification (IQ)

IQ verifies that the software is installed correctly, the export surface matches the specification, and basic structural integrity holds.

### Generic IQ Template

| Step | Category | Verification | Expected Result |
|------|----------|-------------|-----------------|
| IQ-G1 | Installation | Package installs without errors | Zero npm/pnpm errors |
| IQ-G2 | Version | Installed version matches CS version pin | `package.json` version matches lock file |
| IQ-G3 | Integrity | Package checksum matches published integrity | `npm audit signatures` passes or equivalent |
| IQ-G4 | Export surface | Main entry point exports all documented public APIs | `import * from '@hex-di/<pkg>'` resolves all expected exports |
| IQ-G5 | Dependencies | Production dependency count matches specification | `npm ls --prod` matches documented dependency tree |
| IQ-G6 | TypeScript | Type declarations are present and loadable | `.d.ts` files exist and `tsc --noEmit` succeeds |

Per-package compliance documents extend this with package-specific IQ steps.

---

## Operational Qualification (OQ)

OQ verifies that the software operates correctly under representative conditions, including positive tests (expected behavior), negative tests (error handling), and boundary tests.

### Generic OQ Template

| Step | Category | Verification | Expected Result |
|------|----------|-------------|-----------------|
| OQ-G1 | Positive | Core functionality works as specified | All assertions pass |
| OQ-G2 | Negative | Error cases are handled per specification | Error types match, no silent failures |
| OQ-G3 | Boundary | Boundary conditions are handled correctly | Edge case behavior matches specification |
| OQ-G4 | Concurrency | Concurrent usage produces correct results | No race conditions, no data corruption |
| OQ-G5 | Immutability | Public objects are frozen | `Object.isFrozen()` returns `true` on all public objects |

Per-package compliance documents define specific OQ protocol steps with acceptance criteria.

---

## Performance Qualification (PQ)

PQ verifies that the software performs acceptably under sustained real-world conditions on the specific deployment hardware. PQ uses production-representative load, duration, and data volumes.

### Generic PQ Template

| Step | Category | Verification | Duration | Expected Result |
|------|----------|-------------|----------|-----------------|
| PQ-G1 | Throughput | Operations per second under sustained load | >= 1 hour | Throughput meets documented minimum |
| PQ-G2 | Precision | Data accuracy under sustained load | >= 1 hour | No degradation from OQ baseline |
| PQ-G3 | Memory | Memory usage under sustained operation | >= 4 hours | No unbounded growth (leak detection) |
| PQ-G4 | Consistency | Output consistency over extended operation | >= 4 hours | Zero inconsistencies across all outputs |

Per-package compliance documents define specific PQ protocol steps with acceptance criteria and configurable thresholds.

---

## Protocol Execution Guidance

### Pre-Execution Requirements

```
REQUIREMENT: Before executing any qualification protocol, the following MUST be
             confirmed:

             (a) The executing GxP Validation Engineer has current, non-expired training
                 for the protocol being executed.
             (b) The test environment matches the target deployment environment (same
                 runtime version, OS, hardware class).
             (c) The DQ checklist has been completed and all steps pass.
             (d) The protocol version matches the specification version being validated.
```

### Execution Documentation

```
REQUIREMENT: Each protocol execution MUST produce an execution record containing:

             (a) Protocol identifier and version
             (b) Executor identity (name, role)
             (c) Execution date and time (ISO 8601 UTC)
             (d) Test environment description (runtime version, OS, hardware)
             (e) Per-step results (pass/fail with evidence)
             (f) Overall outcome (pass / fail with deviation references)
             (g) Reviewer identity and approval date
```

### Deviation Handling

```
REQUIREMENT: When a protocol step fails, the executor MUST:

             (a) Document the failure in the deviation log with: step identifier,
                 observed result, expected result, and any error output.
             (b) Halt protocol execution (do NOT proceed to the next step).
             (c) Notify the QA Reviewer within 1 business day.
             (d) Investigate root cause and document findings.
             (e) Implement corrective action and re-execute the failed step.
             (f) If the corrective action affects prior steps, re-execute from the
                 earliest affected step.
```

---

## Re-Qualification Triggers

```
REQUIREMENT: Full or partial re-qualification (IQ/OQ/PQ) MUST be triggered by any
             of the following events:

             (a) Library version upgrade (any version change, including patch)
             (b) Runtime version change (e.g., Node.js LTS upgrade)
             (c) Operating system upgrade or migration
             (d) Hardware platform change
             (e) Infrastructure configuration change affecting library behavior
             (f) Specification revision that changes behavior requirements
             (g) Emergency change control execution (retrospective re-qualification)
```

### Re-Qualification Scope

| Trigger | Minimum Re-Qualification Scope |
|---------|-------------------------------|
| Patch version upgrade (bug fix only) | IQ + targeted OQ for fixed behavior |
| Minor version upgrade (new features) | Full IQ + OQ |
| Major version upgrade (breaking changes) | Full DQ + IQ + OQ + PQ |
| Runtime version change | Full DQ + IQ + OQ + PQ |
| OS/hardware change | Full DQ + IQ + OQ + PQ |
| Infrastructure config change | DQ for changed component + targeted OQ |
| Emergency change | Full IQ + OQ (retrospective, within 30 days) |
