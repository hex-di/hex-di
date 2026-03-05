---
id: BEH-SF-424
kind: behavior
title: Structured Output & Schema Management
status: active
id_range: 424--431
invariants: [INV-SF-2]
adrs: [ADR-012]
types: [structured-output]
ports: [StructuredOutputPort]
---

# 57 — Structured Output & Schema Management

**Feature:** [FEAT-SF-023](../features/FEAT-SF-023-structured-output.md)

---

## BEH-SF-424: Per-Role Schema Definition — Define and Edit Output Schemas

Per-role JSON schemas constrain each agent role's output format. Schemas define allowed node types, finding categories, metadata fields, and structural rules. Each schema is versioned and validated before activation.

### Contract

REQUIREMENT (BEH-SF-424): `StructuredOutputPort.setSchema(role, schema)` MUST persist a JSON Schema document that constrains the output format for the given agent role. The schema MUST be validated for syntactic correctness (valid JSON Schema draft-2020-12) before persistence. Invalid schemas MUST be rejected with `SchemaValidationError`. Each role MUST have at most one active schema. Setting a new schema for a role MUST deactivate the previous version.

### Verification

- Set schema test: define a schema for a role; verify it is persisted and retrievable.
- Invalid schema test: submit a syntactically invalid JSON Schema; verify `SchemaValidationError`.
- Override test: set two schemas for the same role; verify only the latest is active.

---

## BEH-SF-425: Schema Validation Pipeline — Validate Agent Output Against Schema

When an agent produces output, the system validates it against the role's active schema. Validation failures trigger configurable retry or fallback behavior.

### Contract

REQUIREMENT (BEH-SF-425): When an agent produces structured output, the system MUST validate the output against the agent's active role schema. If validation passes, the output MUST proceed to downstream processing. If validation fails, the system MUST return a `SchemaViolation` result containing the specific violations (path, expected, actual). The system MUST then apply the configured retry policy (BEH-SF-428) or fallback policy (BEH-SF-431).

### Verification

- Valid output test: produce output matching the schema; verify it passes validation.
- Invalid output test: produce output violating the schema; verify `SchemaViolation` with specific violation details.
- Pipeline test: validate output; on pass, verify downstream processing is invoked.

---

## BEH-SF-426: Agent Self-Assessment — Confidence Scoring in Structured Output

Agents include a self-assessment section in their structured output: a confidence score (0–1) and a list of uncertainties. This metadata informs downstream decisions about whether to request human review.

### Contract

REQUIREMENT (BEH-SF-426): Agent structured output MUST include a `selfAssessment` field containing `confidence` (number, 0–1) and `uncertainties` (string array). The schema validation pipeline MUST verify the presence and type correctness of these fields. If `confidence` falls below the configured threshold (default: 0.7), the system MUST flag the output for human review.

### Verification

- Confidence below threshold test: produce output with confidence 0.5; verify it is flagged for human review.
- Confidence above threshold test: produce output with confidence 0.9; verify no flag.
- Missing self-assessment test: produce output without `selfAssessment`; verify schema violation.

---

## BEH-SF-427: Graph-Direct Writes — Write Structured Output Directly to Graph

When an agent's structured output passes validation, the system writes the structured data directly into the knowledge graph as typed nodes and edges, bypassing manual import.

### Contract

REQUIREMENT (BEH-SF-427): When structured output passes schema validation (BEH-SF-425), the system MUST write each output element as a typed graph node with edges connecting it to the originating run, session, and parent nodes. Node types MUST match the schema-defined types. Edge labels MUST follow the schema's relationship definitions. The write MUST occur within an atomic transaction (BEH-SF-362 if available). If the graph write fails, the output MUST be queued for retry.

### Verification

- Graph write test: produce valid structured output; verify corresponding nodes and edges exist in the graph.
- Type mapping test: verify output element types match graph node types.
- Failure queue test: simulate graph write failure; verify output is queued for retry.

