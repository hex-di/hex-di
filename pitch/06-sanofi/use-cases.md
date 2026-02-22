# HexDI Use Cases at Sanofi

> Four concrete Sanofi project scenarios showing HexDI's value — specific enough to feel real, not generic.

---

## Use Case 1: Clinical Trial Data Management System

### The Project

A system to manage patient data collection, adverse event reporting, and data queries for a Phase II/III clinical trial. Accesses patient records, generates regulatory submissions, integrates with an external eCRF (Electronic Case Report Form) system.

### The GxP Requirements

- Patient data access must be logged with WHO accessed, WHAT was accessed, and WHEN
- Adverse event reports must be complete and immutable once submitted
- The eCRF integration must be swappable if the vendor changes
- Change control: every change to how patient data flows must be documented and reviewed

### How HexDI Applies

**Service boundary declaration:**
```
PatientDataPort — contract for accessing patient records
AuditLogPort — required by every service that touches patient data
eCRFPort — typed contract for the external eCRF vendor
AdverseEventPort — immutable record creation contract
```

Every service that accesses patient data declares `PatientDataPort` AND `AuditLogPort` in its `requires`. The compiler enforces this: a service that needs `PatientDataPort` but doesn't declare `AuditLogPort` gets a compile error — or more precisely, the architecture reviewer notices the missing port in the graph diff.

**The eCRF swap scenario:**
When the trial moves from Phase II to Phase III and switches eCRF vendors, the change is:
1. New `eCRFVendorBAdapter` — one file implementing `eCRFPort`
2. Replace `eCRFVendorAAdapter` with `eCRFVendorBAdapter` in the GraphBuilder — one line
3. Compiler confirms every eCRF consumer is still satisfied

Change control documentation: the pull request diff is the change record. Every dependency affected is traceable through the graph.

**Compliance output:**
Generate the dependency graph at any audit checkpoint. Show the auditor: patient data only flows through `PatientDataPort`, which requires `AuditLogPort`, which is implemented by the GxP-compliant `AuditLogAdapter`. The evidence is structural, not a document that could be wrong.

---

## Use Case 2: Manufacturing Batch Record System

### The Project

A system managing electronic batch records for a biologic manufacturing process. Every batch step must be recorded, verified, and attributable to an operator. Integration with laboratory instruments (scales, biosafety cabinets, centrifuges) and the enterprise ERP system.

### The GxP Requirements

- Batch records must be complete, accurate, and attributable (ALCOA+)
- Electronic signatures required for batch release
- Instrument integrations must be validated; unauthorized instruments cannot submit data
- Any change to the batch record after creation requires an audit-trailed amendment

### How HexDI Applies

**The batch record workflow as a Saga:**

```
BatchRecordSaga:
  Step 1: CreateBatchRecordStep
    → Invokes: BatchRecordPort.create(batchId, operatorId, timestamp)
    → Compensation: BatchRecordPort.void(batchId, reason)

  Step 2: RecordInstrumentReadingsStep
    → Invokes: InstrumentPort.getReadings(instrumentId, batchId)
    → Compensation: BatchRecordPort.removeReadings(batchId, readingIds)

  Step 3: OperatorVerificationStep
    → Invokes: ElectronicSignaturePort.requestSignature(operatorId, recordHash)
    → Compensation: ElectronicSignaturePort.voidSignature(signatureId)

  Step 4: BatchReleaseStep
    → Invokes: BatchReleasePort.release(batchId, signatureId)
    → Compensation: BatchReleasePort.recall(batchId, reason)
```

If Step 4 fails after Step 3 succeeded, the saga automatically calls `ElectronicSignaturePort.voidSignature`. The batch record is never in an inconsistent state.

**ALCOA+ via tracing:**
`@hex-di/tracing` instruments every step of the saga. The trace record shows:
- Who triggered each step (operator attribution via `UserSessionPort`)
- When each step executed (trace timestamp)
- What the step received and produced (input/output spans)
- Whether the step succeeded or was compensated (outcome status)

This trace is the ALCOA+-compliant audit trail for the batch record — generated automatically, not written manually.

**Instrument authorization:**
The `InstrumentPort` adapter validates that the instrument is on the approved list before accepting readings. The structural declaration ensures that every reading comes through `InstrumentPort` — a service cannot accept instrument data without going through the authorized channel.

---

## Use Case 3: Regulatory Submission Preparation

### The Project

