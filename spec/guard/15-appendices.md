# 15 - Appendices

<!-- Document Control
| Property         | Value                                    |
|------------------|------------------------------------------|
| Document ID      | GUARD-15                                 |
| Revision         | 1.0                                      |
| Effective Date   | 2026-02-13                               |
| Author           | HexDI Engineering                        |
| Reviewer         | GxP Compliance Review                    |
| Approved By      | Technical Lead, Quality Assurance Manager |
| Classification   | GxP Appendices & Reference               |
| Change History   | 1.0 (2026-02-13): Initial controlled release |
-->

_Previous: [14 - API Reference](./14-api-reference.md)_

---

## Appendix A: Architectural Decisions

Summary of the 36 key decisions that shape `@hex-di/guard`, with rationale for each.

| #   | Decision                                                                                                                                                      | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Permissions are branded nominal tokens, not strings                                                                                                           | Type safety: prevents passing arbitrary strings where a permission is expected. Compile-time differentiation of `Permission<"user", "read">` from `Permission<"user", "write">`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2   | Roles form a DAG (not tree) with cycle detection                                                                                                              | Expressive: `TeamLead` can inherit from both `Editor` and `Reviewer`. `flattenPermissions` detects cycles at runtime and returns `Err<CircularRoleInheritanceError>`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 3   | Policies are discriminated union data structures, not callbacks                                                                                               | Serializable, inspectable, testable. Policies can be sent to DevTools, stored in databases, and evaluated without executing arbitrary code.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 4   | Deny-overrides conflict resolution                                                                                                                            | Most secure default. If any applicable policy denies, the final decision is Deny. Matches AWS IAM / XACML semantics.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 5   | SubjectProvider in React is a pure context provider, not a DI scope                                                                                           | Prevents unnecessary scope nesting. The subject flows through React context independently of the DI container scope.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 6   | Permission format: `"resource:action"` string with phantom types                                                                                              | Ergonomic: `createPermissionGroup("user", ["read", "write"])` is concise. Object form available when metadata needed. Phantom types (`Permission<"user", "read">`) provide compile-time safety without runtime overhead.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 7   | `evaluate()` returns `Result<Decision, PolicyEvaluationError>`                                                                                                | Consistent with hex-di's Result-based error handling. Evaluation can fail (missing attributes, circular roles) -- these are expected failures, not programmer errors.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 8   | Guard wraps at the adapter level, not via Proxy                                                                                                               | Simpler, more predictable. The guard check happens at resolution time (when the factory runs), not at every method invocation. Method-level guards are opt-in via `methodPolicies`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 9   | Subject is immutable within a scope                                                                                                                           | Prevents TOCTOU (time-of-check-to-time-of-use) bugs. The subject is resolved once per scope and cached. No mid-request permission changes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 10  | Permission set precomputation (eager)                                                                                                                         | O(1) permission lookups. When a subject is created, `flattenPermissions` resolves the full transitive permission set once. All subsequent checks are Set.has() lookups.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 11  | Separate `@hex-di/guard-testing` package                                                                                                                      | Follows the `@hex-di/result-testing` pattern. Testing utilities (matchers, fixtures, memory adapters) are dev dependencies only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 12  | AuditTrailPort is mandatory for every guard() call; auditTrailAdapter is required in createGuardGraph(); logger and tracing remain optional soft dependencies | AuditTrailPort provides the guaranteed, structured audit record required for compliance. createNoopAuditTrailAdapter() provides explicit opt-in for non-regulated environments -- no silent defaults. Logger and tracing are supplementary: if present, guard emits structured log entries and tracing spans; if absent, zero overhead.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 13  | All policy objects are frozen (Object.freeze)                                                                                                                 | Immutability guarantees referential stability for React memoization. Frozen policies cannot be accidentally mutated after construction.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 14  | Error codes follow ACL001-ACL025 allocation                                                                                                                   | Consistent with the hex-di error code convention. Each error has a unique code for programmatic handling and documentation cross-referencing. ACL001-ACL019 cover core guard errors; ACL020-ACL025 cover GxP-specific integrity, clock, signature, WAL, completeness, and retention violations with FMEA cross-references.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 15  | `createGuardHooks()` factory for React (not global hooks)                                                                                                     | Follows `createTypedHooks()` pattern. Enables multiple independent guard contexts (main app + embedded widgets). Default export provides convenience single-context hooks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 16  | AuthSubject requires authenticationMethod and authenticatedAt fields                                                                                          | Every subject must declare its authentication provenance for audit compliance. The authenticationMethod identifies how the subject was authenticated (e.g., "oauth2", "api-key", "saml"), and authenticatedAt records when authentication occurred (ISO 8601).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 17  | All absolute timestamps in the guard system use ISO 8601 string format                                                                                        | Timestamps such as evaluatedAt and authenticatedAt use ISO 8601 strings (e.g., '2024-01-15T10:30:00.000Z') for human readability, JSON serialization, and cross-platform compatibility. Relative durations (durationMs) remain as number.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 18  | Integrity hashing and electronic signatures are optional fields on AuditEntry                                                                                 | Required only for GxP-regulated environments (21 CFR Part 11). Non-regulated environments omit these fields. The hash chain uses SHA-256 and is verified by replaying entries from genesis.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 19  | Clock source is injectable for testability and audit-grade timestamp control                                                                                  | Tests inject a fixed clock for deterministic timestamps. Production uses SystemClock (Date.toISOString()). The clock is passed via createGuardGraph() options.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 20  | AuditEntry includes reason and durationMs as required fields                                                                                                  | Full provenance: every audit record captures not just the verdict but why it was denied and how long evaluation took. The reason field is empty string for Allow decisions (not undefined) for consistent serialization.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 21  | Append-only semantics are a behavioral contract, not an enforced runtime constraint                                                                           | Guard cannot enforce database-level immutability. Instead, the AuditTrailPort behavioral contract (17-gxp-compliance/02-audit-trail-contract.md section 61) documents the four invariants that GxP-compliant adapters MUST satisfy: append-only, atomic writes, completeness, and NTP timestamps. Non-GxP adapters (including NoopAuditTrail) are exempt.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 22  | MCP resources and A2A skills have concrete input/output schemas                                                                                               | Following the Vision's diagnostic port philosophy, guard's MCP resources have defined JSON response schemas and A2A skills have typed input/output interfaces. This enables deterministic integration with AI agents and DevTools panels rather than unstructured data exchange.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 23  | SignatureServicePort is optional (unlike mandatory AuditTrailPort)                                                                                            | Electronic signatures are only required for 21 CFR Part 11 workflows involving the `hasSignature` policy variant. Most applications do not need signatures. Making the port optional avoids forcing every guard user to configure a signature adapter. When absent and `hasSignature` is used, NoopSignatureService returns Err for all operations.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 24  | Re-authentication is a method on SignatureService (not a separate port)                                                                                       | Keeps the signature workflow cohesive: capture, validate, and reauthenticate are three facets of the same concern. A separate ReauthenticationPort would scatter the contract across two ports with no benefit. The two-component identification requirement (11.100) is documented as a behavioral contract on `reauthenticate()`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 25  | `hasSignature` is the 7th policy variant (not a custom evaluator)                                                                                             | Adding `hasSignature` to the discriminated union keeps all policy evaluation in the same pure `evaluate()` function. This preserves serialization, trace tree generation, and exhaustive switch coverage. A custom evaluator would bypass the policy engine and lose trace visibility.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 26  | `GxPAuditEntry` is a strict subtype of `AuditEntry` with non-optional integrity fields                                                                        | Keeps `AuditEntry` lightweight for non-regulated environments (optional `integrityHash`, `previousHash`, `signature`) while giving GxP adapter implementations compile-time guarantees that these fields are always populated. GxP adapters declare `record(entry: GxPAuditEntry)` and the compiler enforces all three fields. Non-GxP adapters continue using `AuditEntry` with optional fields.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 27  | `failOnAuditError` option on `createGuardGraph()` with default `true`                                                                                         | Default `true` enforces fail-closed behavior per 21 CFR 11.10(e) completeness requirement: if the audit record cannot be persisted, the operation MUST NOT proceed because a missing audit record is a compliance violation. Non-regulated environments may opt-in to `false` to avoid Denial-of-Service when the audit trail backend is temporarily unavailable. The option is per-graph, not per-adapter, because audit failure policy is an infrastructure concern.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 28  | `signerRole` check uses `ValidatedSignature.signerRoles` (the signer's roles at capture time), not `context.subject.roles`                                    | In counter-signing workflows the signer and the subject can be different people. Checking the subject's roles would incorrectly deny when the signer (a different person) holds the required role but the subject does not. `signerRoles` is captured at signature time and travels with the `ValidatedSignature`, giving the evaluator the correct role set for the actual signer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 29  | Hash chain covers all 10 required `AuditEntry` fields plus integrity fields for complete tamper detection                                                     | The previous 4-field hash (evaluationId + timestamp + subjectId + decision) left 6 fields (authenticationMethod, policy, portName, scopeId, reason, durationMs) unprotected — an attacker could modify those fields without breaking the chain. Expanding to all 10 required fields ensures that any modification to any audit-relevant field is detectable. The hash additionally includes schemaVersion, sequenceNumber (ADR #30), traceDigest, policySnapshot, and previousHash for full chain integrity — see pseudocode in 17-gxp-compliance/02-audit-trail-contract.md section 61.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 30  | Concurrent audit trail writes use per-scope chains with monotonic sequence numbers                                                                            | A single global chain breaks under concurrent writes because interleaving produces non-deterministic hash chains. Per-scope chains confine ordering guarantees to the scope boundary — each scope maintains its own genesis entry and sequence counter. The `sequenceNumber` field enables O(1) gap detection (next expected = last + 1) without scanning the full chain. `scopeId` identifies which chain an entry belongs to. See 17-gxp-compliance/02-audit-trail-contract.md section 61.4a.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 31  | Field-level access control via optional `fields` property on `HasPermissionPolicy` and `HasAttributePolicy`                                                   | Enables GxP field masking (e.g., hide SSN while allowing patient record access) without breaking existing policies. `undefined` means all fields visible (backward compatible). `visibleFields` on `Allow` propagates through allOf (intersection) and anyOf (first-allowing child). `FieldMaskContextPort` delivers the mask to downstream adapters.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 32  | Built-in WAL with mandatory enforcement when `gxp: true`                                                                                                      | Closes the crash recovery gap between `evaluate()` and `record()`. Consumer WAL was RECOMMENDED; now the library ships `createWalAuditTrail()` and enforces WAL when GxP mode is active. Type-level rejection of `NoopAuditTrail` with `gxp: true`. `WalStore` interface for durable WAL storage.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 33  | Shipping IQ/OQ/PQ as `@hex-di/guard-validation`                                                                                                               | Programmatic validation runners produce auditable, timestamped qualification reports. Moves validation from manual checklists to automated, reproducible tooling. Separate package keeps the core guard bundle lean. `runIQ()`, `runOQ()`, and `generateTraceabilityMatrix()` produce structured result types.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 34  | Open-source supplier qualification via GAMP 5 risk-based approach                                                                                             | `@hex-di/guard` and its `@hex-di/*` dependencies are open-source. GAMP 5 Section 10 requires supplier qualification, but traditional audit approaches are impractical for open-source. ADR #34 adopts a risk-based approach: source code review (the spec IS the qualification document), automated IQ (integrity verification, vulnerability scanning, SBOM), OQ (functional verification via test suite), and periodic re-qualification on version upgrades. See Appendix G for full guidance.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 35  | `record()` durability tiers: "Durable Ok" vs "Buffered Ok"                                                                                                    | `AuditTrail.record()` returning `Ok` has different durability semantics depending on the adapter implementation. "Durable Ok" means synchronous persistence (survives crash); "Buffered Ok" means accepted into buffer (requires WAL for crash recovery). Making this explicit prevents false assumptions about data safety. Adapters MUST document their tier; WAL is REQUIRED for Buffered Ok adapters when `gxp: true`. See 17-gxp-compliance/02-audit-trail-contract.md section 61.3a.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 36  | `createAuditTrailConformanceSuite` as a reusable adapter validation harness                                                                                   | Instead of requiring each adapter author to re-implement the same 17 conformance tests for the GxP AuditTrailPort contract, the conformance suite ships in `@hex-di/guard-testing` as a parameterized test harness. Adapter authors call `createAuditTrailConformanceSuite({ factory })` and get standardized OQ evidence. Ensures consistent validation across all adapter implementations. See 13-testing.md.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 37  | `createGuardHealthCheck` for runtime canary evaluation                                                                                                        | Periodic review (section 64) requires ongoing verification. A dedicated health check function evaluates a canary policy, writes a canary audit entry, and verifies recent chain integrity — detecting silent pipeline degradation (evaluation errors, audit trail unresponsiveness, chain corruption) before production is affected. Returns a structured result suitable for automated scheduling and monitoring integration. See 07-guard-adapter.md.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 38  | Asymmetric algorithms required for GxP compliance evidence signatures                                                                                         | HMAC-SHA256 provides authentication but not non-repudiation — both signer and verifier hold the same key, so either party could have produced the signature. For compliance evidence (batch release, regulatory submissions, counter-signing per 21 CFR 11.50), non-repudiation is essential. Requiring asymmetric algorithms (RSA-SHA256 2048-bit or ECDSA P-256) ensures only the private key holder can produce the signature. HMAC-SHA256 remains permitted for development, testing, and non-regulatory operational signatures. See 17-gxp-compliance/07-electronic-signatures.md section 65c.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 39  | Maximum ReauthenticationToken lifetime for GxP environments                                                                                                   | Unbounded token lifetime creates a window where a signer can apply signatures long after re-authentication, violating the "continuous session" intent of 21 CFR 11.200(a)(1). A 15-minute ceiling balances compliance (limiting the reuse window) with usability (accommodating complex signing workflows). The recommended default remains 5 minutes. See 17-gxp-compliance/07-electronic-signatures.md section 65b.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 40  | Minimum cryptographic key sizes for SignatureService                                                                                                          | Key sizes below industry standards (RSA 2048-bit, ECDSA P-256, HMAC 256-bit) are computationally vulnerable to attack. Rejecting undersized keys at adapter construction time prevents misconfigured adapters from producing signatures that could later be challenged by regulators as cryptographically inadequate. Aligns with NIST SP 800-131A. See 17-gxp-compliance/07-electronic-signatures.md section 65c.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 41  | MemoryAuditTrail GxP readiness detection emits warn (not fail)                                                                                                | `MemoryAuditTrail` from `@hex-di/guard-testing` is non-durable (data lost on restart) and must not be used in GxP production. `checkGxPReadiness()` emits `warn` rather than `fail` because MemoryAuditTrail is valid for development and integration testing where GxP configuration is being validated before production deployment. A `fail` would block all pre-production GxP testing workflows. The warn provides clear visibility without blocking legitimate testing. When the deployment environment indicates production (NODE_ENV=production), the warn escalates to fail to prevent accidental GxP production deployment with a non-durable adapter. See 07-guard-adapter.md checkGxPReadiness item 11.                                                                                                                                                                                                                                                                                                                                             |
| 42  | Primary audit trail storage redundancy requirement                                                                                                            | Single-disk, non-replicated storage cannot survive a single physical storage failure. GxP audit trail data is compliance-critical and must be available for the full retention period (5-25+ years). Requiring data redundancy (RAID, replication, multi-AZ) on the primary backing store ensures that a single hardware failure does not result in audit data loss. This is a production infrastructure requirement verified during IQ, separate from backup/DR procedures (which protect against site-level disasters). See 17-gxp-compliance/04-data-retention.md section 63.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 43  | HSM/keystore/secrets manager REQUIRED (not RECOMMENDED) for GxP key storage                                                                                   | Signing key exposure (FM-07) carried a residual RPN of 10 with HSM as RECOMMENDED — the highest post-mitigation risk in the FMEA. Elevating to REQUIRED when gxp: true reduces Detectability from 2 to 1 (HSM provides automatic tamper detection), bringing FM-07 mitigated RPN from 10 to 5 and eliminating the last Medium-risk failure mode. Non-GxP environments retain RECOMMENDED status. See 17-gxp-compliance/07-electronic-signatures.md section 65c.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 44  | MemoryAuditTrail checkGxPReadiness escalation: warn→fail in production                                                                                        | ADR #41 established warn for MemoryAuditTrail to avoid blocking pre-production GxP testing. However, accidental production deployment with MemoryAuditTrail is a critical compliance risk (FM-13). Adding production environment detection (NODE_ENV=production) allows escalation to fail in production while preserving warn in development/testing. See 07-guard-adapter.md checkGxPReadiness item 11.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 45  | `maxScopeLifetimeMs` REQUIRED for GxP mode                                                                                                                    | Long-lived scopes (WebSocket connections, background workers, batch processors) can hold stale subject permissions indefinitely. If a subject's access is revoked after scope creation, the revocation has no effect until the scope is destroyed. In GxP environments, revoked access must take effect promptly per 21 CFR 11.10(d). Requiring `maxScopeLifetimeMs` when `gxp: true` forces periodic scope refresh and re-authentication, bounding the window during which stale permissions can persist. Type-level enforcement ensures the option cannot be accidentally omitted. See 07-guard-adapter.md, FMEA FM-19.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 46  | Empty string sentinel for absent `responseTimestamp` in HTTP audit entries                                                                                    | When an HTTP operation fails at the transport level (connection refused, DNS failure, timeout), no response is received and `responseTimestamp` has no meaningful value. Using `""` (empty string) rather than `null`, `undefined`, or a placeholder timestamp preserves hash chain determinism (empty string is included as-is in the hash input) and avoids introducing a fake timestamp that would violate ALCOA+ Contemporaneous. ISO 8601 validation MUST NOT be applied to an empty `responseTimestamp`. See http-client spec 19-http-audit-bridge.md (§91-§97).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 47  | Signature canonical payload (13 fields) excludes `previousHash` from the hash chain field set (14 fields)                                                     | Electronic signatures bind to the **content** of an audit entry — the facts of what happened (who, what, when, why). The `previousHash` field encodes **positional integrity** — where the entry sits in the chain. These are independent concerns: a signature attests that the signer approved the content, regardless of the entry's position. Including `previousHash` in the signature payload would mean re-signing every entry whenever the chain is replayed or reordered during export/import, which is operationally infeasible. Hash chain integrity (section 61.4) handles positional tamper detection independently of signatures (section 65a). The 13-field signature payload covers: evaluationId, timestamp, subjectId, authenticationMethod, policy, decision, portName, scopeId, reason, durationMs, schemaVersion, sequenceNumber, traceDigest. The 14-field hash chain input adds `previousHash` to this set. See 17-gxp-compliance/02-audit-trail-contract.md section 61.4 and 17-gxp-compliance/07-electronic-signatures.md section 65a. |