---

## BEH-SF-428: Retry Configuration — Configure Retry Behavior for Validation Failures

When schema validation fails, the system can retry the agent invocation with corrective feedback. The retry policy is configurable per role.

### Contract

REQUIREMENT (BEH-SF-428): `StructuredOutputPort.setRetryPolicy(role, policy)` MUST configure retry behavior for schema validation failures. The policy MUST specify `maxRetries` (integer, 0–5), `backoffMs` (number), and `feedbackMode` ("include-violations" or "none"). When a validation failure occurs and retries remain, the system MUST re-invoke the agent with the violation details included in the prompt (if `feedbackMode` is "include-violations"). After exhausting retries, the system MUST apply the fallback policy (BEH-SF-431).

### Verification

- Retry test: set maxRetries to 2; produce invalid output; verify the agent is re-invoked up to 2 times.
- Feedback test: set feedbackMode to "include-violations"; verify violation details are included in the retry prompt.
- Exhaustion test: exhaust retries; verify fallback policy is applied.

---

## BEH-SF-429: Streaming Event Output — Real-Time Structured Output Delivery

Agents emit structured output as a stream of events rather than a single batch. Each event represents a partial result that can be validated and processed incrementally.

### Contract

REQUIREMENT (BEH-SF-429): When an agent produces streaming structured output, each event MUST be individually validatable against the role schema's event sub-schema. Valid events MUST be forwarded to subscribers in real-time via `StructuredOutputPort.onEvent(role, callback)`. Invalid events MUST be buffered and revalidated after the next event arrives (to handle split-across-events structures). The stream MUST terminate with a `StreamComplete` event that triggers full-output validation.

### Verification

- Streaming test: emit 5 events; verify each is delivered to the subscriber in order.
- Partial validation test: emit an individually invalid event followed by a completing event; verify combined validation passes.
- Complete event test: verify `StreamComplete` triggers full validation.

---

## BEH-SF-430: Schema Versioning — Track Schema History and Backward Compatibility

Schemas are versioned. Each update creates a new version. The system checks backward compatibility between versions to prevent breaking changes to downstream consumers.

### Contract

REQUIREMENT (BEH-SF-430): Each schema update MUST create a new version with an auto-incremented version number. `StructuredOutputPort.getSchemaHistory(role)` MUST return all versions ordered by version number. When a new schema version is published, the system MUST check backward compatibility: all fields present in the previous version MUST still be present (though new fields MAY be added). Incompatible changes MUST be rejected unless `force: true` is specified. The active version MUST be the latest published version.

### Verification

- Version increment test: publish two schemas; verify version numbers are sequential.
- History test: publish 3 versions; verify `getSchemaHistory` returns all 3 in order.
- Backward compatibility test: remove a required field; verify rejection without `force: true`.
- Force publish test: remove a required field with `force: true`; verify acceptance.

---

## BEH-SF-431: Graceful Degradation — Fallback to Text Mode on Persistent Failure

When structured output validation fails persistently (all retries exhausted), the system falls back to text mode. The agent's output is captured as plain text and stored without schema enforcement.

### Contract

REQUIREMENT (BEH-SF-431): When all retry attempts (BEH-SF-428) are exhausted and validation still fails, the system MUST switch to text mode for the current output. In text mode, the agent's raw output MUST be stored as a `TextFallback` node in the graph with `degradedMode: true`. The system MUST emit a `StructuredOutputDegraded` event containing the role, run ID, and violation summary. Subsequent outputs from the same run MUST continue to attempt structured validation (degradation is per-output, not per-run).

### Verification

- Fallback test: exhaust retries; verify output is stored as `TextFallback` node with `degradedMode: true`.
- Event test: verify `StructuredOutputDegraded` event is emitted with correct metadata.
- Per-output scope test: after degradation, produce a valid output; verify it passes structured validation normally.
