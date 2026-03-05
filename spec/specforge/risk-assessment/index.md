> **Document Control**
>
> | Property       | Value                        |
> | -------------- | ---------------------------- |
> | Document       | Risk Assessment -- SpecForge |
> | Version        | 4.0                          |
> | Status         | Draft                        |
> | Classification | GAMP 5 Category 5            |

# Risk Assessment

Failure Mode and Effects Analysis (FMEA) for key SpecForge failure modes.

---

### System Context

**GAMP 5 Software Classification**: SpecForge is classified as **Category 5 -- Custom Software**. The platform implements custom application logic -- a Neo4j knowledge graph, persistent AI agent sessions, convergence-driven flow execution, and compositional knowledge materialization -- assembled and configured by the consuming engineering team. No Category 3 (infrastructure) or Category 4 (configurable product) classification applies: the specification verification logic, agent orchestration, and graph-canonical workflow are not delivered as a pre-configured product but are composed into a bespoke configuration by the consuming team.

**Risk-Based Approach Justification**: Because SpecForge is Category 5 custom software that orchestrates autonomous AI agents, manages a graph database as source of truth, and may operate in GxP-adjacent environments (specification verification for regulated software), a risk-based approach per ICH Q9 is required. The FMEA methodology ensures that failure modes with the highest impact on data integrity, flow correctness, and system availability are identified, scored, and mitigated proportionally.

**System Characteristics**:

| Characteristic      | Value                                                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| System Type         | Specification platform (Neo4j knowledge graph + persistent AI agent sessions)                                                                      |
| Runtime Environment | Node.js server-side; CLI                                                                                                                           |
| Deployment Model    | Solo (local server + local Neo4j) and SaaS (local server + cloud Neo4j) -- mode selects adapters, not capabilities                                 |
| User Population     | Software engineers, specification authors, compliance reviewers                                                                                    |
| Agent Roles         | 8 consolidated roles (discovery-agent, spec-author, reviewer, feedback-synthesizer, task-decomposer, dev-agent, codebase-analyzer, coverage-agent) |
| Criticality         | Flow correctness, graph data integrity, agent session isolation                                                                                    |
| Data Handled        | Specification nodes, agent conversation context, session chunks, flow state, convergence metrics                                                   |
| External Interfaces | Neo4j (graph storage), Claude Code CLI (agent subprocess), filesystem (derived renderings)                                                         |

---

### Risk Assessment Methodology

| Factor             | Scale | Anchor Points                                                                                                                                                  |
| ------------------ | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity (S)**   | 1--10 | 1 = Negligible impact; 4 = Minor workflow disruption; 7 = Data loss or corruption; 10 = Safety or regulatory impact                                            |
| **Occurrence (O)** | 1--10 | 1 = Virtually impossible; 4 = Occasional; 7 = Frequent; 10 = Near-certain                                                                                      |
| **Detection (D)**  | 1--10 | 1 = Certain detection (automatic monitoring); 4 = Moderate detection (logs, queries); 7 = Low detection (requires explicit audit); 10 = No detection mechanism |

**Risk Priority Number (RPN)** = S x O x D. Maximum = 1000.

| RPN Range | Classification           | Required Action                                                             |
| --------- | ------------------------ | --------------------------------------------------------------------------- |
| 1--60     | Acceptable               | Standard testing and routine monitoring                                     |
| 61--99    | Conditionally acceptable | Documented justification required; enhanced monitoring and regression tests |
| 100+      | Unacceptable             | Mandatory mitigation before release; re-assess after mitigation             |

---

### FMEA Matrix

Failure modes are grouped by domain:

| File                                                         | FMs                 | Domain                        |
| ------------------------------------------------------------ | ------------------- | ----------------------------- |
| [FM-SF-001-infrastructure.md](./FM-SF-001-infrastructure.md) | FM-SF-001–FM-SF-005 | Infrastructure Failure Modes  |
| [FM-SF-006-flow-execution.md](./FM-SF-006-flow-execution.md) | FM-SF-006–FM-SF-012 | Flow Execution Failure Modes  |
| [FM-SF-013-data-integrity.md](./FM-SF-013-data-integrity.md) | FM-SF-013–FM-SF-018 | Data Integrity Failure Modes  |
| [FM-SF-019-security.md](./FM-SF-019-security.md)             | FM-SF-019–FM-SF-024 | Security Failure Modes        |
| [FM-SF-025-communication.md](./FM-SF-025-communication.md)   | FM-SF-025–FM-SF-030 | Communication Failure Modes   |
| [FM-SF-031-cost-memory.md](./FM-SF-031-cost-memory.md)       | FM-SF-031–FM-SF-036 | Cost and Memory Failure Modes |
| [FM-SF-037-deployment.md](./FM-SF-037-deployment.md)         | FM-SF-037–FM-SF-042 | Deployment Failure Modes      |

---

#### Invariant -> FMEA Cross-Reference

Every invariant with an associated failure mode is covered by at least one FMEA entry. The following table maps invariants to their FMEA entries for audit traceability.

| Invariant | Description                                   | FMEA Entry           |
| --------- | --------------------------------------------- | -------------------- |
| INV-SF-1  | ACP session history append-only               | FM-SF-006, FM-SF-031 |
| INV-SF-2  | Agent session isolation                       | FM-SF-032            |
| INV-SF-3  | Convergence bound                             | FM-SF-005            |
| INV-SF-4  | Dependency-respecting execution               | FM-SF-033            |
| INV-SF-5  | Tool isolation                                | FM-SF-034, FM-SF-042 |
| INV-SF-6  | Atomic filesystem flush                       | FM-SF-035            |
| INV-SF-7  | Graph data persistence                        | FM-SF-036            |
| INV-SF-8  | Rendering fidelity                            | FM-SF-037            |
| INV-SF-9  | Flow determinism                              | FM-SF-038            |
| INV-SF-10 | Graph-ACP sync consistency                    | FM-SF-001            |
| INV-SF-11 | Session chunk immutability                    | FM-SF-039            |
| INV-SF-12 | Hook pipeline ordering                        | FM-SF-018            |
| INV-SF-13 | Structured output schema compliance           | FM-SF-025            |
| INV-SF-14 | Memory artifact traceability                  | FM-SF-021            |
| INV-SF-15 | Budget zone monotonicity                      | FM-SF-020, FM-SF-041 |
| INV-SF-16 | Permission escalation requires explicit grant | FM-SF-023            |
| INV-SF-17 | MCP server health gate                        | FM-SF-022            |
| INV-SF-18 | ACP run state consistency                     | FM-SF-030            |
| INV-SF-19 | ACP server availability                       | FM-SF-029            |
| INV-SF-20 | Idempotent graph sync                         | FM-SF-040            |

---

### Risk Summary

| Risk Level               | Count | FM IDs                                                                                                                                                                                               | Testing Requirement                                                                                                  |
| ------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Unacceptable (RPN 100+)  | 9     | FM-SF-001, FM-SF-008, FM-SF-014, FM-SF-015, FM-SF-023, FM-SF-030, FM-SF-031, FM-SF-040, FM-SF-041                                                                                                    | Dedicated mitigation tests verifying the corrective action reduces the failure mode below the Unacceptable threshold |
| Conditional (RPN 61--99) | 18    | FM-SF-002, FM-SF-003, FM-SF-004, FM-SF-005, FM-SF-007, FM-SF-010, FM-SF-012, FM-SF-017, FM-SF-018, FM-SF-019, FM-SF-021, FM-SF-022, FM-SF-028, FM-SF-029, FM-SF-035, FM-SF-036, FM-SF-038, FM-SF-042 | Integration tests covering the failure scenario end-to-end, including the mitigation path                            |
| Acceptable (RPN 1--60)   | 15    | FM-SF-006, FM-SF-009, FM-SF-011, FM-SF-013, FM-SF-016, FM-SF-020, FM-SF-024, FM-SF-025, FM-SF-026, FM-SF-027, FM-SF-032, FM-SF-033, FM-SF-034, FM-SF-037, FM-SF-039                                  | Standard unit test coverage sufficient                                                                               |