---

## Appendix B: Competitive Comparison

| Feature              | @hex-di/guard                                                            | casl                            | casbin                   | accesscontrol           | oso                 |
| -------------------- | ------------------------------------------------------------------------ | ------------------------------- | ------------------------ | ----------------------- | ------------------- |
| **Model**            | RBAC + ABAC + policy combinator DSL                                      | RBAC + conditions               | PERM model (pluggable)   | RBAC with grants        | Polar policy lang   |
| **Serializable**     | Yes (JSON)                                                               | Yes (JSON rules)                | Yes (model/policy files) | No (runtime only)       | Yes (Polar files)   |
| **DI Integration**   | Native (ports, adapters, resolution hooks)                               | Manual wiring                   | Manual wiring            | Manual wiring           | SDK-specific        |
| **Type Safety**      | Branded nominal types, phantom type params, compile-time validation      | Partial (string-based subjects) | None (string config)     | Partial (string grants) | None (external DSL) |
| **React Support**    | Native (`SubjectProvider`, `Can`, `Cannot`, `useCan`, `usePolicy`)       | `@casl/react`                   | None                     | None                    | None                |
| **Policy Language**  | TypeScript DSL (allOf, anyOf, not, hasPermission, hasRole, hasAttribute) | JSON/MongoDB-style conditions   | CONF model definition    | String-based grants     | Polar (custom DSL)  |
| **Evaluation Trace** | Full tree trace in Decision                                              | No                              | No                       | No                      | No                  |
| **DevTools**         | Native inspector + snapshot                                              | No                              | No                       | No                      | No                  |
| **Testing Utils**    | `@hex-di/guard-testing` with matchers, fixtures, memory adapters         | Manual                          | Manual                   | Manual                  | Manual              |
| **Bundle Size**      | Tree-shakable, zero dep                                                  | ~12KB                           | ~50KB+ (wasm)            | ~8KB                    | ~100KB+ (wasm)      |

### Key Differentiators

1. **Native DI integration**: @hex-di/guard is designed from the ground up for the hex-di container. Guard policies attach to adapters via `guard()`, enforcement happens via resolution hooks, and the subject flows through DI scopes. No glue code needed.

2. **Full type safety**: Permission and Role tokens are branded nominal types with phantom type parameters. The TypeScript compiler catches permission typos, missing permissions, and role hierarchy errors at compile time.

3. **Serializable policies with evaluation trace**: Policies are plain data structures (not callbacks), enabling JSON serialization, DevTools inspection, and snapshot testing. Every evaluation produces a full trace tree showing which sub-policies passed or failed and why.

---

## Appendix C: Glossary

| Term                                | Definition                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Permission**                      | A branded token representing authorization for a specific resource:action pair (e.g., `user:delete`).                                                                                                                                                                                                                                                                                                                                                                                    |
| **Role**                            | A branded token representing a named collection of permissions with optional inheritance from other roles.                                                                                                                                                                                                                                                                                                                                                                               |
| **Resource**                        | Type alias for `Readonly<Record<string, unknown>>`. Arbitrary key-value bag describing the resource being accessed, used by the matcher DSL in attribute-based policies.                                                                                                                                                                                                                                                                                                                 |
| **Policy**                          | A discriminated union data structure that expresses an authorization rule. One of: `hasPermission`, `hasRole`, `hasAttribute`, `hasSignature`, `allOf`, `anyOf`, `not`.                                                                                                                                                                                                                                                                                                                  |
| **Decision**                        | The result of evaluating a policy: `{ kind: "allow" \| "deny", reason, policy, trace, evaluationId, evaluatedAt, subjectId }`. The evaluationId (UUID v4) uniquely identifies each evaluation for audit correlation. The evaluatedAt field records the ISO 8601 timestamp of the evaluation.                                                                                                                                                                                             |
| **Subject**                         | The entity being authorized (the "who"). Carries id, roles, permissions, attributes, authenticationMethod, and authenticatedAt.                                                                                                                                                                                                                                                                                                                                                          |
| **Guard**                           | A wrapper around an adapter that enforces a policy before the adapter's factory runs.                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Port Gate Hook**                  | A resolution hook that intercepts port resolution to evaluate guard policies before the adapter factory executes.                                                                                                                                                                                                                                                                                                                                                                        |
| **Policy Engine**                   | The stateless evaluation engine that recursively evaluates policies against a subject and resource context.                                                                                                                                                                                                                                                                                                                                                                              |
| **Evaluation Trace**                | A tree of trace nodes recording which policies were evaluated and their individual decisions.                                                                                                                                                                                                                                                                                                                                                                                            |
| **Matcher DSL**                     | The set of attribute comparison operators (eq, neq, in, exists) used in `hasAttribute` policies.                                                                                                                                                                                                                                                                                                                                                                                         |
| **Audit Trail**                     | A structured, append-only record of every guard evaluation. Implemented via AuditTrailPort. GxP-compliant adapters must satisfy the behavioral contract in 17-gxp-compliance/02-audit-trail-contract.md section 61.                                                                                                                                                                                                                                                                      |
| **ALCOA+**                          | Data integrity framework: Attributable, Legible, Contemporaneous, Original, Accurate + Complete, Consistent, Enduring, Available. See 17-gxp-compliance/01-regulatory-context.md section 60 for guard's mapping.                                                                                                                                                                                                                                                                         |
| **Closed System**                   | An environment in which system access is controlled by persons who are responsible for the content of electronic records that are on the system. Per 21 CFR 11.3(b)(4). In closed systems, the SHA-256 checksum alone is sufficient for audit trail export integrity verification (section 36).                                                                                                                                                                                          |
| **GxP**                             | Good Practice regulations (FDA 21 CFR Part 11, EU GMP Annex 11, GAMP 5). Guard's compliance guide is in 17-gxp-compliance.md.                                                                                                                                                                                                                                                                                                                                                            |
| **Electronic Signature**            | A cryptographic signature bound to an audit entry, capturing who signed, when, the meaning, and the algorithm used. Defined by `ElectronicSignature` type. Required for 21 CFR Part 11 compliance.                                                                                                                                                                                                                                                                                       |
| **Re-authentication**               | The process of verifying a signer's identity immediately before signature capture. Uses two-component identification: signerId (identification) + credential (verification). Required by 11.100.                                                                                                                                                                                                                                                                                         |
| **Signature Meaning**               | A string describing the intent of a signature (e.g., "authored", "reviewed", "approved"). Standard meanings defined in `SignatureMeanings` constants. Used by `hasSignature` policies.                                                                                                                                                                                                                                                                                                   |
| **SignatureService**                | The service interface for electronic signature operations: `capture()`, `validate()`, `reauthenticate()`. Consumer adapters implement the actual cryptography.                                                                                                                                                                                                                                                                                                                           |
| **Trace Digest**                    | A compact string summarizing the evaluation trace tree for audit review without the full nested structure.                                                                                                                                                                                                                                                                                                                                                                               |
| **GxPAuditEntry**                   | Strict subtype of `AuditEntry` where `integrityHash`, `previousHash`, and `signature` are required (non-optional). Used by GxP-regulated audit trail adapters for compile-time guarantees. See ADR #26.                                                                                                                                                                                                                                                                                  |
| **Counter-Signing**                 | GxP pattern where multiple signers independently attest to a record (e.g., author + witness). Expressed via `allOf` with multiple `hasSignature` policies using distinct `signerRole` values. Each signer re-authenticates independently. See 17-gxp-compliance/07-electronic-signatures.md section 65d.                                                                                                                                                                                 |
| **Dual-Timing Strategy**            | The guard system's use of two distinct clocks: `ClockSource.now()` (absolute, NTP-synchronized, for audit timestamps) and `performance.now()` (relative, monotonic, for `durationMs`). See 17-gxp-compliance/03-clock-synchronization.md section 62.                                                                                                                                                                                                                                     |
| **FMEA**                            | Failure Mode and Effects Analysis. A systematic risk assessment technique that identifies potential failure modes, their causes, effects, and mitigations. Scored using Severity, Likelihood, and Detectability to produce a Risk Priority Number (RPN). See 17-gxp-compliance/10-risk-assessment.md section 68.                                                                                                                                                                         |
| **IQ (Installation Qualification)** | Documented verification that the system is installed correctly per its specification. Checks package version, dependencies, compiler, and lint compliance. See 17-gxp-compliance/09-validation-plan.md section 67a.                                                                                                                                                                                                                                                                      |
| **OQ (Operational Qualification)**  | Documented verification that the system operates correctly within its specified operating ranges. Exercises the full test suite and mutation testing. See 17-gxp-compliance/09-validation-plan.md section 67b.                                                                                                                                                                                                                                                                           |
| **PQ (Performance Qualification)**  | Documented verification that the system meets performance requirements under production-representative conditions. Measures latency, throughput, memory stability. See 17-gxp-compliance/09-validation-plan.md section 67c.                                                                                                                                                                                                                                                              |
| **RPN (Risk Priority Number)**      | Numerical risk score calculated as Severity x Likelihood x Detectability (each 1-5, max 125). Used in FMEA to prioritize mitigations. See 17-gxp-compliance/10-risk-assessment.md section 68.                                                                                                                                                                                                                                                                                            |
| **Sequence Number**                 | A monotonically increasing integer assigned per scope to each audit entry before hash computation. Enables O(1) gap detection and ensures deterministic ordering of concurrent writes within a scope. See ADR #30 and 17-gxp-compliance/02-audit-trail-contract.md section 61.4a.                                                                                                                                                                                                        |
| **Traceability Matrix**             | A document mapping regulatory requirements to spec sections, test cases, and verification evidence. Provides end-to-end traceability from regulation to implementation. See 17-gxp-compliance/11-traceability-matrix.md section 69.                                                                                                                                                                                                                                                      |
| **Field Mask**                      | A set of field names that a subject is authorized to see on a resource. Produced by `visibleFields` on `Allow` decisions. Propagated via `FieldMaskContextPort`. `undefined` means all fields visible (no restriction). Empty set means no fields visible.                                                                                                                                                                                                                               |
| **WAL (Write-Ahead Log)**           | A durable intent log written before an operation to ensure recoverability after crashes. In guard, the WAL records evaluation intent before `evaluate()` runs. Managed via `WalStore` interface. Mandatory when `gxp: true` via `createWalAuditTrail()`.                                                                                                                                                                                                                                 |
| **Validation Runner**               | A programmatic utility that executes IQ, OQ, or PQ checks and produces structured qualification reports. Shipped in `@hex-di/guard-validation`. `runIQ()` checks installation, `runOQ()` runs the test suite, `generateTraceabilityMatrix()` produces the regulatory mapping.                                                                                                                                                                                                            |
| **Durability Tier**                 | Classification of an `AuditTrail.record()` adapter's persistence guarantee: "Durable Ok" (synchronous commit, survives crash) or "Buffered Ok" (accepted into buffer, requires WAL for crash recovery when `gxp: true`). Each adapter MUST document its tier. See ADR #35 and 17-gxp-compliance/02-audit-trail-contract.md section 61.3a.                                                                                                                                                |
| **Conformance Suite**               | A reusable parameterized test harness (`createAuditTrailConformanceSuite`) that validates any `AuditTrailPort` adapter against the GxP behavioral invariants (append-only, atomic writes, completeness, hash chain integrity, no silent defaults, concurrency, field limits, durability, boundary-exact values, Unicode integrity) via 17 standardized test cases. See ADR #36 and 13-testing.md.                                                                                        |
| **Health Check**                    | A runtime canary function (`createGuardHealthCheck`) that evaluates a known policy, writes a canary audit entry, and verifies recent hash chain integrity. Used for scheduled (e.g., daily) monitoring to detect silent pipeline degradation. See ADR #37 and 07-guard-adapter.md.                                                                                                                                                                                                       |
| **GxP Readiness**                   | A pre-deployment diagnostic (`checkGxPReadiness`) that inspects a guard graph configuration for 13 GxP prerequisites (gxp flag, non-Noop audit trail, non-MemoryAuditTrail, failOnAuditError, WalStore, policies, SignatureService, ClockSource, asymmetric algorithm check, clock drift monitoring, MemoryAuditTrail production escalation, maxScopeLifetimeMs verification, port gate hook detection). Returns a structured report with pass/warn/fail items. See 07-guard-adapter.md. |
| **Non-Repudiation**                 | The assurance that the signer of a record cannot deny having signed it. Achieved through asymmetric cryptographic algorithms (RSA, ECDSA) where only the signer holds the private key. Symmetric algorithms (HMAC) do NOT provide non-repudiation because both signer and verifier share the same key. Required for GxP compliance evidence per ADR #38. See 17-gxp-compliance/07-electronic-signatures.md section 65c.                                                                  |
| **Open System**                     | An environment in which system access is NOT controlled by persons who are responsible for the content of electronic records that are on the system. Per 21 CFR 11.3(b)(9). Open systems require additional controls including digital signatures on audit trail export manifests (section 36) and encrypted transport (section 63).                                                                                                                                                     |
| **Account Lockout**                 | A security control that disables a signer's ability to re-authenticate after a configurable number of consecutive failed attempts. Prevents brute-force attacks on signer credentials. REQUIRED for `SignatureService.reauthenticate()` implementations per 21 CFR 11.300(d). See 17-gxp-compliance/07-electronic-signatures.md section 65b.                                                                                                                                             |
| **Export Manifest**                 | A metadata block included with audit trail exports containing: total entry count, first/last integrity hashes, scope IDs, SHA-256 checksum of the export file, and export timestamp. Recipients verify the manifest before using the export as compliance evidence. See 17-gxp-compliance/05-audit-trail-review.md section 64.                                                                                                                                                           |
| **VMP (Validation Master Plan)**    | An organizational document defining the validation strategy, scope, responsibilities, and schedule for all computerized systems. The Validation Plan (section 67) is the system-specific instance within the VMP framework.                                                                                                                                                                                                                                                              |
| **UAT (User Acceptance Testing)**   | Testing conducted by the end-user organization to verify that the deployed system meets their specific operational requirements. For guard, UAT validates the guard configuration against the site's access control requirements using representative subject scenarios. UAT is a consumer responsibility, separate from the library-level OQ testing. See 17-gxp-compliance/09-validation-plan.md section 67 and EU GMP Annex 11 Section 4.4.                                           |
| **Data Redundancy**                 | A storage architecture property where data is maintained on multiple physical storage devices simultaneously (e.g., RAID, database replication, cloud multi-AZ deployment). Required for the primary audit trail backing store in GxP environments to survive a single physical storage failure without data loss. See ADR #42 and 17-gxp-compliance/04-data-retention.md section 63.                                                                                                    |

