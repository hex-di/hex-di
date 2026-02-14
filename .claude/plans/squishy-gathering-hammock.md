# Plan: Fix Clock/Guard Spec Boundary Violation

## Context

The `@hex-di/clock` spec has 168 references to "guard" across 20 files. Much of this content specifies guard-specific behavior (NTP adapter, startup modes, audit bridge, periodic integrity checks, failure modes FM-3-FM-6) that belongs in the guard spec. Meanwhile, the guard spec's `03-clock-synchronization.md` has circular back-references to nonexistent clock spec files. The clock spec should describe **mechanism** (what clock does). The guard spec should describe **policy** (what guard does with the clock) and clearly assert that `@hex-di/clock` is fully GxP compliant.

## Changes

### 1. `spec/clock/07-integration.md` — Major rewrite of section 7.3

**Remove** lines 196-341 (entire section 7.3 "Guard Integration"): `createGuardGraph` examples, NTP startup modes (`fail-fast`/`degraded`/`offline`), NTP Clock Adapter description, Audit Bridge code, ClockSource Bridge code.

**Replace** with a brief (~15 line) cross-reference section:

```markdown
## 7.3 Guard Integration

`@hex-di/guard` depends on `@hex-di/clock` (unidirectional — clock never imports guard). When the guard is active with `gxp: true`, it:

1. Replaces `SystemClockAdapter` with an NTP-validated adapter via standard DI registration.
2. Registers a `ClockSourceChangedSink` to audit the adapter swap.
3. Performs startup validation (NTP sync, resolution, consistency checks).
4. Runs periodic integrity checks on the adapter.

All guard-clock integration behavior — NTP startup modes, the NTP adapter, the audit bridge, and the ClockSource bridge — is specified in `spec/guard/17-gxp-compliance/03-clock-synchronization.md`.
```

**Also edit** lines 46-59 ("Guard Override" subsection): Replace the `createGuardGraph` code example with a brief note that the guard overrides the clock adapter via standard DI registration, with cross-reference to guard spec.

**Also edit** line 96: Move the REQUIREMENT about guard registering a `ClockSourceChangedSink` to the guard spec. Replace with: "GxP deployments using `@hex-di/guard` MUST ensure the guard registers a `ClockSourceChangedSink` implementation. See guard spec for details."

### 2. `spec/clock/06-gxp-compliance/clock-source-requirements.md` — Remove guard coupling

**Remove** lines 46-73 ("Required Guard Version" subsection): `REQUIRED_GUARD_VERSION`, `ClockGxPMetadata.requiredGuardVersion`, `getClockGxPMetadata()`, ST-6 guard co-deployment warning, and the requirement about guard validating clock version. This creates an architectural violation — clock should not be aware of guard.

**Keep** lines 75-103 (Responsibility Boundary + NTP Synchronization Boundary) — these are clean boundary declarations.

**Edit** lines 105-157 (Clock Source Provenance, ClockDiagnosticsPort, Calibration):

- Line 109: Replace "its `NtpClockAdapter` exposes drift diagnostics through the health check API (guard spec section 62)" with "runtime drift diagnostics are available when the guard is deployed. See guard spec."
- Line 142: Replace "The guard's audit bridge SHOULD log `ClockDiagnostics` at startup" with "Consumers (including the guard when deployed) can query diagnostics at startup."
- Line 146: Generalize from guard-specific to: "When any adapter replaces `SystemClockAdapter`, it MUST also register its own `ClockDiagnosticsPort` implementation."

### 3. `spec/clock/06-gxp-compliance/verification-and-change-control.md` — Replace guard-specific section

**Replace** lines 1-21 (Periodic Adapter Integrity Verification) with a brief delegation note:

```markdown
### Periodic Adapter Integrity Verification (EU GMP Annex 11, Section 11)

`@hex-di/clock` provides one-time diagnostics via `ClockDiagnosticsPort.getDiagnostics()` at construction time. Periodic runtime verification of adapter integrity (adapter name consistency, freeze status, monotonicity heartbeat) is the responsibility of `@hex-di/guard`. See `spec/guard/17-gxp-compliance/03-clock-synchronization.md`.

Without `@hex-di/guard`, no periodic integrity checks are performed. GxP deployments MUST deploy `@hex-di/guard` to satisfy Annex 11, Section 11 periodic evaluation requirements.
```

