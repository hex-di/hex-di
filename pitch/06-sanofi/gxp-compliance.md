# HexDI and GxP Compliance

> A gap analysis showing how HexDI satisfies 21 CFR Part 11, EU GMP Annex 11, ALCOA+, and GAMP 5 requirements structurally — not through documentation.

---

## The Context

Sanofi operates in a regulated environment where software systems touching clinical data, manufacturing quality, or regulatory submissions must comply with:

- **21 CFR Part 11** (FDA): Electronic records and electronic signatures
- **EU GMP Annex 11**: Computerised systems in EU pharmaceutical manufacturing
- **GAMP 5**: Good Automated Manufacturing Practice, software category guidance
- **ALCOA+**: Data integrity principles (Attributable, Legible, Contemporaneous, Original, Accurate + Complete, Consistent, Enduring, Available)

Compliance is currently achieved through documentation, process controls, and manual audit preparation. HexDI replaces manual compliance activities with structural guarantees — and adds technical controls that are stronger than any process control.

---

## 21 CFR Part 11 Gap Analysis

### §11.10(a) — Validation of Systems

**Requirement:** Systems must be validated to ensure accuracy, reliability, and consistent intended performance.

**Current approach:** Validation documentation written by developers, reviewed by QA, filed manually. Describes what the system *should* do.

**With HexDI:**
- The dependency graph is the structural proof of system wiring
- GraphBuilder compile-time validation ensures the system is wired as specified
- If the wiring changes, the code changes — and the change is versioned, reviewed, and auditable
- The validation evidence is produced by the system itself, not written by hand

**Gap closed:** ✅ Structural validation at every build. Evidence generated, not written.

---

### §11.10(b) — Ability to Generate Accurate Copies

**Requirement:** Ability to generate accurate and complete copies of records in both human-readable and electronic form.

**With HexDI:**
- `@hex-di/visualization` exports the dependency graph as Mermaid, DOT, or JSON
- The graph is always accurate (it is the running code)
- Exports can be generated on demand for any point in version history

**Gap closed:** ✅ Graph export in multiple formats, always accurate.

---

### §11.10(e) — Audit Trails

**Requirement:** Use of secure, computer-generated, time-stamped audit trails to independently record the date and time of operator entries and actions that create, modify, or delete electronic records.

**With HexDI:**
- `@hex-di/tracing` instruments every service resolution with a timestamp and trace ID
- `@hex-di/logger` with GxP-compliant formatters produces ALCOA+-aligned log records
- Every change to the dependency graph (service added, removed, or rewired) is a code change in version control — inherently time-stamped, attributed, and reviewable
- `@hex-di/saga` produces a step-by-step audit trail of every multi-step workflow execution

**Gap closed:** ✅ Structural audit trail via version control. Runtime audit trail via tracing. Workflow audit trail via saga execution records.

---

### §11.10(g) — Use of Authority Checks

**Requirement:** Use of authority checks to ensure that only authorized individuals can use the system, electronically sign a record, access the operation or computer system input or output device, alter a record, or perform the operation at issue.

**With HexDI:**
- `@hex-di/guard` (access control) expresses permission checks as typed ports
- A service that requires authorization goes through `AuthorizationPort` — which the compiler enforces
- If a new service touches regulated data without the authorization port in its `requires` list, the code review catches a missing dependency
- The compiler cannot enforce *who* can access a port at runtime, but it enforces *that* authorized access goes through the declared channel

**Partial gap:** ⚠️ The structural declaration enforces access *patterns*; runtime authorization is the adapter's responsibility. HexDI provides the architecture; the access control logic goes in the adapter.

---

### §11.10(k) — Controls for Open Systems

**Requirement:** When used with open systems, procedures and controls to ensure record authenticity, integrity, and confidentiality.

**With HexDI:**
- Every external integration (external APIs, cloud services, third-party tools) is behind a typed port
- The adapter declares what it does; the port declares what the system expects
- Changes to an external integration must go through the adapter — they cannot silently change behavior elsewhere

**Gap closed:** ✅ External integrations are structurally isolated and auditable.

---

## EU GMP Annex 11 Gap Analysis

### §4.3 — Change Management

**Requirement:** Any changes to a computerised system must be made in a controlled manner in accordance with a defined procedure.

**With HexDI:**
- All architecture changes are code changes in version control
- The GraphBuilder's immutable builder pattern means changes are explicit: you add, remove, or replace a `.provide()` call
- Pull request review is the change management workflow — inherently auditable