---

## Appendix D: Type Relationship Diagram

```
Permission<TResource, TAction>
  |
  +-- PermissionGroupMap<TResource, TActions>
  |     Keyed by action name, values are Permission tokens
  |
  +-- InferResource<T>     extracts TResource
  +-- InferAction<T>       extracts TAction
  +-- FormatPermission<T>  produces "TResource:TAction"

Role<TName, TPermissions>
  |
  +-- permissions: ReadonlyArray<PermissionConstraint>
  +-- inherits: ReadonlyArray<RoleConstraint>
  |
  +-- FlattenRolePermissions<T>  resolves all inherited permissions
  +-- ValidateRoleInheritance<T> detects cycles at type level
  +-- InferRoleName<T>          extracts TName

Policy (discriminated union)
  |
  +-- HasPermissionPolicy  { kind: "hasPermission", permission }
  +-- HasRolePolicy        { kind: "hasRole", roleName }
  +-- HasAttributePolicy   { kind: "hasAttribute", attribute, matcher }
  +-- HasSignaturePolicy   { kind: "hasSignature", meaning, signerRole? }
  +-- AllOfPolicy          { kind: "allOf", policies: Policy[] }
  +-- AnyOfPolicy          { kind: "anyOf", policies: Policy[] }
  +-- NotPolicy            { kind: "not", policy: Policy }

AuthSubject
  |
  +-- id: string
  +-- roles: readonly string[]
  +-- permissions: ReadonlySet<string>
  +-- attributes: Readonly<Record<string, unknown>>
  +-- authenticationMethod: string
  +-- authenticatedAt: string (ISO 8601)

Decision
  |
  +-- kind: "allow" | "deny"
  +-- reason: string
  +-- policy: string (human-readable label)
  +-- trace: EvaluationTrace
  +-- evaluationId: string (UUID v4)
  +-- evaluatedAt: string (ISO 8601)
  +-- subjectId: string

GuardedAdapter<TAdapter>
  |
  +-- provides: TProvides (same as inner adapter)
  +-- requires: AppendAclPorts<TRequiresTuple> (deduplicating SubjectProviderPort, PolicyEnginePort, AuditTrailPort)
  +-- guardMetadata: { policy, methodPolicies? }

SignatureService
  |
  +-- capture(SignatureCaptureRequest)   --> Result<ElectronicSignature, SignatureError>
  +-- validate(ElectronicSignature, data) --> Result<SignatureValidationResult, SignatureError>
  +-- reauthenticate(ReauthenticationChallenge) --> Result<ReauthenticationToken, SignatureError>

GxPAuditEntry extends AuditEntry
  |
  +-- integrityHash: string   (required, not optional)
  +-- previousHash: string    (required, not optional)
  +-- signature: ElectronicSignature (required, not optional)

ValidatedSignature (in EvaluationContext.signatures array)
  |
  +-- signerId, signedAt, meaning, validated, reauthenticated
  +-- signerRoles?: ReadonlyArray<string>

FieldMaskContext
  |
  +-- visibleFields: ReadonlySet<string> | undefined
  +-- evaluationId: string
  +-- Provided via FieldMaskContextPort when Allow has visibleFields

WalStore
  |
  +-- writeIntent(WalIntent)    --> Result<void, WalError>
  +-- markCompleted(evalId)     --> Result<void, WalError>
  +-- getPendingIntents()       --> Result<ReadonlyArray<WalIntent>, WalError>

WalIntent
  |
  +-- evaluationId, portName, subjectId, timestamp
  +-- status: "pending" | "completed" | "evaluation_failed"

evaluate(policy, context) --> Result<Decision, PolicyEvaluationError>
                                      |
                                      +-- Ok(Decision)
                                      +-- Err(PolicyEvaluationError)
```

---

## Appendix E: Comparison with Existing hex-di Patterns

This table maps @hex-di/guard concepts to existing patterns in the hex-di ecosystem.

| Guard Concept                | Existing Pattern                         | Package                   |
| ---------------------------- | ---------------------------------------- | ------------------------- |
| `Permission` branded token   | `Port` branded token                     | `@hex-di/core`            |
| `createPermission()`         | `port<T>()()`                            | `@hex-di/core`            |
| `createPermissionGroup()`    | Port groups (manual)                     | `@hex-di/core`            |
| `Role` with inheritance      | No direct equivalent                     | --                        |
| Policy discriminated union   | Error code discriminated unions          | `@hex-di/core`            |
| `evaluate()` returns Result  | `tryResolve()` returns Result            | `@hex-di/runtime`         |
| `guard()` adapter wrapper    | `createAdapter()` with requires          | `@hex-di/core`            |
| `SubjectProviderPort`        | `LoggerPort`, `TracerPort`               | `@hex-di/logger`, tracing |
| Resolution hook enforcement  | `ResolutionHooks.beforeResolve`          | `@hex-di/runtime`         |
| `instrumentGuard(container)` | `instrumentContainer(container, tracer)` | `@hex-di/tracing`         |
| `MemoryPolicyEngine`         | `MemoryTracer`, `MemoryLogger`           | `@hex-di/tracing`, logger |
| `setupGuardMatchers()`       | `setupResultMatchers()`                  | `@hex-di/result-testing`  |
| `createGuardHooks()`         | `createTypedHooks()`                     | `@hex-di/react`           |
| `SubjectProvider` component  | `HexDiContainerProvider`                 | `@hex-di/react`           |
| `Can` / `Cannot` components  | No direct equivalent (new)               | --                        |
| `useCan()` hook              | `usePort()` hook                         | `@hex-di/react`           |
| `GuardInspector`             | `TracingInspector`, `LoggerInspector`    | `@hex-di/tracing`, logger |
| Error codes (ACL001-ACL025)  | LOG001-LOG008, TRC001-TRC005             | `@hex-di/logger`, tracing |

---

## Appendix F: Error Code Reference

| Code   | Name                            | Category         | Description                                                  | Severity | Incident Response                                                                          | Resolution                                                                                                                                                                                                                                                                                                                                     |
| ------ | ------------------------------- | ---------------- | ------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ACL001 | `AccessDeniedError`             | Authorization    | Policy evaluation resulted in denial.                        | S=2      | Log + review if repeated for same subject                                                  | Check that the subject has the required permissions or roles. Inspect `decision.reason` and `decision.trace` for details.                                                                                                                                                                                                                      |
| ACL002 | `CircularRoleInheritanceError`  | Configuration    | Role inheritance graph contains a cycle.                     | S=3      | Immediate configuration review                                                             | Review role definitions. Ensure no role directly or transitively inherits from itself. The `roleName` field and error message show the cycle path.                                                                                                                                                                                             |
| ACL003 | `PolicyEvaluationError`         | Evaluation       | Policy evaluation failed due to a runtime error.             | S=4      | Investigate root cause; escalate if recurring                                              | Check the `cause` field. Common causes: missing attribute on resource, matcher threw an exception.                                                                                                                                                                                                                                             |
| ACL004 | `NotAPermissionError`           | Type             | Value passed is not a branded Permission token.              | S=2      | Development fix required                                                                   | Use `createPermission()` or `createPermissionGroup()` to create permissions. Do not construct permission-like objects manually.                                                                                                                                                                                                                |
| ACL005 | `NotARoleError`                 | Type             | Value passed is not a branded Role token.                    | S=2      | Development fix required                                                                   | Use `createRole()` to create roles. Do not construct role-like objects manually.                                                                                                                                                                                                                                                               |
| ACL006 | `DuplicatePermissionWarning`    | Configuration    | Same resource:action pair registered by different calls.     | S=1      | Advisory; consolidate in next release                                                      | Consolidate permission creation. Use `createPermissionGroup()` to define all permissions for a resource in one place.                                                                                                                                                                                                                          |
| ACL007 | `PolicyParseError`              | Serialization    | Policy deserialization failed.                               | S=3      | Investigate data source; block activation of malformed policy                              | Check the `path` and `category` fields. Common causes: unknown `kind`, missing required fields, invalid JSON, unsupported schema version.                                                                                                                                                                                                      |
| ACL008 | `AuditTrailWriteError`          | Compliance       | Audit trail write failed.                                    | S=5      | **Critical:** Halt operations if failOnAuditError is true; immediate storage investigation | The guard decision was made but the audit record could not be persisted. Check the `cause` field for the underlying write failure. Ensure the AuditTrail adapter is correctly configured and its backing store is available.                                                                                                                   |
| ACL009 | `SignatureError`                | Compliance       | Electronic signature operation failed.                       | S=4      | Investigate immediately; suspend signing operations if key-related                         | Check the `category` field: `capture_failed` (crypto error), `validation_failed` (integrity check failed), `reauth_failed` (credential rejected), `reauth_expired` (token expired), `key_revoked` (signing key revoked), `binding_broken` (signature bound to wrong data), `missing_service` (no SignatureService configured).                 |
| ACL010 | `WalError`                      | WAL              | Write-ahead log operation failed.                            | S=5      | **Critical:** Investigate durable storage immediately; risk of audit data loss             | Check the `cause` field. Common causes: durable storage unavailable, write permission denied, WAL file corrupted. Ensure the `WalStore` implementation is backed by durable storage.                                                                                                                                                           |
| ACL011 | `ConfigurationError`            | Configuration    | GxP mode requires failOnAuditError: true.                    | S=4      | Block deployment; correct configuration before GxP operation                               | When `gxp: true`, `failOnAuditError` must be `true` (or omitted, as `true` is the default). Explicitly passing `false` with `gxp: true` triggers ACL011.                                                                                                                                                                                       |
| ACL012 | `ConfigurationError`            | Configuration    | NoopAuditTrail not permitted in GxP mode.                    | S=5      | **Critical:** Block deployment; provide real audit trail adapter                           | When `gxp: true`, a real audit trail adapter must be provided. `NoopAuditTrail` discards all records and violates ALCOA+ Complete. Use a persistent adapter (PostgreSQL, EventStoreDB, etc.).                                                                                                                                                  |
| ACL013 | `ScopeExpiredError`             | Authorization    | Scope lifetime exceeded maxScopeLifetimeMs.                  | S=3      | Expected behavior; monitor for excessive frequency                                         | The scope has been alive longer than the configured maximum. Create a new scope with a fresh subject. The expired scope's permissions may be stale.                                                                                                                                                                                            |
| ACL014 | `AuditEntryParseError`          | Serialization    | Audit entry deserialization failed.                          | S=3      | Investigate data integrity; check for schema version mismatch                              | Check the `field` and `category` fields. Common causes: missing required field, unknown schemaVersion, invalid UUID format, field exceeds size limit, malformed JSON.                                                                                                                                                                          |
| ACL015 | `RateLimitExceededError`        | Authorization    | Evaluation rate exceeded maxEvaluationsPerSecond.            | S=2      | Monitor source; potential DoS indicator                                                    | The guard is receiving too many evaluation requests. Reduce request frequency or increase the rate limit. Rate-limited requests are not audited because no evaluation occurred.                                                                                                                                                                |
| ACL016 | `AuditTrailReadError`           | Audit Trail      | Audit trail read/query operation failed.                     | S=3      | Investigate storage connectivity and permissions                                           | A read or query operation on the audit trail failed. Check the underlying storage adapter connection and permissions.                                                                                                                                                                                                                          |
| ACL017 | `AdminOperationDeniedError`     | Authorization    | Administrative operation not authorized.                     | S=4      | Investigate unauthorized admin access attempt; verify role assignment                      | An administrative operation on the guard infrastructure was denied. Check that the subject has the required administrative role (section 64g). Repeated denials may indicate an unauthorized access attempt and should be escalated per the site's security incident procedure.                                                                |
| ACL018 | `HashChainBreakError`           | Audit Trail      | Hash chain integrity break detected.                         | S=5      | **Critical:** Quarantine scope immediately; initiate chain break response per §61.4 SLA    | A hash chain integrity verification failed. This indicates potential data tampering or corruption. In GxP mode, the affected scope is quarantined and an alert is triggered per the chain break response SLA (1h alert, 4h quarantine, 24h incident report). Investigate the root cause before resuming operations on the affected scope.      |
| ACL019 | `ClockSynchronizationError`     | Clock            | Clock synchronization drift or NTP unavailability.           | S=3      | Monitor NTP service; verify clock drift within tolerance                                   | The clock source detected NTP drift exceeding 1 second or NTP service unavailability. In GxP mode, audit entries are recorded with degraded timestamp metadata and an operational alert is triggered. In non-GxP mode, best-effort timestamps are used. Check NTP service configuration and network connectivity to the NTP server.            |
| ACL020 | `HashChainIntegrityError`       | GxP Integrity    | Hash chain recomputation mismatch on write.                  | S=5      | **Critical:** Halt writes to affected scope; initiate FM-04 response                       | The hash chain integrity check at write time detected a mismatch between the computed hash and the expected previousHash. This indicates corruption in the chain, possibly from a concurrent writer bypassing the guard pipeline. Quarantine the scope and investigate per §61.4 chain break response SLA. FMEA: FM-04 (Hash chain tampering). |
| ACL021 | `ClockDriftViolationError`      | GxP Clock        | Clock drift exceeded GxP tolerance threshold.                | S=4      | Investigate NTP infrastructure; suspend GxP writes until resolved                          | The clock source detected drift exceeding the configurable GxP tolerance (default: 500ms). Unlike ACL019 (general drift warning), ACL021 indicates the drift has crossed the threshold where audit timestamp accuracy is compromised for GxP compliance. FMEA: FM-12 (Clock drift).                                                            |
| ACL022 | `SignatureVerificationError`    | GxP Signature    | Signature verification failed during audit chain validation. | S=5      | **Critical:** Quarantine affected entries; initiate key compromise investigation           | During audit chain verification, a signature failed cryptographic validation. This may indicate key compromise, data tampering, or algorithm downgrade. Trigger FM-07 (Key exposure) and FM-08 (Algorithm downgrade) response procedures. FMEA: FM-07, FM-08.                                                                                  |
| ACL023 | `WalReplayError`                | GxP WAL          | WAL replay encountered an unrecoverable inconsistency.       | S=5      | **Critical:** Manual intervention required; do not discard WAL entries                     | During WAL recovery, a pending intent could not be reconciled with the audit trail state. The intent may reference a scope that no longer exists or an evaluationId that was already committed with different data. Requires manual QA review per §61 WAL recovery procedure. FMEA: FM-13 (Audit data loss).                                   |
| ACL024 | `CompletenessGapError`          | GxP Completeness | Audit trail completeness gap detected.                       | S=4      | Investigate missing entries; check for dropped evaluations                                 | The completeness monitor detected a discrepancy between the number of guard evaluations and the number of audit entries recorded. This violates ALCOA+ "Complete" principle. Review the guard pipeline for dropped entries, audit trail write failures, or race conditions. FMEA: FM-03 (Silent audit failure).                                |
| ACL025 | `RetentionPolicyViolationError` | GxP Retention    | Audit entry lifecycle violated retention policy.             | S=4      | Investigate retention enforcement; restore if possible                                     | An audit entry was detected as being deleted, modified, or made inaccessible before its regulatory retention period expired. This violates the "Enduring" ALCOA+ principle and the retention requirements in §63. FMEA: FM-14 (Premature data deletion).                                                                                       |