**Keep** lines 23-146 (Change Control, Emergency Change Control, CAPA) — these are clock-owned processes.

### 4. `spec/clock/06-gxp-compliance/recovery-procedures.md` — Stub FM-3 through FM-6

**Keep** FM-1 and FM-2 (lines 1-42) as-is — these are clock-internal.

**Replace** FM-3 through FM-6 (lines 44-123) with minimal 4-line stubs each:

```markdown
### FM-3: NTP Desynchronization

**Trigger:** Wall-clock drift exceeds configured NTP threshold.
**Impact:** Wall-clock timestamps may not reflect actual calendar time. Monotonic timestamps and sequence numbers are NOT affected.
**Detection and recovery:** Owned by `@hex-di/guard`. See `spec/guard/17-gxp-compliance/03-clock-synchronization.md`.

### FM-4: Platform API Tampering

...same pattern...
```

**Keep** the Summary Matrix (lines 125-136) — update to clearly show "Owner: @hex-di/guard" for FM-3-FM-6.

### 5. `spec/clock/06-gxp-compliance/audit-trail-integration.md` — Simplify guard references

**Edit** line 44: Keep the cross-reference to guard hash chains but don't detail what they do.

**Edit** lines 332-340 ("Guard's Audit Enhancement"): Replace with: "When `@hex-di/guard` is deployed, it adds NTP validation, cross-record cryptographic integrity, and periodic monitoring. See the guard spec for details."

**Edit** line 292: Update section 7.3 reference to point to guard spec instead.

### 6. Minor edits across remaining clock spec files

- `04-platform-adapters.md`: Remove guard code examples, simplify scope limitation notes to cross-references
- `06-gxp-compliance/fmea-risk-analysis.md`: Shorten guard mitigation descriptions to "Guard periodic monitoring (see guard spec)"
- `06-gxp-compliance/qualification-protocols.md`: Remove IQ-20 (requiredGuardVersion) and IQ-21 (ST-6 guard co-deployment)
- `06-gxp-compliance/quick-reference.md`: Remove ST-6 row from design decisions table
- `06-gxp-compliance/requirements-traceability-matrix.md`: Remove ST-6 entry, update guard cross-references
- `08-api-reference.md`: Remove `getClockGxPMetadata()` and `ClockGxPMetadata` entries (or simplify to clock-only metadata without `requiredGuardVersion`)
- `09-definition-of-done.md`: Remove IQ-20/IQ-21 items
- `01-overview.md`: Update package structure if `gxp-metadata.ts` is removed
- `02-clock-port.md`: Simplify line 145 guard monitoring note to brief cross-reference
- `README.md`: Minor ToC and consumer table updates

### 7. `spec/guard/17-gxp-compliance/03-clock-synchronization.md` — Add GxP assertion + fix references

**Replace** the header note (lines 22-29) which has wrong cross-references to nonexistent files like `spec/clock/06-gxp-compliance/ntp-synchronization.md`. New header:

```markdown
> **Authoritative ownership:**
>
> - `@hex-di/clock` spec: clock port interfaces, platform adapters, startup self-tests (ST-1 through ST-5), sequence generator, clock-internal failure modes (FM-1, FM-2).
> - This section: all guard-clock integration — NTP adapter, NTP startup modes, periodic integrity checks, ClockSource bridge, guard-detected failure modes (FM-3 through FM-6).
>
> Clock spec references:
>
> - Platform adapter startup self-tests: `spec/clock/04-platform-adapters.md`
> - Sequence generator ordering: `spec/clock/03-sequence-generator.md`
> - Leap second behavior: `spec/clock/02-clock-port.md`
```

**Add** a new subsection after the header — "`@hex-di/clock` GxP Compliance Status":