---

### Post-Mitigation RPN Assessment

Per GAMP 5 / ICH Q9, all Unacceptable failure modes (RPN >= 100) must be re-assessed after mitigation to confirm they fall below the Unacceptable threshold. The post-mitigation scores reflect the effect of the documented compensating controls.

| FM ID     | Failure Mode                                   | Pre-RPN | Post-S | Post-O | Post-D | Post-RPN | Post-Risk Level |
| --------- | ---------------------------------------------- | ------- | ------ | ------ | ------ | -------- | --------------- |
| FM-SF-001 | Neo4j unavailable during flow execution        | 120     | 8      | 3      | 2      | 48       | Acceptable      |
| FM-SF-008 | Session snapshot corruption                    | 192     | 8      | 2      | 3      | 48       | Acceptable      |
| FM-SF-014 | Orphan node accumulation                       | 105     | 3      | 5      | 2      | 30       | Acceptable      |
| FM-SF-015 | GxP hash chain tamper detection false positive | 192     | 8      | 2      | 3      | 48       | Acceptable      |
| FM-SF-023 | Permission escalation bypass                   | 120     | 8      | 2      | 2      | 32       | Acceptable      |
| FM-SF-030 | ACP Run state corruption                       | 120     | 8      | 2      | 2      | 32       | Acceptable      |
| FM-SF-031 | ACP Session history loss                       | 120     | 8      | 2      | 2      | 32       | Acceptable      |
| FM-SF-040 | Graph sync replays duplicate data              | 140     | 7      | 3      | 2      | 42       | Acceptable      |
| FM-SF-041 | Budget zone skips or reverses                  | 160     | 8      | 2      | 3      | 48       | Acceptable      |

**Post-mitigation justifications:**

- **FM-SF-001:** Bounded buffer + replay-on-reconnect reduces Occurrence (transient outages absorbed without data loss) and health check monitoring improves Detection (auto-pause before buffer overflow).
- **FM-SF-008:** Snapshot integrity check on load catches corruption before use (Detection improved); re-spawn from last successful turn + chunk composition reduces effective Occurrence of unrecoverable corruption.
- **FM-SF-014:** Orphan detection query provides on-demand audit (Detection = 2); periodic cleanup command prevents unbounded accumulation.
- **FM-SF-015:** Hash chain verification catches true tampering; rollback to last known-good checkpoint limits blast radius; false positive investigation procedure reduces effective Occurrence of actionable false positives.
- **FM-SF-023:** Explicit grant requirement ([INV-SF-16](../invariants/INV-SF-16-permission-escalation-requires-explicit-grant.md)) and immutable audit graph nodes reduce Occurrence; blast radius analysis + quarterly penetration review improve Detection.
- **FM-SF-030:** State machine validation rejects invalid transitions at the boundary (Occurrence reduced); atomic persistence and ACPRunStateError with expected-vs-actual state improve Detection.
- **FM-SF-031:** Write-ahead log ensures durability under crash (Occurrence reduced); checksum verification on read provides certain detection of any integrity violation.
- **FM-SF-040:** Content-addressed node identity (SHA-256 deterministic keys) ensures upsert-or-skip semantics on replay (Occurrence reduced); idempotency verification on sync detects any duplicate creation attempt (Detection improved).
- **FM-SF-041:** Optimistic locking with monotonic zone enforcement ([INV-SF-15](../invariants/INV-SF-15-budget-zone-monotonicity.md)) prevents reverse transitions (Occurrence reduced); zone transition events are emitted and logged, enabling immediate detection of any non-monotonic attempt (Detection improved).