#### FMEA Cross-Reference for GxP Error Codes

The following table maps GxP-specific error codes (ACL020-ACL025) to their corresponding FMEA failure modes (section 68) and the regulatory requirements they enforce:

| Error Code | FMEA ID(s)   | Regulatory Reference                    | Detection Method                             |
| ---------- | ------------ | --------------------------------------- | -------------------------------------------- |
| ACL020     | FM-04        | 21 CFR 11.10(c), ALCOA+ Original        | Write-time hash recomputation                |
| ACL021     | FM-12        | 21 CFR 11.10(e), ALCOA+ Contemporaneous | Clock drift monitoring (§62)                 |
| ACL022     | FM-07, FM-08 | 21 CFR 11.10(c), 11.50                  | Chain verification with signature validation |
| ACL023     | FM-13        | 21 CFR 11.10(e), ALCOA+ Complete        | WAL replay reconciliation                    |
| ACL024     | FM-03        | 21 CFR 11.10(e), ALCOA+ Complete        | Completeness monitor (§61)                   |
| ACL025     | FM-14        | 21 CFR 11.10(c), ALCOA+ Enduring        | Retention policy enforcement (§63)           |

---

## Appendix G: Open-Source Supplier Qualification (GAMP 5)

Per GAMP 5 Section 10, organizations must assess suppliers of GxP-critical software. For open-source components like `@hex-di/guard` and its `@hex-di/*` dependencies, traditional supplier audit approaches (on-site audits, supplier questionnaires) are impractical. This appendix provides risk-based qualification guidance aligned with GAMP 5 Category 5 (custom software) and EU GMP Annex 11 Section 3 (suppliers and service providers).

```
REQUIREMENT: Organizations deploying @hex-di/guard in GxP environments MUST perform
             supplier qualification for the guard library and its @hex-di/* dependencies
             using the risk-based approach described below. The qualification MUST be
             documented and retained as part of the validation documentation.

REQUIREMENT: Initial qualification MUST include:
             (1) Source code availability: Confirm the library source code is publicly
                 accessible and the license permits use in GxP-regulated environments.
             (2) Specification review: Confirm the specification documents (spec/guard/*.md)
                 exist, are version-controlled, and define behavioral contracts for
                 GxP-relevant functionality (audit trail, electronic signatures, hash
                 chain integrity).
             (3) Test suite assessment: Confirm the library ships with a comprehensive
                 test suite covering the GxP-relevant contracts. Record the test count,
                 coverage metrics, and mutation testing results.
             (4) Integrity verification: Perform IQ-8 (package integrity) and IQ-9
                 (vulnerability scan) per the IQ checklist (section 67a).
             (5) SBOM generation: Generate a Software Bill of Materials for the full
                 dependency tree per the IQ recommendation.

REQUIREMENT: Re-qualification MUST be performed when:
             (1) The @hex-di/guard version is upgraded (major, minor, or patch).
             (2) A critical or high vulnerability is disclosed in any @hex-di/* dependency.
             (3) The library's license terms change.
             (4) A transitive dependency receives a critical or high severity security
                 patch. Even if @hex-di/guard itself is unchanged, a security-patched
                 transitive dependency alters the supply chain integrity baseline and
                 MUST trigger re-qualification of the affected IQ checks (IQ-8, IQ-9).
             Re-qualification follows the same steps as initial qualification, with
             focus on the delta from the previously qualified version.

RECOMMENDED: Organizations SHOULD subscribe to the @hex-di/guard release notifications
             and vulnerability advisories (e.g., GitHub security advisories, npm audit
             notifications) to enable timely re-qualification.
```

> **ADR #34 Rationale:** Traditional supplier qualification assumes a commercial vendor relationship with audit rights, quality agreements, and dedicated support. Open-source software operates under a different model: the source code IS the quality evidence, the test suite IS the functional verification, and the specification IS the design documentation. By treating the specification and test suite as the primary qualification evidence, organizations can satisfy GAMP 5 supplier qualification requirements without requiring a non-existent vendor relationship. The IQ/OQ/PQ framework (section 67) provides the formal verification structure that maps to traditional qualification activities.

---

## Appendix H: Reference Adapter Integration Patterns

This appendix provides reference architectures for integrating `@hex-di/guard` with three common persistence backends. Each pattern includes schema design, adapter skeleton, and GxP compliance notes.

### H.1 PostgreSQL with Row-Level Security (RLS)

**Schema:**

```sql
-- Append-only audit trail table with RLS
CREATE TABLE guard_audit_entries (
  evaluation_id    UUID PRIMARY KEY,
  timestamp        TIMESTAMPTZ NOT NULL,
  subject_id       VARCHAR(255) NOT NULL,
  authentication_method VARCHAR(64) NOT NULL,
  policy           VARCHAR(512) NOT NULL,
  decision         VARCHAR(5) NOT NULL CHECK (decision IN ('allow', 'deny')),
  port_name        VARCHAR(128) NOT NULL,
  scope_id         UUID NOT NULL,
  reason           VARCHAR(2048) NOT NULL DEFAULT '',
  duration_ms      NUMERIC NOT NULL,
  schema_version   INTEGER NOT NULL DEFAULT 1,
  -- GxP fields (required when gxp: true)
  trace_digest     TEXT,
  integrity_hash   VARCHAR(128),
  previous_hash    VARCHAR(128),
  hash_algorithm   VARCHAR(32),
  sequence_number  BIGINT,
  policy_snapshot  VARCHAR(64),
  signature_json   JSONB,
  -- Enforce append-only: no UPDATE or DELETE
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for regulatory queries
CREATE INDEX idx_audit_subject_date ON guard_audit_entries (subject_id, timestamp);
CREATE INDEX idx_audit_scope ON guard_audit_entries (scope_id, sequence_number);

-- RLS: only the guard service role can INSERT; no role can UPDATE or DELETE
ALTER TABLE guard_audit_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_insert_only ON guard_audit_entries
  FOR INSERT TO guard_service_role
  WITH CHECK (true);
-- No SELECT policy for guard_service_role; read access via separate audit_reviewer_role
CREATE POLICY audit_read ON guard_audit_entries
  FOR SELECT TO audit_reviewer_role
  USING (true);
```

**Adapter skeleton:**

```typescript
function createPostgresAuditTrailAdapter(pool: Pool): Adapter<typeof AuditTrailPort> {
  return createAdapter(AuditTrailPort, {
    record(entry: AuditEntry): Result<void, AuditTrailWriteError> {
      // INSERT INTO guard_audit_entries ...
      // ON CONFLICT (evaluation_id) DO NOTHING is NOT correct for GxP:
      // a duplicate evaluationId indicates a replay or bug, not a benign retry.
      // Instead: detect the conflict and return Err(AuditTrailWriteError) with
      // message indicating the duplicate evaluationId.
      // Return Ok(undefined) on success, Err(AuditTrailWriteError) on failure
    },
  });
}
```

```
RECOMMENDED: PostgreSQL audit trail adapters SHOULD run
             createAuditTrailConformanceSuite() (13-testing.md) as part of
             adapter OQ evidence. The RLS configuration SHOULD be verified
             during IQ to confirm that UPDATE and DELETE are blocked.
```

### H.2 AWS QLDB (Quantum Ledger Database)

**Table definition:**

```json
{
  "TableName": "GuardAuditEntries",
  "Indexes": [
    { "IndexName": "SubjectDateIndex", "Expression": "[subjectId, timestamp]" },
    { "IndexName": "ScopeIndex", "Expression": "[scopeId, sequenceNumber]" }
  ]
}
```

AWS QLDB provides built-in immutability (append-only journal with cryptographic verification). This eliminates the need for application-level hash chaining, though `@hex-di/guard` hash chains provide an additional layer of defense-in-depth.

**Adapter skeleton:**

```typescript
function createQldbAuditTrailAdapter(driver: QldbDriver): Adapter<typeof AuditTrailPort> {
  return createAdapter(AuditTrailPort, {
    record(entry: AuditEntry): Result<void, AuditTrailWriteError> {
      // driver.executeLambda(txn => txn.execute("INSERT INTO GuardAuditEntries ?", entry))
      // QLDB rejects duplicate document IDs automatically
    },
  });
}
```

```
RECOMMENDED: QLDB adapters SHOULD run createAuditTrailConformanceSuite() as part
             of adapter OQ evidence. QLDB's built-in digest verification SHOULD
             be used alongside @hex-di/guard's verifyAuditChain() for defense-in-depth.
```

### H.3 EventStoreDB

**Stream naming convention:** `guard-audit-{scopeId}`

Each scope maps to a separate stream, aligning with `@hex-di/guard`'s per-scope chain model. EventStoreDB's append-only streams and built-in ordering provide natural alignment with the audit trail contract.

**Adapter skeleton:**

```typescript
function createEventStoreAuditTrailAdapter(
  client: EventStoreDBClient
): Adapter<typeof AuditTrailPort> {
  return createAdapter(AuditTrailPort, {
    record(entry: AuditEntry): Result<void, AuditTrailWriteError> {
      // const streamName = `guard-audit-${entry.scopeId}`;
      // client.appendToStream(streamName, jsonEvent({ type: "AuditEntry", data: entry }))
      // Use expectedRevision for optimistic concurrency control
    },
  });
}
```

```
RECOMMENDED: EventStoreDB adapters SHOULD run createAuditTrailConformanceSuite()
             as part of adapter OQ evidence. EventStoreDB's WAL integration provides
             natural crash recovery, reducing the need for @hex-di/guard's WalStore
             (though WalStore remains REQUIRED when gxp: true per the type system).
```

### HSM Reference Adapter Pattern

The following pattern demonstrates the behavioral contract for a `SignatureServicePort` adapter backed by a Hardware Security Module (HSM):

```typescript
/**
 * HSM-backed SignatureService reference pattern.
 * Demonstrates the behavioral contract for §65c-1 (HSM integration).
 *
 * Key characteristics:
 * - Private keys never leave the HSM boundary
 * - Key ceremony requires dual-person control
 * - Key rotation transitions old keys to verify-only state
 * - HSM unavailability returns Err with "hsm_unavailable" category
 */
interface HsmSignatureServicePattern {
  /** HSM health check — returns Ok if HSM is reachable and responsive. */
  readonly checkHsmHealth: () => Result<{ latencyMs: number }, SignatureError>;

  /** Key ceremony initiation — requires two authorized personnel. */
  readonly initiateKeyCeremony: (
    initiator: GxPAuthSubject,
    witness: GxPAuthSubject
  ) => Result<KeyCeremonyRecord, SignatureError>;

  /** Key rotation — generates new key on HSM, transitions old key to verify-only. */
  readonly rotateSigningKey: (
    ceremony: KeyCeremonyRecord
  ) => Result<KeyRotationAuditEntry, SignatureError>;
}

interface KeyCeremonyRecord {
  readonly _tag: "KeyCeremonyRecord";
  readonly ceremonyId: string;
  readonly initiatorId: string;
  readonly witnessId: string;
  readonly initiatedAt: string;
  readonly purpose: "initial_generation" | "rotation" | "recovery";
}

interface KeyRotationAuditEntry {
  readonly _tag: "KeyRotationAuditEntry";
  readonly previousKeyId: string;
  readonly newKeyId: string;
  readonly rotatedAt: string;
  readonly ceremonyId: string;
}
```

---

## Appendix I: Regulatory Inspector Walkthrough Script

This appendix provides a structured demonstration procedure for presenting `@hex-di/guard` to regulatory inspectors (FDA, EU GMP, WHO). The walkthrough covers all major compliance areas and is designed to be completed in approximately 60 minutes.

### Prerequisites

- Production-representative environment with `@hex-di/guard` deployed
- Access to audit trail data (minimum 100 entries across multiple scopes)
- `checkGxPReadiness()` report showing all items passing
- IQ/OQ/PQ validation reports available
- Designated demonstrator with system knowledge

### Step 1: System Overview (5 min)

Present the system architecture:

- Show the guard pipeline (SubjectProvider → PolicyEngine → AuditTrail)
- Identify the `@hex-di/guard` components in the application architecture diagram
- Explain the port/adapter pattern and how it enables testability
- Reference GAMP 5 Category 5 classification

### Step 2: Access Control Demonstration (10 min)

Demonstrate authorization in action:

- Show a successful (Allow) resolution with audit entry
- Show a failed (Deny) resolution with reason and audit entry
- Show the `AuditEntry` fields and explain each (evaluationId, timestamp, subjectId, etc.)
- Demonstrate that both Allow and Deny produce audit entries (ALCOA+ Complete)

### Step 3: Audit Trail Integrity (10 min)

Demonstrate tamper detection:

- Run `verifyAuditChain()` on a scope and show passing result
- Explain hash chain computation (show the field list and pipe delimiter)
- Demonstrate tamper detection: modify an entry and show `verifyAuditChain()` failure
- Show `schemaVersion` in entries and explain forward-compatible deserialization

### Step 4: Electronic Signature Workflow (10 min)

Demonstrate the complete signature lifecycle:

- Show re-authentication (`reauthenticate()` → `ReauthenticationToken`)
- Show signature capture (`capture()` → `ElectronicSignature` with `reauthenticated: true`)
- Show signature validation (`validate()` → integrity and binding checks)
- Show key revocation and its effect on new captures vs existing validations

### Step 5: Health Check and GxP Readiness (5 min)

Run diagnostic tools:

- Execute `checkGxPReadiness()` and walk through all 13 items
- Execute `createGuardHealthCheck()` and show the structured result
- Show clock drift measurement and tolerance

### Step 6: Export and Archival (10 min)

Demonstrate data portability:

- Export audit entries to JSON with `AuditExportManifest`
- Show the manifest checksum verification process
- Export to CSV and show column mapping
- Verify chain integrity on the exported data
- Reference retention requirements (section 63)

### Step 7: Validation Evidence (5 min)

Present qualification documentation:

- IQ report with all 11 checks passing
- OQ report with all 23 checks passing (unit, type, integration tests)
- PQ report with performance benchmarks
- Traceability matrix (section 69) showing regulation-to-test mapping
- FMEA (section 68) showing all 31 failure modes mitigated (all Low)

### Step 8: Q&A and Supporting Documents (5 min)

Provide reference materials:

- Guard specification document set (`spec/guard/*.md`)
- Validation reports (IQ/OQ/PQ)
- Change control procedures (section 64a)
- Incident classification matrix (section 68)
- Training documentation (section 64c)

---

## Appendix J: Audit Entry Schema Versioning Policy