A system that aggregates clinical, manufacturing, and preclinical data to generate Common Technical Document (CTD) packages for regulatory submission (EMA, FDA).

### The Requirements

- Data from multiple source systems (clinical, manufacturing, laboratory) must be correctly attributed and traceable to source
- The CTD structure must comply with ICH M4 guidelines
- Multiple submission targets (EMA eCTD, FDA eSub, Health Canada) with different formatting requirements
- Regulatory dossier updates must reference the original submission with change details

### How HexDI Applies

**The port-per-data-source pattern:**

```
ClinicalDataPort — contract for clinical trial data access
ManufacturingDataPort — contract for batch record data access
LaboratoryDataPort — contract for analytical testing data
CTDFormatterPort — contract for CTD document generation
SubmissionTargetPort — contract for submission-target-specific formatting
```

The submission assembly service declares ALL data sources in its `requires`. The graph shows every data source the submission system touches — a complete data flow map for the auditor.

**The submission target swap:**
When preparing an EMA submission after an FDA submission, the team swaps `FDASubmissionAdapter` for `EMASubmissionAdapter`. One adapter file, one line in the GraphBuilder. The CTD content generation is unchanged; only the formatting adapter changes.

**Change attribution:**
When a regulatory dossier update is needed, the team submits a pull request changing the relevant adapter or graph declaration. The PR diff is the change record: what changed, why, who approved, when.

**Traceability:**
The dependency graph shows exactly which source system contributed to each section of the submission. An auditor asking "how was this data in section 4.2 obtained?" gets a structural answer: `CTDSection42Service` depends on `LaboratoryDataPort`, implemented by `LIMSAdapter`, which connects to the LIMS system.

---

## Use Case 4: Pharmacovigilance Signal Detection Platform

### The Project

A real-time system that monitors adverse event reports from multiple sources (spontaneous reports, literature, regulatory agency databases), applies signal detection algorithms, and generates case safety reports for regulatory submission.

### The Requirements

- Continuous ingestion from multiple external data sources
- Signal detection algorithms must be swappable as regulatory guidance evolves
- Every signal assessment must be traceable to the evidence that triggered it
- CAPA (Corrective and Preventive Action) tracking for identified signals

### How HexDI Applies

**The signal detection architecture:**

```
AdverseEventSourcePort — contract for each data source (spontaneous, literature, agency)
SignalDetectionPort — contract for the detection algorithm
CaseAssessmentPort — contract for safety case assessment
RegulatoryReportPort — contract for E2B/CIOMS reporting
CAPAPort — contract for CAPA tracking
```

Each adapter is independently swappable. When WHO updates the VigiBase data format, only the `WHOVigiBaseAdapter` changes. The signal detection algorithms and case assessment logic are unchanged.

**Algorithm versioning:**
Different signal detection algorithms (statistical, AI-based, rule-based) are different adapters implementing `SignalDetectionPort`. Switching algorithms for a validation study means swapping adapters — with a compile-time guarantee that the rest of the system is unaffected.

**The traceability chain:**
A regulatory inspector asking "what evidence supported this signal assessment?" gets a structural trace:

1. `AdverseEventSourcePort.ingest(sourceId)` → returned event IDs
2. `SignalDetectionPort.detect(eventIds)` → returned signal score
3. `CaseAssessmentPort.assess(signalScore, events)` → returned case assessment
4. `RegulatoryReportPort.generate(assessment)` → submitted report

Every step is traced, attributed, and timestamped. The evidence chain is complete and structurally accurate.

**AI-assisted signal detection:**
When introducing an AI-based signal detection algorithm, the adapter implements `SignalDetectionPort`. The AI model is behind the adapter boundary — the rest of the system (regulatory reporting, CAPA tracking) is unchanged. The compiler validates that the AI adapter satisfies the port contract. The regulatory submission workflow is unaffected.

---

## Summary: The Common Pattern

Across all four use cases, the HexDI pattern is identical:

1. **Declare the service boundaries as ports** — patient data, audit log, instrument, submission target
2. **Declare service dependencies explicitly** — every service that touches regulated data declares all required ports
3. **Enforce with the compiler** — wrong wiring is caught before commit, not at audit
4. **Generate compliance evidence from the graph** — auditors get structural proof, not handwritten documentation
5. **Swap implementations without code changes** — vendor changes, algorithm updates, format migrations are one-adapter changes

This is not a generic pattern that happens to work for Sanofi. It is the pattern that a GxP software environment requires — and HexDI is the only TypeScript platform that provides it structurally.