All 9 Unacceptable failure modes achieve post-mitigation RPN below 100, meeting the release criterion.

---

### Low-Risk Justifications

Five failure modes have RPN in the Acceptable range (1--60). Per the canonical risk assessment conventions, an explicit prose justification is provided for each.

**FM-SF-006 -- Concurrent ACP message write conflict (RPN 45, S=3, O=5, D=3)**

FM-SF-006 is classified Acceptable because concurrent ACP message write conflicts have Low severity (S=3) -- ACP sessions are append-only ([INV-SF-1](../invariants/INV-SF-1-acp-session-history-append-only.md)), so a conflict does not destroy data but at worst reorders appended messages within a single tick. Write serialization via append-only session semantics prevents even this reordering in practice. Detection is certain (D=3) because the ACP message exchange layer logs any contention, and the append-only invariant means that conflicting writes produce duplicate entries rather than lost entries, making the symptom immediately visible in the session history.

**FM-SF-009 -- Partial materialization on cancel (RPN 45, S=3, O=5, D=3)**

FM-SF-009 is classified Acceptable because partial materialization is a cosmetic/informational issue (S=3), not a data integrity event. When a flow is cancelled, any chunks already materialized carry `partial: true` metadata, which downstream consumers inspect before composing the chunks into future sessions. The partial flag is set automatically by the materialization pipeline, so detection is certain (D=3). No user data is lost -- the partial chunks remain queryable in the graph and can be completed or discarded in a subsequent flow run.

**FM-SF-011 -- Custom flow definition invalid (RPN 45, S=3, O=5, D=3)**

FM-SF-011 is classified Acceptable because invalid flow definitions are caught at registration time, before any flow execution begins. The validation step rejects malformed definitions with a descriptive error, so no flow state is affected (S=3). Detection is certain (D=3) because the validation is synchronous and returns an error result to the caller immediately. The Occurrence is Moderate (O=5) because custom flow definitions are authored by users and typos or structural errors are expected during development, but the fail-fast validation ensures they never reach the execution engine.

**FM-SF-013 -- Graph storage limit exceeded (RPN 45, S=5, O=3, D=3)**

FM-SF-013 is classified Acceptable because graph storage limits are a SaaS-tier operational constraint (S=5 is moderate -- the system remains functional but new writes are rejected until the limit is addressed). Occurrence is Low (O=3) because storage growth is gradual and predictable, giving teams ample warning before limits are reached. Detection is certain (D=3) because usage monitoring tracks graph size continuously, and a tier upgrade prompt is displayed before the hard limit is hit. The mitigation path -- tier upgrade or graph cleanup -- is non-disruptive and does not require downtime or data migration.

**FM-SF-016 -- Human feedback injection during wrong phase (RPN 45, S=3, O=5, D=3)**

FM-SF-016 is classified Acceptable because human feedback posted during a phase that does not include the `feedback-synthesizer` is not lost -- it is persisted as an ACP message in the session history (append-only, [INV-SF-1](../invariants/INV-SF-1-acp-session-history-append-only.md)) and will be processed by the synthesizer when it next executes. Severity is Low (S=3) because the feedback is merely delayed, not discarded. Detection is certain (D=3) because the ACP message event is always emitted and visible in the flow monitor event stream. Occurrence is Moderate (O=5) because users may not always know which phase is currently active, but the ACP session's append-only nature ensures no data loss regardless of timing.

**FM-SF-020 -- Budget zone transition race (RPN 27, S=3, O=3, D=3)**