**Gap closed:** ✅ Every architecture change is a versioned, reviewed, attributed code change.

---

### §4.7 — Data Storage

**Requirement:** Data should be protected by physical and/or logical means against damage.

**With HexDI:**
- The dependency graph is part of the versioned codebase — protected by version control history
- The runtime graph state is inspectable via the inspection API — observable, not implicit

**Gap closed:** ✅ Architecture state is versioned and protected.

---

### §4.8 — Audit Trails (Annex 11)

**Requirement:** The integrity and accuracy of audit trail records must be demonstrated. Changes and deletions should be recorded.

**With HexDI:**
- `@hex-di/tracing` produces immutable trace records for every service resolution
- `@hex-di/saga` produces step completion records for every workflow step
- Version control provides an immutable history of every architecture change

**Gap closed:** ✅ Multiple layers of immutable audit trail.

---

### §11 — Electronic Signatures

**Requirement:** Where electronic signatures are used, they must be linked to their respective electronic record.

**With HexDI:**
- A `SignaturePort` declares the signature contract
- The adapter implements the actual signature mechanism (hash linking, timestamp, user attribution)
- The structural declaration ensures that every record that requires a signature goes through `SignaturePort`
- If a new workflow path that should require a signature doesn't declare `SignaturePort` in its `requires`, the compliance gap is visible in the dependency graph

**Gap supported:** ✅ Signature enforcement is structural. The adapter implements the mechanism.

---

## ALCOA+ Mapping

| ALCOA+ Principle | HexDI Mechanism |
|---|---|
| **Attributable** — who did it? | Version control attributes every architecture change. Trace spans attribute every service resolution to a code path. |
| **Legible** — can it be read? | Graph exports in human-readable Mermaid/DOT. Logger produces structured, human-readable records. |
| **Contemporaneous** — recorded at the time? | Traces are time-stamped at resolution time. Logger timestamps are injection-time, not write-time. Version control timestamps are commit-time. |
| **Original** — first capture? | Trace records are write-once. Version control history is append-only. |
| **Accurate** — reflects what happened? | The dependency graph is structurally correct by construction. Traces reflect actual execution, not manual logs. |
| **Complete** — nothing missing? | Every service resolution produces a trace. Every saga step produces a record. The graph has no implicit edges. |
| **Consistent** — same result each time? | Compile-time validation guarantees consistent wiring. No runtime configuration drift. |
| **Enduring** — lasts for required retention? | Version control is permanent. Trace export backends (OTEL, Datadog) are configurable for retention. |
| **Available** — accessible when needed? | Graph query APIs, graph-viz interactive viewer, trace query interfaces. |

---

## GAMP 5 Category Classification

Under GAMP 5, HexDI is a **Category 4** software tool (configurable product): it provides a framework that teams configure for their specific application.

Applications built with HexDI are typically **Category 4** (configured) or **Category 5** (custom), depending on the degree of custom development.

The critical GAMP 5 observation: HexDI's structural validation **reduces the Category 5 validation burden** by proving structural correctness automatically. The portion of validation that concerns "does the system implement the declared architecture?" is answered by the compiler — not by manual testing.

---

## Compliance Summary

| Regulation | Requirement Area | HexDI Coverage |
|---|---|---|
| 21 CFR Part 11 §11.10(a) | System validation | ✅ Structural, compile-time |
| 21 CFR Part 11 §11.10(b) | Accurate copies | ✅ Graph export, on-demand |
| 21 CFR Part 11 §11.10(e) | Audit trails | ✅ Tracing + version control |
| 21 CFR Part 11 §11.10(g) | Authority checks | ⚠️ Structural pattern; runtime enforcement in adapter |
| 21 CFR Part 11 §11.10(k) | Open systems integrity | ✅ Port isolation of external systems |
| EU GMP Annex 11 §4.3 | Change management | ✅ Version-controlled graph changes |
| EU GMP Annex 11 §4.8 | Audit trail integrity | ✅ Immutable traces + version history |
| EU GMP Annex 11 §11 | Electronic signatures | ✅ SignaturePort structural enforcement |
| ALCOA+ | Data integrity principles | ✅ All nine principles covered |
| GAMP 5 | Software category | ✅ Category 4; reduces Category 5 validation scope |

---

*For full compliance documentation and validation protocol templates, contact the HexDI team.*