The `schemaVersion` field on `AuditEntry`, `GxPAuditEntry`, `AuditExportManifest`, and `WalIntent` enables forward-compatible evolution of the audit entry schema without breaking hash chain verification or compliance tooling.

### Version Increment Rules

```
REQUIREMENT: The `schemaVersion` field MUST follow semantic versioning (MAJOR.MINOR.PATCH)
             with the following increment rules:
             (a) MAJOR increment: when a field is removed, renamed, or its type changes in
                 a way that breaks existing hash chain verification or audit trail query
                 tooling. A MAJOR increment invalidates all prior hash chains and MUST
                 trigger a full OQ re-run (section 64a).
             (b) MINOR increment: when a new field is added to the audit entry schema.
                 Existing hash chain verification MUST continue to pass (new fields are
                 appended to the pipe-delimited hash input). A MINOR increment MUST
                 trigger OQ-6 and OQ-7 re-verification.
             (c) PATCH increment: when field documentation, validation rules, or
                 non-structural metadata changes without affecting the persisted schema.
                 No re-verification is required.
             The version MUST be stored as an integer for the initial release series
             (version 1, 2, 3, ...) and transition to "MAJOR.MINOR.PATCH" string format
             only if a MINOR or PATCH distinction becomes necessary. The initial integer
             format (version 1) is equivalent to "1.0.0".
             Reference: EU GMP Annex 11 §4.7, GAMP 5 (configuration management).
```

### Initial Version Matrix

| Entry Type            | Current `schemaVersion` | Introduced In | Notes                                      |
| --------------------- | ----------------------- | ------------- | ------------------------------------------ |
| `AuditEntry`          | 1                       | v1.0.0        | Base audit entry with 10 required fields   |
| `GxPAuditEntry`       | 1                       | v1.0.0        | Extends `AuditEntry` with integrity fields |
| `AuditExportManifest` | 1                       | v1.0.0        | Export manifest with checksum verification |
| `WalIntent`           | 1                       | v1.0.0        | Write-ahead log intent record              |

### Cross-Version Compatibility

```
REQUIREMENT: Audit trail query tooling and `verifyAuditChain()` MUST handle entries with
             different `schemaVersion` values within the same chain. Specifically:
             (a) Hash chain verification MUST use the hash computation algorithm
                 corresponding to each entry's `schemaVersion`, not the current version.
             (b) Query results MUST include the `schemaVersion` field so that consumers
                 can interpret each entry according to its schema.
             (c) Export manifests MUST record the set of `schemaVersion` values present
                 in the exported data (e.g., `schemaVersions: [1]`).
             (d) When a MAJOR version increment occurs, the migration procedure (below)
                 MUST be followed before mixed-version chains are created.
             Reference: 21 CFR 11.10(c), ALCOA+ Enduring.
```

### Migration Guidance

When a schema version increment is required:

1. **Document the change** in a change request per section 64a (policy change control), including the old and new schema definitions, the fields affected, and the increment type (MAJOR/MINOR/PATCH).
2. **Update the hash computation** (for MAJOR or MINOR) to include or exclude the changed fields, ensuring backward-compatible verification for prior entries.
3. **Update the version matrix** above and the `schemaVersion` default in the `AuditEntry` factory.
4. **Re-run the affected OQ checks** (OQ-6 for hash chain, OQ-7 for field completeness) and document the results in the OQ report.
5. **Retain the prior schema documentation** as an appendix to the migration change request, ensuring that auditors can reconstruct the meaning of historical entries.

---

## Appendix K: Deviation Report Template

This template provides a standardized structure for documenting deviations identified during GxP operation of `@hex-di/guard`. It aligns with ICH Q9 risk management principles and EU GMP Annex 11 §13 incident management requirements.

### Deviation Report Fields

| Field                           | Format                   | Description                                                                                        |
| ------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------- |
| **Deviation ID**                | `DEV-GUARD-YYYY-NNN`     | Unique identifier. YYYY = year, NNN = sequential number within year.                               |
| **Date Identified**             | ISO 8601 UTC             | When the deviation was first identified.                                                           |
| **Identified By**               | Name + Role              | Person who identified the deviation.                                                               |
| **Classification**              | Critical / Major / Minor | Aligned to FMEA severity scoring (section 68): Critical = S≥4, Major = S=3, Minor = S≤2.           |
| **Description**                 | Free text                | Detailed description of the deviation including what was expected vs. what occurred.               |
| **Affected Component**          | Guard component name     | E.g., "Audit Trail", "Policy Evaluator", "Electronic Signatures", "Hash Chain".                    |
| **Related FMEA ID**             | FM-XX                    | Cross-reference to the FMEA failure mode table (section 68) if applicable.                         |
| **Root Cause Analysis**         | Structured               | Use 5-Why analysis or Ishikawa (fishbone) diagram per ICH Q9. Document each analysis step.         |
| **Impact Assessment**           | Structured               | Describe the impact on data integrity, patient safety, product quality, and regulatory compliance. |
| **Immediate Corrective Action** | Action + Owner + Date    | Actions taken immediately to contain the deviation.                                                |

### CAPA Actions Table

| #   | Action | Type                    | Owner | Target Date | Completion Date | Verification Method |
| --- | ------ | ----------------------- | ----- | ----------- | --------------- | ------------------- |
| 1   |        | Corrective / Preventive |       |             |                 |                     |
| 2   |        | Corrective / Preventive |       |             |                 |                     |
| 3   |        | Corrective / Preventive |       |             |                 |                     |

### RPN Scoring (Pre- and Post-CAPA)

| Metric            | Pre-CAPA  | Post-CAPA |
| ----------------- | --------- | --------- |
| Severity (S)      | 1-5       | 1-5       |
| Likelihood (L)    | 1-5       | 1-5       |
| Detectability (D) | 1-5       | 1-5       |
| **RPN**           | S × L × D | S × L × D |

> RPN scoring aligns with the FMEA methodology in section 68. Post-CAPA RPN SHOULD be ≤ 10.

### Approval Workflow

| Step                      | Role            | Name | Signature | Date |
| ------------------------- | --------------- | ---- | --------- | ---- |
| 1. Investigation Complete | QA Specialist   |      |           |      |
| 2. CAPA Approved          | Quality Manager |      |           |      |
| 3. CAPA Implemented       | System Owner    |      |           |      |
| 4. CAPA Verified          | QA Specialist   |      |           |      |

### Effectiveness Check Schedule

| Check  | Timeline          | Method                                                              | Owner           | Status |
| ------ | ----------------- | ------------------------------------------------------------------- | --------------- | ------ |
| 30-day | 30 days post-CAPA | Review audit trail for recurrence; verify OQ regression test passes | QA              |        |
| 60-day | 60 days post-CAPA | Review operational metrics; confirm no related deviations           | QA              |        |
| 90-day | 90 days post-CAPA | Final effectiveness assessment; close deviation or escalate         | Quality Manager |        |

> **Reference:** ICH Q9 (quality risk management), EU GMP Annex 11 §13 (incident management), GAMP 5 (corrective and preventive action).

---

## Appendix P: Predicate Rules Mapping Template

Section 59 (01-regulatory-context.md) REQUIRES that predicate rule mapping be performed prior to deployment. Section 63 (04-data-retention.md) defines port-to-record-type retention mapping. Section 67 (09-validation-plan.md) requires traceability between regulatory requirements and test evidence. This appendix provides a comprehensive template and worked examples for mapping predicate rules to regulated activities, bridging those three requirements.

### Template

| Predicate Rule                           | Regulated Activity                      | Affected Guard Ports                | Retention Period                   | Audit Trail Fields                                           | Signature Requirements                             |
| ---------------------------------------- | --------------------------------------- | ----------------------------------- | ---------------------------------- | ------------------------------------------------------------ | -------------------------------------------------- |
| _Policy expression (e.g., `allOf(...)`)_ | _Regulatory activity this rule governs_ | _Port names protected by this rule_ | _Minimum retention per section 63_ | _Additional audit fields required beyond the 10 base fields_ | _Electronic signature requirements per section 65_ |

### Worked Examples

#### Example 1: Pharmaceutical Batch Records

| Predicate Rule                                                                        | Regulated Activity                         | Affected Guard Ports                  | Retention Period                                        | Audit Trail Fields                                                                       | Signature Requirements                                                                                                                                   |
| ------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allOf(hasRole("qa_manager"), hasSignature("approved"))`                              | Batch release authorization                | `BatchReleasePort`, `BatchRecordPort` | 5 years after batch certification (EU GMP Chapter 4.10) | `policySnapshot` capturing active release policy; `traceDigest` for full evaluation path | Asymmetric signature (RSA-SHA256 2048-bit or ECDSA P-256) per section 65c; meaning: "approved"; re-authentication required per 11.100                    |
| `allOf(hasRole("production_operator"), hasPermission("batch:execute"))`               | Batch execution step recording             | `BatchExecutionPort`                  | 5 years after batch certification (EU GMP Chapter 4.10) | Standard 10 required fields                                                              | None (operational access, not approval)                                                                                                                  |
| `allOf(hasRole("qa_reviewer"), hasSignature("reviewed"), not(hasRole("qa_manager")))` | Batch record review (separation of duties) | `BatchReviewPort`                     | 5 years after batch certification (EU GMP Chapter 4.10) | `policySnapshot`; `traceDigest`                                                          | Asymmetric signature; meaning: "reviewed"; `signerRole` must be `qa_reviewer`; counter-signing with `qa_manager` via separate `hasSignature("approved")` |

#### Example 2: Medical Device Design History

| Predicate Rule                                                  | Regulated Activity                             | Affected Guard Ports                   | Retention Period                              | Audit Trail Fields                                        | Signature Requirements                                                                                                                                                 |
| --------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------- | --------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allOf(hasRole("design_engineer"), hasPermission("dhf:write"))` | Design History File (DHF) modification         | `DesignHistoryPort`, `DesignInputPort` | Lifetime of device + 2 years (21 CFR 820.184) | Standard 10 required fields; `traceDigest`                | None for drafts                                                                                                                                                        |
| `allOf(hasRole("design_authority"), hasSignature("approved"))`  | Design review approval                         | `DesignReviewPort`                     | Lifetime of device + 2 years (21 CFR 820.184) | `policySnapshot`; `traceDigest`                           | Asymmetric signature; meaning: "approved"; re-authentication required                                                                                                  |
| `allOf(hasSignature("authored"), hasSignature("reviewed"))`     | Design verification sign-off (counter-signing) | `DesignVerificationPort`               | Lifetime of device + 2 years (21 CFR 820.184) | `policySnapshot`; `traceDigest`; both signatures recorded | Counter-signing per section 65d: `signerRole: "test_engineer"` (authored) + `signerRole: "design_authority"` (reviewed); independent re-authentication for each signer |

#### Example 3: Clinical Trial Laboratory Results

| Predicate Rule                                                      | Regulated Activity                    | Affected Guard Ports               | Retention Period                                        | Audit Trail Fields              | Signature Requirements                                                                                                         |
| ------------------------------------------------------------------- | ------------------------------------- | ---------------------------------- | ------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `allOf(hasRole("lab_analyst"), hasPermission("lab:enter_results"))` | Laboratory result entry               | `LabResultPort`                    | Duration of clinical trial + 25 years (ICH E6(R2) §8.1) | Standard 10 required fields     | None for initial entry                                                                                                         |
| `allOf(hasRole("lab_analyst"), hasSignature("authored"))`           | Laboratory result attestation         | `LabResultPort`                    | Duration of clinical trial + 25 years (ICH E6(R2) §8.1) | `policySnapshot`; `traceDigest` | Asymmetric signature; meaning: "authored"; re-authentication required                                                          |
| `allOf(hasRole("lab_supervisor"), hasSignature("reviewed"))`        | Laboratory result review and approval | `LabResultPort`, `LabApprovalPort` | Duration of clinical trial + 25 years (ICH E6(R2) §8.1) | `policySnapshot`; `traceDigest` | Asymmetric signature; meaning: "reviewed"; `signerRole: "lab_supervisor"`; counter-signing with analyst's "authored" signature |

> **Note:** These examples are illustrative. Organizations MUST adapt the predicate rules, port names, retention periods, and signature requirements to their specific regulatory context and operational workflows. The mapping MUST be documented in the validation plan (section 67) and reviewed during periodic review (section 64). See section 59 for open system classification requirements, section 63 for retention period guidance, and section 67 for validation traceability.

---

## Appendix M: Operational Risk Guidance

This appendix provides guidance for low-severity operational concerns that fall outside the scope of the library-level FMEA (section 68) but are relevant to production deployments.

> **Scope note:** The FMEA in section 68 covers library-level failure modes with Severity >= 4 (Major and Critical). The operational concerns below have Severity 1-3 and are included as deployment guidance rather than formal failure modes. Organizations MAY incorporate these into their site-level risk assessment.

### Low-Severity Operational Concerns

| ID    | Concern                                      | Severity       | Guidance                                                                                                                     |
| ----- | -------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| OP-01 | Audit trail query latency degradation        | 2 (Minor)      | Monitor query response times; implement indexing per §63a recommendations; consider partitioning for >10K entries per query. |
| OP-02 | Excessive WARNING logs from field truncation | 1 (Negligible) | Review field length limits in validation plan; consider increasing limits for fields that routinely exceed defaults.         |
| OP-03 | Clock drift approaching 1-second threshold   | 2 (Minor)      | NTP monitoring (section 62) detects drift; investigate NTP infrastructure before threshold breach.                           |
| OP-04 | Multi-part export complexity                 | 2 (Minor)      | Use recommended 500MB part boundaries (section 64e); verify chain continuity across parts during PQ.                         |
| OP-05 | Policy diff report storage growth            | 1 (Negligible) | Archive diff reports per §64a-1 retention requirements; consider compression for large diff reports.                         |

---

## Appendix N: STRIDE Threat Model

This appendix provides a formal STRIDE threat model for `@hex-di/guard`, identifying threat actors, attack surfaces, trust boundaries, and mapping each threat to existing FMEA mitigations and spec controls.

### Trust Boundaries

| Boundary | Description               | Components Inside                                            | Components Outside                                        |
| -------- | ------------------------- | ------------------------------------------------------------ | --------------------------------------------------------- |
| TB-1     | Guard evaluation pipeline | Policy evaluator, audit trail writer, WAL, hash chain engine | Subject provider, external IdP, audit trail backing store |
| TB-2     | DI container scope        | Scoped subject, guarded adapters, scope-local audit chain    | Parent scope, sibling scopes, external systems            |
| TB-3     | Signature service         | Key management, re-authentication, capture/validate          | HSM/keystore, external credential store                   |
| TB-4     | Audit trail persistence   | In-memory buffer, WAL intent log                             | Durable backing store (PostgreSQL, SQLite, EventStoreDB)  |
| TB-5     | Administrative operations | AdminGuardConfig, policy change control                      | External change management system, operator workstation   |

### Threat Actors

| Actor | Description                   | Capability Level                                         | Motivation                                    |
| ----- | ----------------------------- | -------------------------------------------------------- | --------------------------------------------- |
| TA-1  | Malicious insider (developer) | High: source code access, DI container manipulation      | Privilege escalation, audit trail tampering   |
| TA-2  | Compromised service account   | Medium: runtime access to container scope                | Unauthorized data access, silent audit bypass |
| TA-3  | External attacker (network)   | Low-Medium: no direct code access, network-level attacks | Data exfiltration, denial of service          |
| TA-4  | Malicious administrator       | High: admin role access, policy change authority         | Policy manipulation, evidence destruction     |
| TA-5  | Compromised dependency        | High: transitive code execution within process           | Supply chain attack, cryptographic key theft  |

### STRIDE Analysis