FM-SF-020 is classified Acceptable because budget zone transitions are enforced as monotonic (Green->Yellow->Orange->Red only, [INV-SF-15](../invariants/INV-SF-15-budget-zone-monotonicity.md)), so even if rapid consumption occurs, the system never reverts to a lower-severity zone. Severity is Low (S=3) because skipping a zone means the system applies more aggressive cost controls sooner, which is conservative rather than harmful. Occurrence is Low (O=3) because budget consumption is tracked per tool invocation with incremental updates. Detection is certain (D=3) because zone transition events are emitted and visible in the cost dashboard.

**FM-SF-024 -- Dynamic role misconfiguration (RPN 45, S=5, O=3, D=3)**

FM-SF-024 is classified Acceptable because activation predicates are Cypher queries that either return true or false -- there is no ambiguous middle ground. Severity is Moderate (S=5) because an incorrectly activated role wastes tokens on an irrelevant agent but does not corrupt data. Occurrence is Low (O=3) because predicates are validated at registration time and cached per flow run. Detection is certain (D=3) because activated roles are logged, and role performance tracking (BEH-SF-189) flags roles with consistently poor metrics.

**FM-SF-025 -- Structured output schema mismatch (RPN 45, S=5, O=3, D=3)**

FM-SF-025 is classified Acceptable because schema validation catches malformed output immediately -- invalid output never reaches the graph ([INV-SF-13](../invariants/INV-SF-13-structured-output-schema-compliance.md)). Severity is Moderate (S=5) because a retry cycle consumes additional tokens but the agent eventually produces valid output or degrades to text mode. Occurrence is Low (O=3) because Claude Code's `--json-schema` flag constrains output at generation time. Detection is certain (D=3) because `SchemaValidationError` is a structured error with the exact validation failure, logged and visible in the flow monitor.

**FM-SF-032 -- Agent session isolation breach (RPN 48, S=8, O=2, D=3)**

FM-SF-032 is classified Acceptable because agent session isolation is enforced at multiple levels: session-scoped context boundaries ([INV-SF-2](../invariants/INV-SF-2-agent-session-isolation.md)), session ID validation on every message exchange, and SessionManager-enforced boundaries. Severity is High (S=8) because a cross-session data leak could expose one agent's context to another. Occurrence is Very Low (O=2) because the isolation enforcement is structural -- sessions are independent ACP runs with separate state, not shared memory. Detection is certain (D=3) because session ID mismatches are caught at the ACP message layer before any context is exchanged.

**FM-SF-033 -- Dependency cycle in flow execution (RPN 30, S=5, O=2, D=3)**

FM-SF-033 is classified Acceptable because dependency cycles are detected and rejected at flow registration time, before any execution begins ([INV-SF-4](../invariants/INV-SF-4-dependency-respecting-execution.md)). Severity is Moderate (S=5) because an undetected cycle would cause a flow deadlock, but the fail-fast validation prevents this entirely. Occurrence is Very Low (O=2) because cycle detection runs on every flow definition. Detection is certain (D=3) because the validation returns a descriptive error identifying the cycle path.

**FM-SF-034 -- Tool isolation bypass (RPN 48, S=8, O=2, D=3)**

FM-SF-034 is classified Acceptable because tool permissions are enforced per agent role via the tool manifest ([INV-SF-5](../invariants/INV-SF-5-tool-isolation.md)). Severity is High (S=8) because unauthorized tool access could enable unintended side effects. Occurrence is Very Low (O=2) because tool access is validated against the role's allowed tool list on every invocation. Detection is certain (D=3) because all tool invocations are audited and unauthorized attempts are logged as findings.

**FM-SF-037 -- Rendering fidelity loss (RPN 45, S=3, O=3, D=5)**

FM-SF-037 is classified Acceptable because rendering is derived from graph query results ([INV-SF-8](../invariants/INV-SF-8-rendering-fidelity.md)), making it inherently regenerable. Severity is Low (S=3) because fidelity loss is cosmetic -- the authoritative data remains in the graph and can be re-rendered at any time. Occurrence is Low (O=3) because rendering templates are validated and tested. Detection is Moderate (D=5) because drift requires comparison between rendered output and graph state, though content hash comparison automates this detection.