```markdown
### `@hex-di/clock` GxP Compliance Status

`@hex-di/clock` is **fully GxP compliant** as a clock infrastructure library. It provides:

- Injectable clock ports (`ClockPort`, `SequenceGeneratorPort`, `ClockDiagnosticsPort`) enabling adapter substitution for NTP-validated time sources
- Startup self-tests (ST-1 through ST-5) per 21 CFR 11.10(h) validating platform timer integrity at construction time
- Structurally irresettable sequence generation per 21 CFR 11.10(d) and ALCOA+ Complete
- Per-record SHA-256 cryptographic integrity (`computeTemporalContextDigest()`) per 21 CFR 11.10(c) and ALCOA+ Original
- Frozen (immutable) adapters and return values per ALCOA+ Original
- Complete IQ/OQ/PQ qualification protocols, FMEA risk analysis, and requirements traceability matrix
- Full ALCOA+ principle mapping with attribution context and electronic signature binding

`@hex-di/clock` provides the **mechanism**. `@hex-di/guard` provides the **policy** (which clock sources are acceptable, what resolution is required, when to fail). GxP deployments MUST deploy both packages together.
```

**Fix** lines 43-46: Remove references to nonexistent `ntp-synchronization.md` and wrong section numbers. Replace with correct clock spec file paths.

**Consolidate** content moved from clock spec (NTP startup modes, audit bridge, periodic integrity checks) into existing subsections here — the guard spec already covers most of this in NC-1 through NC-7 and FM-3 through FM-6, so this is mainly ensuring nothing is lost.

## Files to Modify

| File                                                               | Change Size                                           |
| ------------------------------------------------------------------ | ----------------------------------------------------- |
| `spec/clock/07-integration.md`                                     | Large — gut section 7.3, simplify guard override      |
| `spec/clock/06-gxp-compliance/clock-source-requirements.md`        | Medium — remove Required Guard Version, simplify refs |
| `spec/clock/06-gxp-compliance/verification-and-change-control.md`  | Small — replace lines 1-21                            |
| `spec/clock/06-gxp-compliance/recovery-procedures.md`              | Medium — stub FM-3 through FM-6                       |
| `spec/clock/06-gxp-compliance/audit-trail-integration.md`          | Small — simplify guard enhancement text               |
| `spec/clock/04-platform-adapters.md`                               | Small — remove guard code examples                    |
| `spec/clock/06-gxp-compliance/fmea-risk-analysis.md`               | Small — shorten mitigation descriptions               |
| `spec/clock/06-gxp-compliance/qualification-protocols.md`          | Small — remove IQ-20/IQ-21                            |
| `spec/clock/06-gxp-compliance/quick-reference.md`                  | Small — remove ST-6                                   |
| `spec/clock/06-gxp-compliance/requirements-traceability-matrix.md` | Small — remove ST-6                                   |
| `spec/clock/08-api-reference.md`                                   | Small — remove/update metadata entries                |
| `spec/clock/09-definition-of-done.md`                              | Small — remove IQ-20/IQ-21                            |
| `spec/clock/01-overview.md`                                        | Small — update package structure                      |
| `spec/clock/02-clock-port.md`                                      | Small — simplify one line                             |
| `spec/clock/README.md`                                             | Small — ToC updates                                   |
| `spec/guard/17-gxp-compliance/03-clock-synchronization.md`         | Medium — add GxP assertion, fix header refs           |

## Verification

1. After all edits, grep for "guard" in `spec/clock/` — remaining references should only be:
   - Boundary declarations ("delegated to guard", "guard depends on clock")
   - Cross-references to `spec/guard/...`
   - Consumer listings in tables
   - Change control triggers (guard version upgrade as requalification trigger)
2. No guard-specific behavioral specs (code examples, configuration options, startup modes, adapter implementations) should remain in the clock spec.
3. The guard spec's `03-clock-synchronization.md` should be self-contained for guard-clock integration — no circular references back to clock spec for guard behavior.
4. The guard spec should contain an unambiguous assertion that `@hex-di/clock` is fully GxP compliant.