| ID   | Category                   | Threat Description                                                        | Attack Surface | Threat Actor(s) | FMEA Mapping | Spec Controls                                                                                                                                                                               | Residual Risk | GxP Residual |
| ---- | -------------------------- | ------------------------------------------------------------------------- | -------------- | --------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------ |
| S-01 | **S**poofing               | Forge AuthSubject identity by registering a rogue SubjectProvider adapter | TB-1, TB-2     | TA-1, TA-2      | FM-08        | ADR #9 (immutable subject per scope); audit trail records subject attributes (ALCOA+ Attributable); security test §52.3 scenario 7                                                          | Low           | Low          |
| S-02 | **S**poofing               | Replay a valid ReauthenticationToken to forge electronic signatures       | TB-3           | TA-2, TA-3      | FM-06        | Token expiration (§65b, 15-min max lifetime ADR #39); one-time-use tokens; security test §52.2 scenario 4                                                                                   | Low           | Low          |
| T-01 | **T**ampering              | Modify audit trail entries after persistence                              | TB-4           | TA-1, TA-4      | FM-05        | SHA-256 hash chain (§61.4); append-only storage (§61.1); `verifyAuditChain()` detects modification                                                                                          | Low           | Low          |
| T-02 | **T**ampering              | Alter policy definition at runtime without audit record                   | TB-1, TB-5     | TA-4            | FM-23        | PolicyChangeAuditEntry REQUIRED (§64a); separation of duties; hash chain participation; `createPolicyDiffReport()` (§50)                                                                    | Low           | Low          |
| T-03 | **T**ampering              | Splice entries from different chains to fabricate audit history           | TB-4           | TA-1, TA-4      | FM-04        | Per-scope chains with scopeId (ADR #30); sequenceNumber monotonicity; previousHash linkage; cross-scope splicing detectable                                                                 | Low           | Low          |
| R-01 | **R**epudiation            | Signer denies having approved a record (no non-repudiation)               | TB-3           | TA-2            | FM-07        | Asymmetric algorithms REQUIRED for GxP compliance evidence (ADR #38); HSM REQUIRED when gxp:true (ADR #43); re-authentication before signing (§65b)                                         | Low           | Low          |
| R-02 | **R**epudiation            | Administrator denies policy change responsibility                         | TB-5           | TA-4            | FM-25        | AdminGuardConfig with deny-by-default (§64g); all admin ops logged (§64b); separation of duties (§64a); ACL017 for unauthorized attempts                                                    | Low           | Low          |
| I-01 | **I**nformation Disclosure | Timing side-channel reveals permission set membership                     | TB-1           | TA-3            | —            | Constant-time evaluation REQUIRED when gxp:true (§DoD security, §65b-1); constant-time padding normalizes evaluation duration; constant-time signature comparison REQUIRED in GxP (§65b-1)  | Low           | Low          |
| I-02 | **I**nformation Disclosure | Signing key exposure via source code or environment variables             | TB-3           | TA-1, TA-5      | FM-07        | HSM/keystore REQUIRED when gxp:true (ADR #43); IQ-10 key material scan; NIST SP 800-57 compliance                                                                                           | Low           | Low          |
| I-03 | **I**nformation Disclosure | Audit trail data leaked via unsecured export                              | TB-4           | TA-3, TA-4      | —            | Export manifest with SHA-256 checksum (§64e); digital signatures for open systems (§59); encrypted transport REQUIRED for open systems (§63)                                                | Low           | Low          |
| D-01 | **D**enial of Service      | Evaluation flooding exhausts resources                                    | TB-1           | TA-3            | FM-20        | `maxEvaluationsPerSecond` rate limiting (optional in non-GxP; REQUIRED when gxp:true); `RateLimitSummaryAuditEntry` for audit visibility; WARNING log on activation; operational monitoring | Medium        | **Low**      |
| D-02 | **D**enial of Service      | Audit trail backend unavailability blocks all operations                  | TB-4           | TA-3            | FM-03, FM-17 | `failOnAuditError: true` (fail-closed); WAL crash recovery; business continuity plan (§61 BCP); completeness monitoring                                                                     | Low           | Low          |
| E-01 | **E**levation of Privilege | Bypass guard() via direct port resolution                                 | TB-1, TB-2     | TA-1            | FM-12        | Guard wraps at adapter level (ADR #8); port gate hook intercepts resolution; security test §52.3 scenario 9                                                                                 | Low           | Low          |
| E-02 | **E**levation of Privilege | Escalate to admin operations without admin role                           | TB-5           | TA-2, TA-3      | FM-25        | AdminGuardConfig deny-by-default (§64g); ACL017 error code; admin operation audit (§64b)                                                                                                    | Low           | Low          |
| E-03 | **E**levation of Privilege | Exploit stale scope permissions after access revocation                   | TB-2           | TA-2            | FM-19        | `maxScopeLifetimeMs` REQUIRED when gxp:true (ADR #45); `ScopeExpiredError` (ACL013); periodic scope refresh                                                                                 | Low           | Low          |

### Threat Summary

The "Residual Risk" column reflects the general (non-GxP) deployment posture. The "GxP Residual" column reflects the residual risk when `gxp: true`, where additional REQUIRED controls are active.

| Category               | Threat Count | High Residual | Medium Residual | Low Residual | GxP: Medium | GxP: Low |
| ---------------------- | ------------ | ------------- | --------------- | ------------ | ----------- | -------- |
| Spoofing               | 2            | 0             | 0               | 2            | 0           | 2        |
| Tampering              | 3            | 0             | 0               | 3            | 0           | 3        |
| Repudiation            | 2            | 0             | 0               | 2            | 0           | 2        |
| Information Disclosure | 3            | 0             | 0               | 3            | 0           | 3        |
| Denial of Service      | 2            | 0             | 1 (D-01)        | 1            | 0           | **2**    |
| Elevation of Privilege | 3            | 0             | 0               | 3            | 0           | 3        |
| **Total**              | **15**       | **0**         | **1**           | **14**       | **0**       | **15**   |

> **GxP Residual Risk Note:** When `gxp: true`, all 15 threats have Low residual risk. D-01 (evaluation flooding) drops from Medium to Low because `maxEvaluationsPerSecond` is REQUIRED when `gxp: true`, making rate limiting mandatory with `RateLimitSummaryAuditEntry` for audit trail visibility (mitigated RPN = 3 per FM-20 note). I-01 (timing side-channel) is Low in both columns because constant-time evaluation padding is REQUIRED when `gxp: true` (GCR-2026-001). For non-GxP deployments, D-01 remains Medium because rate limiting is optional; organizations SHOULD implement rate limiting and document the decision in their risk assessment per ICH Q9.

---

## Appendix O: Condensed Clock Specification Summary

This appendix provides a standalone summary of the clock infrastructure requirements for the guard library. The authoritative clock specification is `spec/clock/`, and this summary enables auditing the guard spec as a standalone document without cross-referencing.

### ClockSource Interface

```typescript
interface ClockSource {
  now(): string; // Returns ISO 8601 UTC timestamp (e.g., "2024-01-15T10:30:00.000Z")
}
```

`ClockSource.now()` bridges over `ClockPort.wallClockNow()` from `@hex-di/clock`. The `createClockSourceBridge()` function adapts `ClockPort` to `ClockSource` by converting epoch-millisecond to ISO 8601 UTC via `new Date(clock.wallClockNow()).toISOString()`.

### Dual-Clock Architecture

| Property            | `ClockSource.now()`                                      | `performance.now()`                   |
| ------------------- | -------------------------------------------------------- | ------------------------------------- |
| **Type**            | Absolute wall-clock time                                 | Relative monotonic counter            |
| **Source**          | `ClockPort.wallClockNow()` via bridge (NTP-synchronized) | Browser/Node.js high-resolution timer |
| **Format**          | ISO 8601 UTC string                                      | Floating-point milliseconds           |
| **Use in guard**    | `evaluatedAt`, `timestamp`, `signedAt`                   | `durationMs`                          |
| **NTP-sensitive**   | Yes (requires synchronization)                           | No (hardware counter)                 |
| **Monotonic**       | No (can jump forward/backward with NTP corrections)      | Yes (always increases)                |
| **GxP requirement** | NTP sync within 1-second tolerance (§62)                 | No NTP requirement                    |

### Timestamp Fields in Guard

| Field                          | Location          | Source                | Purpose                                         |
| ------------------------------ | ----------------- | --------------------- | ----------------------------------------------- |
| `Decision.evaluatedAt`         | Policy evaluator  | Guard ClockSource     | When the authorization decision was made        |
| `AuditEntry.timestamp`         | Guard wrapper     | Guard ClockSource     | When the audit entry was recorded               |
| `AuthSubject.authenticatedAt`  | Subject adapter   | Authentication system | When the subject authenticated                  |
| `ElectronicSignature.signedAt` | Signature capture | Signing system        | When the signature was applied                  |
| `GuardDecisionEntry.timestamp` | GuardInspector    | Guard ClockSource     | When the decision was recorded in the inspector |

### NTP Synchronization Requirements (GxP)

| Requirement                  | Value                                                  | Reference                            |
| ---------------------------- | ------------------------------------------------------ | ------------------------------------ |
| NTP sync tolerance           | <= 1 second drift from stratum-1 source                | §62, ALCOA+ Contemporaneous          |
| Clock drift monitoring       | REQUIRED when `gxp: true`                              | §62, FM-09, FM-12                    |
| Drift detection threshold    | Configurable; default 500ms for warning, 1s for error  | ACL019 (warning), ACL021 (violation) |
| NTP unavailability handling  | Three modes: `fail-fast`, `degraded`, `warn-only`      | `spec/clock/07-integration.md` §24   |
| Multi-region clock agreement | MUST use same NTP hierarchy; variance documented in PQ | §62, multi-region guidance           |

### Startup Self-Tests

Before guard operations begin, the clock infrastructure performs four startup self-tests (from `spec/clock/04-platform-adapters.md` §13):

| Test | Description                                                    | Failure Behavior            |
| ---- | -------------------------------------------------------------- | --------------------------- |
| ST-1 | Wall clock in plausible range (not year 1970 or 2099+)         | Block startup               |
| ST-2 | RTC/NTP agreement (delta within configured tolerance)          | Warning or block per config |
| ST-3 | Monotonic clock advancing (two reads return increasing values) | Block startup               |
| ST-4 | ISO 8601 formatting produces valid UTC string                  | Block startup               |

### Authoritative Ordering: sequenceNumber

The `sequenceNumber` field (monotonically increasing per scope) is the authoritative ordering mechanism for audit entries. Timestamps are informational (for human review and cross-region approximate ordering). This design ensures correct ordering even when NTP corrections cause wall-clock time to jump backward.

> **Cross-reference:** Full clock specification in `spec/clock/`. NTP adapter contracts (NC-1 through NC-7) in `spec/clock/06-gxp-compliance/ntp-synchronization.md` §18. Guard clock integration in `spec/clock/07-integration.md` §24.

---

## Appendix Q: Data Dictionary

This appendix provides a comprehensive data dictionary for all audit and signature types in the guard system. Every field is documented with its data type, constraints, and regulatory purpose.

### AuditEntry Fields

| Field                  | Type                  | Required                                            | Constraints                                                                                    | Regulatory Purpose                                                                            |
| ---------------------- | --------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `evaluationId`         | `string`              | Yes                                                 | UUID v4 format; CSPRNG-backed (`crypto.randomUUID()`); unique per evaluation                   | Unique identification for audit correlation; ALCOA+ Attributable; hash chain input field 1/14 |
| `timestamp`            | `string`              | Yes                                                 | ISO 8601 UTC with "Z" designator; NTP-synchronized in production                               | Contemporaneous recording; ALCOA+ Contemporaneous; hash chain input field 2/14                |
| `subjectId`            | `string`              | Yes                                                 | Max 255 characters; matches `AuthSubject.id`                                                   | Identity attribution; ALCOA+ Attributable; 21 CFR 11.10(e); hash chain input field 3/14       |
| `authenticationMethod` | `string`              | Yes                                                 | Max 64 characters; from `AuthSubject.authenticationMethod` (e.g., "oauth2", "api-key", "saml") | Authentication provenance; 21 CFR 11.10(d); hash chain input field 4/14                       |
| `policy`               | `string`              | Yes                                                 | Max 512 characters; human-readable policy label                                                | Decision rationale traceability; ALCOA+ Accurate; hash chain input field 5/14                 |
| `decision`             | `"allow" \| "deny"`   | Yes                                                 | Exactly "allow" or "deny" (no other values)                                                    | Authorization outcome; ALCOA+ Accurate; hash chain input field 6/14                           |
| `portName`             | `string`              | Yes                                                 | Max 128 characters; identifies the guarded port                                                | Resource identification for audit review; ALCOA+ Attributable; hash chain input field 7/14    |
| `scopeId`              | `string`              | Yes                                                 | UUID format; identifies the DI scope                                                           | Chain partitioning; per-scope hash chain integrity (ADR #30); hash chain input field 8/14     |
| `reason`               | `string`              | Yes                                                 | Max 2048 characters; empty string `""` for Allow decisions (not undefined)                     | Decision explanation; ALCOA+ Accurate; hash chain input field 9/14                            |
| `durationMs`           | `number`              | Yes                                                 | Non-negative; measured via `performance.now()` (monotonic)                                     | Performance monitoring; operational metric; hash chain input field 10/14                      |
| `schemaVersion`        | `number`              | Yes                                                 | Current version: 1; positive integer; enables forward-compatible deserialization               | Version-tagged processing; ALCOA+ Consistent; hash chain input field 11/14                    |
| `traceDigest`          | `string`              | Optional (GxP: required)                            | Compact trace format: `policyLabel[verdict] > child[verdict]`                                  | Evaluation path visibility without full trace tree; hash chain input field 12/14              |
| `integrityHash`        | `string`              | Optional (GxP: required)                            | SHA-256 hex digest of 14-field canonical input                                                 | Tamper detection; hash chain integrity; 21 CFR 11.10(c)                                       |
| `previousHash`         | `string`              | Optional (GxP: required)                            | SHA-256 hex digest; empty string `""` for genesis entry                                        | Chain linkage; tamper detection; hash chain input field 14/14                                 |
| `hashAlgorithm`        | `string`              | Optional (GxP: required)                            | Algorithm identifier (e.g., "sha256", "hmac-sha256", "sha3-256")                               | Algorithm-agnostic verification across retention period                                       |
| `signature`            | `ElectronicSignature` | Optional (GxP: required when signatures configured) | Full ElectronicSignature object                                                                | Non-repudiation; 21 CFR 11.50-11.70                                                           |
| `sequenceNumber`       | `number`              | Optional (GxP: required)                            | Non-negative integer; monotonically increasing per scope; no gaps                              | Gap detection; concurrent write ordering (ADR #30); hash chain input field 13/14              |
| `policySnapshot`       | `string`              | Optional (GxP: required)                            | Git SHA or content hash of policy definition at evaluation time                                | Change-control traceability; policy version correlation                                       |

### GxPAuditEntry Additional Constraints

`GxPAuditEntry` extends `AuditEntry` and makes all optional fields required:

| Field            | Change from AuditEntry | Constraint                                             |
| ---------------- | ---------------------- | ------------------------------------------------------ |
| `traceDigest`    | Optional -> Required   | Must be non-empty string                               |
| `integrityHash`  | Optional -> Required   | Must be valid SHA-256 hex (64 chars)                   |
| `previousHash`   | Optional -> Required   | Must be valid SHA-256 hex or empty string (genesis)    |
| `hashAlgorithm`  | Optional -> Required   | Must be non-empty algorithm identifier                 |
| `signature`      | Optional -> Required   | Must be complete ElectronicSignature                   |
| `sequenceNumber` | Optional -> Required   | Must be non-negative integer, monotonically increasing |
| `policySnapshot` | Optional -> Required   | Must be non-empty hash string                          |

### ElectronicSignature Fields

| Field             | Type      | Required                 | Constraints                                                                      | Regulatory Purpose                                               |
| ----------------- | --------- | ------------------------ | -------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `signerId`        | `string`  | Yes                      | Non-empty; unique identifier of the signer                                       | Identity attribution; 21 CFR 11.50 (printed name requirement)    |
| `signedAt`        | `string`  | Yes                      | ISO 8601 UTC with "Z" designator                                                 | Contemporaneous signing; 21 CFR 11.50 (date/time of signing)     |
| `meaning`         | `string`  | Yes                      | Standard meanings: "authored", "reviewed", "approved"; custom meanings allowed   | Signing intent; 21 CFR 11.50 (meaning associated with signature) |
| `value`           | `string`  | Yes                      | Cryptographic digest of the 13-field canonical payload (excludes `previousHash`) | Cryptographic binding; 21 CFR 11.70 (signature/record linking)   |
| `algorithm`       | `string`  | Yes                      | Algorithm identifier (e.g., "HMAC-SHA256", "RSA-SHA256", "ECDSA-P256")           | Algorithm traceability; NIST SP 800-131A compliance              |
| `signerName`      | `string`  | Optional (GxP: required) | Human-readable signer name; non-empty when present                               | 21 CFR 11.50 manifestation: printed name of signer               |
| `reauthenticated` | `boolean` | Yes                      | `true` when signer re-authenticated before signing; `false` for imported/legacy  | 21 CFR 11.100 re-authentication verification                     |
| `keyId`           | `string`  | Optional (GxP: required) | Key identifier for routing during verification after key rotation                | Key lifecycle management; post-rotation verification support     |

### PolicyChangeAuditEntry Fields

| Field                      | Type                       | Required                 | Constraints                                                     | Regulatory Purpose                                   |
| -------------------------- | -------------------------- | ------------------------ | --------------------------------------------------------------- | ---------------------------------------------------- |
| `_tag`                     | `"PolicyChangeAuditEntry"` | Yes                      | Literal discriminant                                            | Type discrimination for audit trail consumers        |
| `changeId`                 | `string`                   | Yes                      | UUID; unique per change event                                   | Change identification; change control traceability   |
| `timestamp`                | `string`                   | Yes                      | ISO 8601 UTC with "Z" designator                                | Contemporaneous recording of policy change           |
| `actorId`                  | `string`                   | Yes                      | Identity of who initiated the change                            | 21 CFR 11.10(d) accountability; ALCOA+ Attributable  |
| `portName`                 | `string`                   | Yes                      | Affected port name; `"*"` for graph-wide changes                | Scope of change; impact analysis                     |
| `previousPolicyHash`       | `string`                   | Yes                      | `hashPolicy()` digest of the prior policy                       | Before-state traceability; change delta verification |
| `newPolicyHash`            | `string`                   | Yes                      | `hashPolicy()` digest of the new policy                         | After-state traceability; change delta verification  |
| `reason`                   | `string`                   | Yes                      | Human-readable change justification                             | Change rationale; 21 CFR 11.10(e) documentation      |
| `applied`                  | `boolean`                  | Yes                      | Whether the change was successfully applied                     | Change outcome recording                             |
| `changeRequestId`          | `string`                   | Yes                      | Link to external change control system                          | Cross-system change traceability; §64a               |
| `approverId`               | `string`                   | Yes                      | Identity of who approved the change; must differ from `actorId` | Separation of duties; 21 CFR 11.10(g)                |
| `approvedAt`               | `string`                   | Yes                      | ISO 8601 UTC timestamp of approval                              | Approval timing; ALCOA+ Contemporaneous              |
| `previousPolicySerialized` | `string`                   | Optional                 | Full JSON of the prior policy                                   | Complete reconstruction capability; ALCOA+ Original  |
| `newPolicySerialized`      | `string`                   | Optional                 | Full JSON of the new policy                                     | Complete reconstruction capability; ALCOA+ Original  |
| `diffReportChecksum`       | `string`                   | Optional (GxP: required) | SHA-256 of the policy diff report                               | Diff report integrity; change impact verification    |

### GxPPolicyChangeAuditEntry Additional Fields

| Field                | Type     | Required                     | Constraints                                                        | Regulatory Purpose                 |
| -------------------- | -------- | ---------------------------- | ------------------------------------------------------------------ | ---------------------------------- |
| `sequenceNumber`     | `number` | Yes                          | Monotonically increasing; participates in same chain as AuditEntry | Chain ordering; gap detection      |
| `integrityHash`      | `string` | Yes                          | SHA-256 hex digest                                                 | Tamper detection; chain integrity  |
| `previousHash`       | `string` | Yes                          | SHA-256 hex digest or empty string (genesis)                       | Chain linkage                      |
| `hashAlgorithm`      | `string` | Yes                          | Algorithm identifier                                               | Algorithm traceability             |
| `diffReportChecksum` | `string` | Yes (elevated from optional) | SHA-256 of diff report                                             | Diff report integrity verification |

### Hash Chain Field Ordering

The 14-field canonical input for `integrityHash` computation (in order):

| Position | Field                  | Notes                                  |
| -------- | ---------------------- | -------------------------------------- |
| 1        | `evaluationId`         | UUID v4                                |
| 2        | `timestamp`            | ISO 8601 UTC                           |
| 3        | `subjectId`            | Max 255 chars                          |
| 4        | `authenticationMethod` | Max 64 chars                           |
| 5        | `policy`               | Max 512 chars                          |
| 6        | `decision`             | "allow" or "deny"                      |
| 7        | `portName`             | Max 128 chars                          |
| 8        | `scopeId`              | UUID                                   |
| 9        | `reason`               | Max 2048 chars; empty string for allow |
| 10       | `durationMs`           | Number (decimal)                       |
| 11       | `schemaVersion`        | Integer                                |
| 12       | `sequenceNumber`       | Integer                                |
| 13       | `traceDigest`          | Compact trace string                   |
| 14       | `previousHash`         | SHA-256 hex or empty string            |

> **Note:** The electronic signature canonical payload uses fields 1-13 (excluding `previousHash`). See ADR #47 for the rationale: signatures attest to content, while `previousHash` encodes positional integrity — independent concerns.

---

## Appendix R: Operational Log Event Schema

This appendix defines structured schemas for operational (non-audit-trail) log events emitted by the guard pipeline. These events use WARNING or INFO severity and are emitted via the logger integration (section 34). Unlike `AuditEntry` records (which have a formal schema in Appendix Q), operational log events previously lacked a documented schema, making SIEM integration harder than necessary.

All operational log events share the following base structure:

```typescript
/**
 * Base structure for all guard operational log events.
 *
 * Every operational event carries these fields to enable
 * consistent SIEM ingestion, filtering, and correlation.
 */
interface GuardOperationalEvent {
  /** Discriminant tag identifying the event type. */
  readonly _tag: GuardOperationalEventTag;
  /** ISO 8601 UTC timestamp of when the event was emitted. */
  readonly timestamp: string;
  /** Log severity level. */
  readonly severity: "WARNING" | "INFO";
  /** The scope ID in which the event occurred (if applicable). */
  readonly scopeId?: string;
  /** The port name associated with the event (if applicable). */
  readonly portName?: string;
  /** Structured event source identifier for SIEM routing. */
  readonly source: "hex-di/guard";
  /** Event category for SIEM filtering. */
  readonly category:
    | "rate-limit"
    | "scope-lifecycle"
    | "clock"
    | "audit-trail"
    | "field-validation"
    | "wal-recovery"
    | "configuration";
}

type GuardOperationalEventTag =
  | "guard.rate_limit_activated"
  | "guard.rate_limit_summary"
  | "guard.scope_expired"
  | "guard.clock_drift_warning"
  | "guard.ntp_unavailable"
  | "guard.audit_write_failure"
  | "guard.field_truncated"
  | "guard.wal_recovery_started"
  | "guard.wal_orphan_detected"
  | "guard.wal_recovery_completed"
  | "guard.completeness_discrepancy"
  | "guard.capacity_threshold"
  | "guard.gxp_readiness_warning";
```

### Event Type Definitions

#### Rate Limiting Events

```typescript
interface RateLimitActivatedEvent extends GuardOperationalEvent {
  readonly _tag: "guard.rate_limit_activated";
  readonly severity: "WARNING";
  readonly category: "rate-limit";
  readonly currentRate: number; // evaluations per second at activation
  readonly maxRate: number; // configured maxEvaluationsPerSecond
  readonly subjectId?: string; // subject that triggered the limit
}

interface RateLimitSummaryEvent extends GuardOperationalEvent {
  readonly _tag: "guard.rate_limit_summary";
  readonly severity: "WARNING";
  readonly category: "rate-limit";
  readonly windowStartTimestamp: string;
  readonly windowEndTimestamp: string;
  readonly rejectedCount: number; // evaluations rejected in window
  readonly acceptedCount: number; // evaluations accepted in window
  readonly maxRate: number;
}
```

#### Scope Lifecycle Events

```typescript
interface ScopeExpiredEvent extends GuardOperationalEvent {
  readonly _tag: "guard.scope_expired";
  readonly severity: "WARNING";
  readonly category: "scope-lifecycle";
  readonly scopeId: string;
  readonly elapsedMs: number; // how long the scope was alive
  readonly maxLifetimeMs: number; // configured maxScopeLifetimeMs
  readonly evaluationCount: number; // evaluations performed in scope before expiry
}
```

#### Clock Events

```typescript
interface ClockDriftWarningEvent extends GuardOperationalEvent {
  readonly _tag: "guard.clock_drift_warning";
  readonly severity: "WARNING";
  readonly category: "clock";
  readonly driftMs: number; // measured drift in milliseconds
  readonly thresholdMs: number; // configured drift threshold
  readonly ntpServer?: string; // NTP server address (if known)
}

interface NtpUnavailableEvent extends GuardOperationalEvent {
  readonly _tag: "guard.ntp_unavailable";
  readonly severity: "WARNING";
  readonly category: "clock";
  readonly lastSyncTimestamp?: string; // last successful NTP sync
  readonly retryCount: number; // consecutive failed NTP queries
}
```

#### Audit Trail Events

```typescript
interface AuditWriteFailureEvent extends GuardOperationalEvent {
  readonly _tag: "guard.audit_write_failure";
  readonly severity: "WARNING";
  readonly category: "audit-trail";
  readonly evaluationId: string; // the evaluation whose audit write failed
  readonly errorCode: string; // ACL error code (e.g., "ACL008")
  readonly errorMessage: string; // human-readable error description
  readonly failOnAuditError: boolean; // whether this will halt operations
}

interface FieldTruncatedEvent extends GuardOperationalEvent {
  readonly _tag: "guard.field_truncated";
  readonly severity: "WARNING";
  readonly category: "field-validation";
  readonly fieldName: string; // "reason" (only field subject to truncation)
  readonly originalLength: number; // original string length in code points
  readonly truncatedLength: number; // length after truncation (2048)
  readonly evaluationId: string; // affected evaluation
}

interface CompletenessDiscrepancyEvent extends GuardOperationalEvent {
  readonly _tag: "guard.completeness_discrepancy";
  readonly severity: "WARNING";
  readonly category: "audit-trail";
  readonly portName: string;
  readonly resolutionCount: number; // guard evaluations performed
  readonly auditEntryCount: number; // audit entries recorded
  readonly discrepancy: number; // resolutionCount - auditEntryCount
}

interface CapacityThresholdEvent extends GuardOperationalEvent {
  readonly _tag: "guard.capacity_threshold";
  readonly severity: "WARNING";
  readonly category: "audit-trail";
  readonly utilizationPercent: number; // current storage utilization
  readonly thresholdPercent: number; // threshold that was crossed (70, 85, or 95)
  readonly estimatedRemainingHours?: number;
}
```

#### WAL Recovery Events

```typescript
interface WalRecoveryStartedEvent extends GuardOperationalEvent {
  readonly _tag: "guard.wal_recovery_started";
  readonly severity: "INFO";
  readonly category: "wal-recovery";
  readonly pendingIntentCount: number; // orphaned intents found
}

interface WalOrphanDetectedEvent extends GuardOperationalEvent {
  readonly _tag: "guard.wal_orphan_detected";
  readonly severity: "WARNING";
  readonly category: "wal-recovery";
  readonly evaluationId: string; // orphaned intent's evaluationId
  readonly intentTimestamp: string; // when the intent was written
  readonly ageMs: number; // how old the orphan is
}

interface WalRecoveryCompletedEvent extends GuardOperationalEvent {
  readonly _tag: "guard.wal_recovery_completed";
  readonly severity: "INFO";
  readonly category: "wal-recovery";
  readonly recoveredCount: number; // intents successfully replayed
  readonly failedCount: number; // intents that could not be recovered
  readonly durationMs: number; // total recovery time
}
```

#### Configuration Events

```typescript
interface GxPReadinessWarningEvent extends GuardOperationalEvent {
  readonly _tag: "guard.gxp_readiness_warning";
  readonly severity: "WARNING";
  readonly category: "configuration";
  readonly checkId: string; // e.g., "item-11", "item-13"
  readonly checkDescription: string; // human-readable check description
  readonly recommendation: string; // recommended remediation
}
```

### SIEM Integration Guidance

```
REQUIREMENT: When the logger integration is active (section 34), all guard operational
             events MUST be emitted as structured JSON objects conforming to the schemas
             defined above. The _tag field MUST be used as the primary event type
             discriminant for SIEM routing rules and alerting configuration.
             Reference: EU GMP Annex 11 §9 (audit trail), PIC/S PI 011-3 §6.3.

RECOMMENDED: Organizations SHOULD configure SIEM alerting rules for the following
             operational events:
             - guard.audit_write_failure (category: audit-trail): Immediate alert
             - guard.wal_orphan_detected (category: wal-recovery): Immediate alert
             - guard.completeness_discrepancy (category: audit-trail): 1-minute alert
             - guard.clock_drift_warning (category: clock): 5-minute alert
             - guard.capacity_threshold at 95% (category: audit-trail): Immediate alert
             - guard.scope_expired with high frequency: Pattern-based alert
```

### CEF (Common Event Format) Mapping

For organizations using CEF-compatible SIEMs:

| GuardOperationalEvent Field | CEF Field             | CEF Key              |
| --------------------------- | --------------------- | -------------------- |
| `_tag`                      | Name                  | `name`               |
| `severity` WARNING          | Severity              | `7` (High)           |
| `severity` INFO             | Severity              | `3` (Low)            |
| `source`                    | Device Product        | `deviceProduct`      |
| `timestamp`                 | Receipt Time          | `rt`                 |
| `scopeId`                   | Source User ID        | `suid`               |
| `category`                  | Device Event Class ID | `deviceEventClassId` |

---

## Appendix S: Consolidated Error Recovery Runbook

This appendix provides a consolidated operations runbook for all guard-related error conditions. It collects error handling procedures from across the specification into a single reference suitable for GxP operations teams.

### Using This Runbook

1. Identify the error code from the log entry, exception, or alert
2. Locate the error code in the table below
3. Follow the step-by-step recovery procedure
4. Document actions taken per the deviation report template (Appendix K)

### Error Recovery Procedures

#### ACL001 — AccessDeniedError (S=2, Authorization)

**Trigger:** Policy evaluation denied the subject access.

**Immediate Actions:**

1. Review the `decision.reason` and `decision.trace` fields in the error
2. Verify the subject's current permissions and roles
3. Check if the denial is expected (no action needed) or unexpected

**Escalation:** If repeated for the same subject, investigate whether a permission or role assignment change is required. No incident report unless indicative of a broader access control issue.

**Recovery:** Grant the subject the required permission/role through the normal change control process (section 64a).

---

#### ACL002 — CircularRoleInheritanceError (S=3, Configuration)

**Trigger:** Role inheritance graph contains a cycle.

**Immediate Actions:**

1. Read the `roleName` field and error message to identify the cycle path
2. Review role definitions in the guard configuration
3. Remove or restructure the circular inheritance

**Escalation:** Configuration review within 4 hours. Block deployment if detected in CI.

**Recovery:** Modify role definitions to break the cycle. Re-run `flattenPermissions()` to confirm resolution.

---

#### ACL003 — PolicyEvaluationError (S=4, Evaluation)

**Trigger:** Policy evaluation failed due to a runtime error (not a deny decision).

**Immediate Actions:**

1. Check the `cause` field for the underlying error
2. Common causes: missing attribute on resource, matcher threw exception, malformed policy
3. Review the policy definition and evaluation context

**Escalation:** Major incident — 4-hour notification, 24-hour response initiation.

**Recovery:** Fix the root cause (missing attribute, broken matcher). Redeploy and verify with OQ regression tests.

---

#### ACL008 — AuditTrailWriteError (S=5, Compliance, CRITICAL)

**Trigger:** Audit trail write failed. If `failOnAuditError: true`, operations are halted.

**Immediate Actions:**

1. **Immediately** investigate the audit trail storage backend (database connectivity, disk space, permissions)
2. Check the `cause` field for the underlying storage error
3. If WAL is enabled, verify WAL storage is operational (entries are buffered)
4. Check completeness monitor for discrepancy count

**Escalation:** Critical incident — immediate notification, 4-hour response initiation, 24-hour initial report.

**Recovery Steps:**

1. Restore audit trail storage connectivity
2. If WAL was active, trigger WAL replay to recover buffered entries
3. Run `verifyAuditChain()` on affected scopes
4. Verify completeness monitor shows zero discrepancy
5. Document in deviation report (Appendix K)

---

#### ACL009 — SignatureError (S=4, Compliance)

**Trigger:** Electronic signature operation failed. Check `category` field.

**Recovery by Category:**

| Category            | Immediate Action                             | Recovery                                                     |
| ------------------- | -------------------------------------------- | ------------------------------------------------------------ |
| `capture_failed`    | Check crypto configuration, key availability | Verify HSM connectivity; retry capture                       |
| `validation_failed` | Quarantine affected entry                    | Re-validate with known-good key; investigate tampering       |
| `reauth_failed`     | Log failed attempt; check credentials        | Verify IdP connectivity; reset credentials if needed         |
| `reauth_expired`    | Normal expiry; no incident                   | Request fresh re-authentication                              |
| `key_revoked`       | Expected if key was intentionally revoked    | Use current active key; verify revocation was authorized     |
| `binding_broken`    | **Critical:** signature bound to wrong data  | Quarantine entry; investigate data integrity; FM-07 response |
| `missing_service`   | No SignatureService configured               | Configure SignatureService adapter if signatures required    |

**Escalation:** Major incident for `capture_failed`, `validation_failed`, `binding_broken`. Critical for `binding_broken`.

---

#### ACL010 — WalError (S=5, CRITICAL)

**Trigger:** Write-ahead log operation failed.

**Immediate Actions:**

1. **Immediately** investigate WAL durable storage (disk, network storage)
2. Check write permissions on WAL storage path
3. Verify WAL file integrity (not corrupted)

**Escalation:** Critical incident — immediate notification, 4-hour response.

**Recovery Steps:**

1. Restore WAL storage availability
2. Run WAL integrity check
3. If WAL is corrupted, initiate manual recovery per §61 WAL recovery procedure
4. **Do NOT discard WAL entries** — they may contain unrecovered audit data
5. Document in deviation report

---

#### ACL011 — ConfigurationError: failOnAuditError (S=4, Configuration)

**Trigger:** `gxp: true` with `failOnAuditError: false`.

**Recovery:** Remove explicit `failOnAuditError: false` from configuration. The default (`true`) is correct for GxP. Block deployment until corrected.

---

#### ACL012 — ConfigurationError: NoopAuditTrail in GxP (S=5, CRITICAL)

**Trigger:** `NoopAuditTrail` used with `gxp: true`.

**Recovery:** Replace `NoopAuditTrail` with a persistent audit trail adapter (PostgreSQL, EventStoreDB, etc.). This is a compile-time and runtime check — this error should never reach production.

---

#### ACL013 — ScopeExpiredError (S=3, Authorization)

**Trigger:** Scope lifetime exceeded `maxScopeLifetimeMs`.

**Recovery:** This is expected behavior. Create a new scope with a fresh subject. Monitor for excessive frequency, which may indicate `maxScopeLifetimeMs` is set too low for the workload.

---

#### ACL014 — AuditEntryParseError (S=3, Serialization)

**Trigger:** Audit entry deserialization failed.

**Immediate Actions:**

1. Check the `field` and `category` fields
2. Common causes: unknown `schemaVersion`, missing required field, invalid UUID

**Recovery:** Investigate the data source producing malformed entries. May indicate schema version mismatch after a framework upgrade without proper migration.

---

#### ACL015 — RateLimitExceededError (S=2, Authorization)

**Trigger:** Evaluation rate exceeded `maxEvaluationsPerSecond`.

**Recovery:** Reduce request frequency or increase rate limit. Monitor the source — high frequency may indicate a DoS attempt. Review `RateLimitSummaryAuditEntry` in the audit trail for patterns.

---

#### ACL016 — AuditTrailReadError (S=3, Audit Trail)

**Trigger:** Audit trail read/query operation failed.

**Recovery:** Check storage adapter connectivity and read permissions. This does not affect write operations or guard evaluation.

---

#### ACL017 — AdminOperationDeniedError (S=4, Authorization)

**Trigger:** Administrative operation denied.

**Immediate Actions:**

1. Verify the subject's administrative roles (section 64g)
2. Check if the denial is expected (unauthorized attempt) or unexpected (role misconfiguration)

**Escalation:** Repeated denials may indicate an unauthorized access attempt. Escalate per site security incident procedure.

---

#### ACL018 — HashChainBreakError (S=5, CRITICAL)

**Trigger:** Hash chain integrity verification failed.

**Immediate Actions:**

1. **Quarantine** the affected scope immediately
2. Identify the specific entry where the chain breaks
3. Compare stored hash with recomputed hash

**Escalation:** Critical — 1-hour alert, 4-hour quarantine confirmation, 24-hour incident report (per §61.4 SLA).

**Recovery Steps:**

1. Determine root cause (data tampering, concurrent write race, storage corruption)
2. If storage corruption: restore from backup, re-verify chain
3. If tampering suspected: preserve evidence, notify security team, file regulatory report if required
4. Document in deviation report with full forensic analysis

---

#### ACL020 — HashChainIntegrityError (S=5, GxP, CRITICAL)

**Trigger:** Hash chain recomputation mismatch at write time.

**Recovery:** Same as ACL018 but detected proactively at write time. Halt writes to the affected scope. Follow FM-04 response procedure.

---

#### ACL021 — ClockDriftViolationError (S=4, GxP)

**Trigger:** Clock drift exceeded GxP tolerance (default 500ms).

**Immediate Actions:**

1. Check NTP infrastructure health
2. Verify NTP server connectivity
3. Suspend GxP writes until drift is resolved

**Recovery:** Restore NTP synchronization. Verify drift is within tolerance. Resume operations.

---

#### ACL022 — SignatureVerificationError (S=5, GxP, CRITICAL)

**Trigger:** Signature failed cryptographic validation during chain verification.

**Immediate Actions:**

1. **Quarantine** affected entries
2. Investigate potential key compromise (FM-07)
3. Check for algorithm downgrade (FM-08)

**Escalation:** Critical — immediate key compromise investigation. Revoke compromised key within 1 hour.

**Recovery Steps:**

1. Revoke potentially compromised key
2. Issue new signing key via HSM key ceremony
3. Re-sign affected entries if possible, or document gap
4. File regulatory notification if required

---

#### ACL023 — WalReplayError (S=5, GxP, CRITICAL)

**Trigger:** WAL replay encountered unrecoverable inconsistency.

**Immediate Actions:**

1. **Do NOT discard WAL entries**
2. Identify the inconsistent intent (evaluationId, scopeId)
3. Manual QA review required

**Recovery:** Follow §61 WAL recovery procedure. Requires manual reconciliation of the inconsistent intent with the audit trail state. Document all recovery actions.

---

#### ACL024 — CompletenessGapError (S=4, GxP)

**Trigger:** Discrepancy between guard evaluations and audit entries.

**Immediate Actions:**

1. Check completeness monitor output: `resolutions` vs `auditEntries`
2. Review recent audit write failures (ACL008)
3. Check WAL for pending intents

**Escalation:** Follow §61 completeness monitoring escalation (1-minute alert, 1-hour ack, 4-hour investigation, 24-hour report).

**Recovery:** Identify and recover missing entries. If entries are unrecoverable, document the gap in a deviation report.

---

#### ACL025 — RetentionPolicyViolationError (S=4, GxP)

**Trigger:** Audit entry deleted or made inaccessible before retention period expired.

**Immediate Actions:**

1. Identify the affected entries and their required retention periods
2. Check for unauthorized deletion or storage lifecycle policy misconfiguration
3. Restore from backup if possible

**Recovery:** Restore the entries. Review and correct any automated storage lifecycle policies that may have caused premature deletion. Document in deviation report.

### Incident Classification Quick Reference

| Severity                                     | Notification | Response Initiation | Initial Report | Error Codes                                                    |
| -------------------------------------------- | ------------ | ------------------- | -------------- | -------------------------------------------------------------- |
| **Critical** (patient safety/data integrity) | Immediate    | 4 hours             | 24 hours       | ACL008, ACL010, ACL012, ACL018, ACL020, ACL022, ACL023         |
| **Major** (compliance impact)                | 4 hours      | 24 hours            | 72 hours       | ACL003, ACL009, ACL011, ACL017, ACL021, ACL024, ACL025         |
| **Minor** (operational)                      | 24 hours     | 5 business days     | N/A            | ACL001, ACL002, ACL006, ACL007, ACL013, ACL014, ACL015, ACL016 |

---

## Appendix T: Implementation Verification Requirements

This appendix specifies requirements for verifying that the guard library implementation faithfully conforms to this specification, bridging the gap between specification quality and implementation quality.

### Spec-to-Code Traceability

```
REQUIREMENT: Every REQUIREMENT block in this specification (identified by RFC 2119
             MUST/SHALL language) MUST have at least one corresponding test case in
             the OQ test suite. The mapping MUST be documented via test annotations
             that reference the spec section number.
             Reference: GAMP 5 Category 5, EU GMP Annex 11 §4.7.

REQUIREMENT: Test files MUST use @spec-ref annotations (in test descriptions or
             comments) to link each test to the specification section it verifies.
             Format: @spec-ref §<section-number> or @spec-ref REQ-GUARD-<NNN>.
             Example: it("hash chain covers 14 fields @spec-ref §61.4", ...)
```

### Implementation Conformance Checkpoints

```
REQUIREMENT: The following automated conformance checkpoints MUST pass in CI
             before any release of @hex-di/guard:

             Checkpoint 1 — Type Conformance: All exported types match the
             TypeScript interfaces defined in this specification. Verified via
             pnpm typecheck and pnpm test:types.

             Checkpoint 2 — Behavioral Conformance: All four conformance suites
             (AuditTrail: 17 tests, SignatureService: 15 tests, SubjectProvider:
             12 tests, AdminGuard: 14 tests) pass against all shipped adapters.

             Checkpoint 3 — Coverage Gate: Branch coverage >= 95% for GxP-critical
             paths, line coverage >= 90% for all production code. Coverage
             regression below thresholds blocks merge.

             Checkpoint 4 — Mutation Gate: Mutation kill rate meets the thresholds
             defined in 16-definition-of-done.md (100% core evaluation, >= 95%
             GxP-critical, >= 85% non-critical).

             Checkpoint 5 — Spec Completeness: Every DoD item in
             16-definition-of-done.md has at least one test file with a matching
             @spec-ref annotation. Verified by a CI script that cross-references
             DoD items against test annotations.

             Checkpoint 6 — Error Code Completeness: All 25 error codes
             (ACL001-ACL025) have corresponding error class exports, test
             coverage, and documentation in Appendix F.
             Reference: GAMP 5 Category 5, 21 CFR 11.10(a).
```

### Continuous Conformance Monitoring

```
REQUIREMENT: The CI pipeline MUST include a "spec-conformance" stage that runs
             after unit tests and before integration tests. This stage MUST:
             (1) Verify all conformance suites pass
             (2) Verify coverage thresholds are met
             (3) Verify all @spec-ref annotations resolve to valid spec sections
             (4) Generate a conformance report artifact with timestamp and commit SHA
             A failed spec-conformance stage MUST block the release pipeline.
             Reference: GAMP 5 Category 5, EU GMP Annex 11 §4.7.

RECOMMENDED: Organizations deploying @hex-di/guard in GxP environments SHOULD
             run the full IQ/OQ/PQ qualification (via @hex-di/guard-validation)
             as part of their release acceptance process, in addition to the
             automated CI conformance checks. The qualification report SHOULD
             be retained as validation evidence alongside the release artifacts.
```

### Specification Drift Detection

```
REQUIREMENT: When specification files in spec/guard/ are modified, the CI pipeline
             MUST flag all test files that reference the modified sections (via
             @spec-ref annotations) for mandatory re-review. This ensures that
             spec changes are accompanied by corresponding test updates.
             Reference: EU GMP Annex 11 §10 (change management).

REQUIREMENT: Maintain a machine-readable spec-section index
             (spec/guard/section-index.json) mapping section numbers to file
             paths and line ranges. This enables automated cross-referencing
             between specification sections and test annotations. The index
             MUST be validated in CI to detect stale entries when spec files
             are renamed, deleted, or have sections renumbered.
             Reference: GAMP 5 Category 5, EU GMP Annex 11 §4.7.
```

### Revision Management

```
REQUIREMENT: The specification document set MUST include a revision management
             script (scripts/spec-revision.ts or equivalent) that automates:
             (1) Revision number incrementing (MAJOR.MINOR) for modified files.
             (2) Effective Date update to the current date.
             (3) Change History entry appending (preserving prior entries).
             (4) Cross-file revision consistency validation: when a file is modified,
                 all files that reference it (via section cross-references) MUST be
                 flagged for review and potential revision bump.
             The script MUST be run as part of the specification change workflow
             and its output committed alongside the spec changes.
             Reference: EU GMP Annex 11 §10 (change management), 21 CFR 11.10(e).

REQUIREMENT: The CI pipeline MUST include a "spec-revision-check" stage that
             validates document control header consistency:
             (1) Every spec file has a valid document control header.
             (2) Document IDs follow the GUARD-NN convention.
             (3) Revision numbers are valid MAJOR.MINOR format.
             (4) Effective Dates are valid ISO 8601 dates.
             (5) Classifications match the Document Classification Taxonomy
                 defined in README.md.
             (6) Approved By fields reference valid role titles from the
                 Approval Authority Matrix in README.md.
             (7) No file has been modified (per git diff) without a corresponding
                 revision increment and Change History entry.
             A failed spec-revision-check MUST block merge to the main branch.
             Reference: EU GMP Annex 11 §10, 21 CFR 11.10(e).

REQUIREMENT: The Change History field in each document control header MUST be
             append-only. Previous entries MUST NOT be modified or removed.
             Each entry MUST include: revision number, date (ISO 8601), and a
             brief summary of changes. Example:
             "1.0 (2026-02-13): Initial controlled release;
              1.1 (2026-03-01): Added constant-time evaluation REQUIREMENT (GCR-2026-001)"
             Reference: 21 CFR 11.10(e) (audit trail for record changes).
```

---

_Previous: [14 - API Reference](./14-api-reference.md) | Next: [16 - Definition of Done](./16-definition-of-done.md)_