**FM-SF-039 -- Session chunk mutation after creation (RPN 48, S=8, O=2, D=3)**

FM-SF-039 is classified Acceptable because session chunk immutability is enforced at multiple levels: Object.freeze on chunk creation, graph constraints that prevent update operations on chunk nodes, and integrity checks on chunk read ([INV-SF-11](../invariants/INV-SF-11-session-chunk-immutability.md)). Severity is High (S=8) because a mutation could corrupt session composition. Occurrence is Very Low (O=2) because the immutability enforcement is structural -- the API does not expose mutation operations on chunks. Detection is certain (D=3) because integrity checks on chunk read catch any unexpected mutation.

**FM-SF-026 -- Server crash (RPN 45, S=5, O=3, D=3)**

FM-SF-026 is classified Acceptable because the Server Lifecycle Manager monitors the SpecForge Server process health continuously. Severity is Moderate (S=5) because an in-flight flow may lose its current iteration, but flow state is persisted in Neo4j so the flow can resume after restart. Occurrence is Low (O=3) because the server runs the same stable Node.js server binary regardless of which client started it. Detection is certain (D=3) because the Server Lifecycle Manager detects process exit within 5 seconds and triggers automatic restart with the last-known configuration.

**FM-SF-027 -- Auto-update failure (RPN 45, S=5, O=3, D=3)**

FM-SF-027 is classified Acceptable because the auto-update mechanism includes automatic rollback. Severity is Moderate (S=5) because a failed update temporarily disrupts the user's workflow during the restart cycle, but the rollback restores the previous working version. Occurrence is Low (O=3) because updates are built and tested in CI before release. Detection is certain (D=3) because the health check runs within 30 seconds of restart, and failure triggers immediate rollback with a user-visible notification.

---

### Risk Acceptance Criteria

| RPN Range | Classification               | Acceptance Conditions                                                                                                                                       |
| --------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1--60     | **Acceptable**               | No further action required. Standard unit test coverage and routine monitoring are sufficient.                                                              |
| 61--99    | **Conditionally Acceptable** | Documented justification required before release. Enhanced monitoring must be in place. Regression tests covering the failure scenario must exist and pass. |
| 100+      | **Unacceptable**             | Mitigation required before release. The failure mode must be re-assessed after mitigation is applied. The mitigated RPN must fall below 100 to proceed.     |

---

### Residual Risk Summary

This table summarizes all failure modes whose RPN exceeds the Acceptable threshold (> 60) after applying mitigations. These are the residual risks that require documented compensating controls and periodic review.

| FM ID     | Description                                                 | Compensating Controls                                                                                                                                                                                                                                                     | Review Cadence |
| --------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| FM-SF-001 | Neo4j unavailable during flow execution                     | Bounded buffer absorbs transient outages; replay-on-reconnect recovers buffered operations ([INV-SF-10](../invariants/INV-SF-10-graph-acp-sync-consistency.md)); health check monitoring triggers auto-pause before buffer overflow                                       | Quarterly      |
| FM-SF-002 | Agent subprocess crash (OOM, unexpected termination)        | Crash recorded as finding in graph; automatic re-spawn on next iteration; process memory limits enforced by deployment configuration                                                                                                                                      | Quarterly      |
| FM-SF-003 | Claude Code CLI subprocess failure                          | Exponential backoff with 5 retries; auto-pause flow on exhaustion; process health check monitoring                                                                                                                                                                        | Quarterly      |
| FM-SF-004 | Token budget exhausted mid-phase                            | BudgetExceededError signal enables graceful wrap-up; partial results preserved as chunks; budget monitoring alerts before exhaustion                                                                                                                                      | Quarterly      |
| FM-SF-005 | Convergence never reached (oscillating findings)            | Max iteration bound ([INV-SF-3](../invariants/INV-SF-3-convergence-bound.md)) guarantees termination; oscillation detection logs warning before bound is reached                                                                                                          | Semi-annual    |
| FM-SF-007 | Graph sync conflict (concurrent mutations)                  | Last-writer-wins with conflict logging; conflict events queryable in graph for post-hoc review; serializable transaction mode available for critical mutations                                                                                                            | Semi-annual    |
| FM-SF-008 | Session snapshot corruption                                 | Re-spawn from last successful turn; compose from prior chunks; snapshot integrity check on load detects corruption before use                                                                                                                                             | Quarterly      |
| FM-SF-010 | Clarification request deadlock (no responder)               | Configurable timeout causes flow to continue without response; timeout event logged as finding; agent receives "no response" signal and adapts                                                                                                                            | Semi-annual    |
| FM-SF-012 | OAuth token expired during flow                             | Refresh token rotation with 30-day lifetime; token expiration check before flow start; mid-flow refresh attempt before error                                                                                                                                              | Quarterly      |
| FM-SF-014 | Orphan node accumulation                                    | Periodic cleanup command removes orphans; orphan detection query available for on-demand audit; graph storage monitoring alerts on growth anomalies                                                                                                                       | Quarterly      |
| FM-SF-015 | GxP hash chain tamper detection false positive              | Hash chain verification with rollback capability; false positive investigation procedure documented; re-verification from last known-good checkpoint                                                                                                                      | Quarterly      |
| FM-SF-017 | Import data corruption (malformed markdown/OpenAPI parsing) | `--dry-run` flag previews import without committing; incremental import compares content hashes to detect drift; parser returns structured errors with source location; idempotent re-import recovers from partial failures                                               | Quarterly      |
| FM-SF-018 | Hook pipeline timeout (handler exceeds timeout)             | Handler terminated after configurable timeout; timeout event logged as finding; hook state preserved for debugging                                                                                                                                                        | Quarterly      |
| FM-SF-019 | Compliance gate false rejection                             | Manual override via `specforge approve`; false positive rate tracked; rule refinement based on false positive patterns                                                                                                                                                    | Quarterly      |
| FM-SF-021 | CLAUDE.md stale generation                                  | Hook-triggered regeneration on significant graph mutations; content hash caching prevents unnecessary writes; staleness window limited to single flow run                                                                                                                 | Semi-annual    |
| FM-SF-022 | MCP server unavailable at spawn time                        | Health check excludes unhealthy servers before spawn; agent spawns without MCP functionality; warning recorded and visible in dashboard; retry on next session                                                                                                            | Quarterly      |
| FM-SF-023 | Permission escalation bypass                                | Explicit grant required for all escalations ([INV-SF-16](../invariants/INV-SF-16-permission-escalation-requires-explicit-grant.md)); all permission decisions audited as immutable graph nodes; blast radius analysis gates elevated access; quarterly penetration review | Quarterly      |
| FM-SF-028 | Cross-platform webview inconsistency                        | Target modern webview versions (WebKit 16+, WebView2, WebKitGTK 2.42+); automated cross-platform CI testing on macOS, Windows, Linux; platform-specific CSS overrides via Tauri platform detection                                                                        | Semi-annual    |
| FM-SF-029 | ACP Server startup failure                                  | Health check within 5 seconds detects startup failure; retry with exponential backoff; queued runs replayed on recovery; startup failure logged with ACPServerStartupError                                                                                                | Quarterly      |
| FM-SF-030 | ACP Run state corruption                                    | State machine enforces valid transitions only ([INV-SF-18](../invariants/INV-SF-18-acp-run-state-consistency.md)); invalid transitions rejected with ACPRunStateError containing expected vs actual state; run state persisted atomically to prevent partial updates      | Quarterly      |
| FM-SF-031 | ACP Session history loss                                    | Append-only session history enforced ([INV-SF-1](../invariants/INV-SF-1-acp-session-history-append-only.md)); write-ahead log ensures durability; session history checksum verification on read detects corruption; ACPSessionError raised on integrity failure           | Quarterly      |
| FM-SF-035 | Filesystem flush interrupted mid-write                      | Atomic write via temp file + rename prevents partial files; content hash mismatch detected on next read; idempotent re-flush recovers from any interruption                                                                                                               | Quarterly      |
| FM-SF-036 | Graph data persistence failure                              | Transactional writes with automatic rollback; retry with exponential backoff; bounded buffer absorbs transient Neo4j failures; transaction failure logged with full context                                                                                               | Quarterly      |
| FM-SF-038 | Flow non-determinism                                        | Deterministic agent scheduling based on dependency order ([INV-SF-9](../invariants/INV-SF-9-flow-determinism.md)); seed-based tie-breaking for parallel agents; execution trace logged for reproducibility comparison                                                     | Semi-annual    |
| FM-SF-040 | Graph sync replays duplicate data                           | Content-addressed node identity (SHA-256) ensures upsert-or-skip semantics ([INV-SF-20](../invariants/INV-SF-20-idempotent-graph-sync.md)); idempotency verification on sync detects duplicate creation attempts; bounded buffer replay is safe by design                 | Quarterly      |
| FM-SF-041 | Budget zone skips or reverses                               | Optimistic locking with monotonic zone enforcement ([INV-SF-15](../invariants/INV-SF-15-budget-zone-monotonicity.md)); atomic zone state updates prevent partial transitions; zone transition events emitted for monitoring                                               | Quarterly      |
| FM-SF-042 | Tool isolation bypass via misconfigured permissions         | Tool permissions enforced per agent role ([INV-SF-5](../invariants/INV-SF-5-tool-isolation.md)); tool access validated against role manifest on every invocation; all unauthorized attempts logged as findings                                                            | Quarterly      |

---

### Assessment Provenance

**Methodology**: Risk Priority Number scoring using the S x O x D formula (Severity x Occurrence x Detectability, scale 1--10 each, maximum RPN = 1000) per **ICH Q9** (Quality Risk Management). FMEA was chosen as the risk assessment tool per ICH Q9 guidance on structured risk identification and evaluation for software systems.

**Scoring Basis**: The 42 failure modes (FM-SF-001 through FM-SF-042) were identified through static analysis of the SpecForge architecture, review of the specification behaviors and invariants, and analysis of external dependency failure characteristics (Neo4j, Claude Code CLI, ACP protocol layer, OAuth providers, SpecForge Server process). The system uses 8 consolidated agent roles across 5 predefined flows in solo and SaaS deployment modes, with a Tauri desktop app as primary local GUI.

**Thresholds**: The Acceptable (1--60) / Conditionally acceptable (61--99) / Unacceptable (100+) thresholds are calibrated to the maximum RPN of 1000. The thresholds are consistent with those used in the `@hex-di/guard` library-level FMEA.

---

### Review Schedule

The FMEA must be reviewed and updated when any of the following triggers occur:

| #   | Trigger                                     | Action                                                                                                                                                                        |
| --- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | New feature addition                        | Evaluate whether the feature introduces new failure modes or changes the Severity, Occurrence, or Detection scores of existing failure modes                                  |
| 2   | Field incident with severity Major or above | Re-assess the affected failure mode(s); update Occurrence and Detection scores based on empirical data; add new failure modes if the incident reveals an uncovered scenario   |
| 3   | Quarterly review (minimum cadence)          | Review all Unacceptable and Conditional failure modes; verify that compensating controls remain in place and effective; update scores if operational data warrants adjustment |
| 4   | External dependency change                  | Re-assess failure modes tied to the changed dependency (Neo4j version upgrade, Claude Code CLI changes, OAuth provider migration)                                             |
| 5   | Mitigation change                           | Re-assess the affected failure mode before or concurrent with the mitigation change                                                                                           |
