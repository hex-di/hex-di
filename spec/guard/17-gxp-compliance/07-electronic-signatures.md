# 17 - GxP Compliance: Electronic Signatures

<!-- Document Control
| Property         | Value                                    |
|------------------|------------------------------------------|
| Document ID      | GUARD-17-07                              |
| Revision         | 1.2                                      |
| Effective Date   | 2026-02-13                               |
| Author           | HexDI Engineering                        |
| Reviewer         | GxP Compliance Review                    |
| Approved By      | Regulatory Affairs Lead, Quality Assurance Manager |
| Classification   | GxP Compliance Sub-Specification         |
| Change History   | 1.2 (2026-02-13): Added §65c-3 (certificate lifecycle management, REQ-GUARD-068), §65c-4 (signature algorithm migration, REQ-GUARD-069) |
|                  | 1.1 (2026-02-13): Added §65b-2 (signedAt clock source), §65b-3 (account lockout REQUIRED), §65b-4 (token replay protection), §65d-1 (minimum signer count) |
|                  | 1.0 (2026-02-13): Initial controlled release |
-->

_Previous: [Administrative Controls](./06-administrative-controls.md) | Next: [Compliance Verification](./08-compliance-verification.md)_

---

## 65. Electronic Signatures

Guard defines the full electronic signature **contract** in v0.1.0: the `SignatureServicePort`, `SignatureService` interface, supporting types (`ElectronicSignature`, `ReauthenticationChallenge`, `ReauthenticationToken`, `SignatureValidationResult`), the `hasSignature` policy variant, and behavioral requirements for compliant adapters. Consumer adapters implement the actual cryptography.

This contract satisfies four 21 CFR Part 11 requirements:

- **11.50-11.70:** Signature capture, validation, and binding
- **11.100:** Re-authentication enforcement before signing
- **11.200:** Key management behavioral requirements
- **11.300:** Controls for identification codes and passwords

```
REQUIREMENT: This specification covers non-biometric electronic signatures as
             defined in 21 CFR 11.200(a) — signatures based on at least two
             distinct identification components (e.g., user ID and password).
             Biometric-based electronic signatures per 21 CFR 11.200(b) are
             outside the scope of @hex-di/guard. Organizations requiring
             biometric authentication MUST implement it in the upstream
             authentication provider (e.g., IdP, SSO). The guard library
             accepts biometric authentication assertions through the
             SubjectProvider's AuthenticationMethod field. Consumer adapters
             that relay biometric assertions MUST document the biometric
             method in the AuditEntry metadata to satisfy 11.200(b)
             traceability requirements.
             Reference: 21 CFR 11.3(b)(3), 21 CFR 11.200(a), 21 CFR 11.200(b).
```

### 65a. Signature Capture and Binding (11.50-11.70)

#### SignatureService.capture() Behavioral Contract

```
REQUIREMENT: capture() MUST produce a cryptographic signature computed over the
             payload (serialized audit entry fields). The signature MUST be
             non-transferable: it is bound to the specific payload data, and
             re-signing a different payload produces a different signature.

REQUIREMENT: capture() MUST reject requests with expired or missing
             ReauthenticationTokens. A SignatureError with category
             "reauth_expired" MUST be returned.

REQUIREMENT: capture() MUST populate all ElectronicSignature fields:
             signerId, signedAt, meaning, value, algorithm, reauthenticated.
             The reauthenticated field MUST be true (since capture requires
             a valid ReauthenticationToken).
```

#### 65b-2. signedAt Clock Source

```
REQUIREMENT: The signedAt field on ElectronicSignature MUST be populated
             using the same ClockSource instance configured on the guard
             graph (section 62, 03-clock-synchronization.md). SignatureService
             adapter implementations MUST NOT use Date.now(), new Date(), or
             any clock source other than the guard-configured ClockSource.
             This ensures that:
             (a) signedAt timestamps are consistent with AuditEntry.timestamp
                 values produced by the same guard instance.
             (b) NTP synchronization monitoring (§62) covers signature
                 timestamps.
             (c) Clock drift detection applies uniformly to all guard-produced
                 timestamps.
             When gxp is true, the OQ process MUST verify that signedAt
             timestamps originate from the guard ClockSource by comparing
             signedAt with the corresponding AuditEntry.timestamp — they
             MUST be within 100ms of each other for evaluations on the same
             guard instance.
             Reference: 21 CFR 11.50, ALCOA+ Contemporaneous.
```

### Counter-Signing Audit Entry Model

```
REQUIREMENT: In counter-signing (maker-checker) workflows, each signature MUST
             produce a separate AuditEntry. All AuditEntries produced for the same
             evaluation MUST share the same evaluationId, enabling correlation.
             Each AuditEntry records its own timestamp and sequenceNumber
             independently — the first signer's entry has sequenceNumber N, the
             counter-signer's entry has sequenceNumber N+1. This ensures each
             signature is individually attributable, contemporaneous, and
             independently verifiable in the hash chain.
             Reference: 21 CFR 11.50, 11.100, ALCOA+ Attributable.
```

> **Counter-signing note:** Each signature in a counter-signing workflow produces a separate AuditEntry sharing the same evaluationId. This means a single evaluation with two signatures results in two audit entries (one per signer), each with its own timestamp, sequenceNumber, and integrityHash. The evaluationId correlation allows auditors to reconstruct the complete signing timeline for a given evaluation.

#### Binding Requirement (11.50)

Section 11.50 requires that electronic signatures be "linked to their respective electronic records to ensure that the signatures cannot be excised, copied, or otherwise transferred to falsify an electronic record by ordinary means."

Guard enforces binding through:

1. The `SignatureCaptureRequest.payload` contains the serialized audit entry fields being signed
2. The `ElectronicSignature.value` is a cryptographic digest of the payload -- changing the payload invalidates the signature
3. `SignatureService.validate()` verifies both cryptographic integrity AND binding integrity
4. The `AuditEntry.signature` field is part of the frozen, immutable audit entry
5. The `ElectronicSignature.value` itself is a cryptographic digest of the payload fields, providing independent binding — altering the audit entry invalidates the signature, and altering the signature is detectable via `validate()`. The `integrityHash` chain covers the core audit entry fields (section 61.4); the signature provides an additional, independent integrity layer via its own cryptographic binding to the payload

```
REQUIREMENT: SignatureService.validate() MUST guarantee the following three-property
             binding verification for every signature:
             1. Cryptographic integrity: Recomputing the digest over the stored payload
                fields MUST produce a value matching ElectronicSignature.value. A
                mismatch indicates the payload or signature has been modified.
             2. Binding integrity: The payload fields used for validation MUST match
                the audit entry fields the signature was originally bound to. A
                mismatch indicates the signature was excised from one record and
                attached to another.
             3. Key status: The signing key MUST NOT have been revoked. A revoked
                key renders the signature untrustworthy even if cryptographically
                valid.
             If any property fails, validate() MUST return the corresponding boolean
             as false in SignatureValidationResult and MUST NOT indicate overall
             validity. Reference: 21 CFR 11.50, 11.70.
```

```
REQUIREMENT: The canonical signature payload MUST include the following fields
             (same as hash chain fields defined in section 61.4 MINUS previousHash):

             1. authenticationMethod
             2. decision
             3. durationMs          (String(value))
             4. evaluationId
             5. policySnapshot      ("" if undefined)
             6. portName
             7. reason
             8. schemaVersion       (String(value))
             9. scopeId
             10. sequenceNumber     (String(value))
             11. subjectId
             12. timestamp
             13. traceDigest        ("" if undefined)

             Field ordering, pipe delimiter, and UTF-8 encoding MUST follow
             the same rules as the hash chain canonical format (section 61.4).
             previousHash is excluded because the signature binds to the content
             of a single entry, not to its position in the chain. The hash chain
             provides positional integrity independently.
             Reference: 21 CFR 11.50, 11.70.
```

> **Counter-signing and signature payload:** In counter-signing workflows, each signature produces a separate AuditEntry (see "Counter-Signing Audit Entry Model" above). Each signature's payload is computed from its own AuditEntry fields. The evaluationId shared across entries correlates the signatures.

#### Signature Manifestation Requirement (11.50)

Section 11.50 also requires that signed electronic records "shall display" the signer's identity and the meaning of the signature:

```
REQUIREMENT: When displaying a signed audit entry to a human reviewer (audit trail
             review interface, MCP resources, A2A skill output), the display MUST
             clearly show:
             1. The signer's printed name (resolvable from signerId via the
                consumer's identity provider)
             2. The date and time of the signature (signedAt field, ISO 8601 UTC)
             3. The meaning of the signature (meaning field, e.g., "reviewed",
                "approved", "authored")
```

> **Consumer Responsibility:** The guard library produces `ElectronicSignature` objects with `signerId`, `signedAt`, and `meaning` fields. Resolving `signerId` to a human-readable printed name is the consumer's responsibility, as the guard library does not manage identity records. The audit trail review interface (section 64) and MCP resources (section 44c in 12-inspection.md) SHOULD include the printed name alongside `signerId` in their output.

#### SignatureService.validate() Behavioral Contract

```
REQUIREMENT: validate() MUST verify three properties:
             1. Cryptographic integrity: the signature value matches a
                recomputed digest of the entry fields
             2. Binding integrity: the signature is bound to the correct
                audit entry (not transferred from a different entry)
             3. Key status: the signing key has not been revoked

REQUIREMENT: validate() MUST return a SignatureValidationResult with
             all three boolean fields (valid, bindingIntact, keyActive)
             populated. A false value in any field means the signature
             MUST NOT be trusted for the corresponding property.
```

### 65b. Re-Authentication Enforcement (11.100)

#### Two-Component Identification Requirement

Section 11.100 requires that electronic signatures be based on at least two distinct identification components: identification (who the signer is) + verification (proof that the signer is who they claim to be).

```
REQUIREMENT: Each signerId MUST be unique to a single individual. No two individuals
             may share the same signerId value. The consumer's identity provider is
             responsible for enforcing this uniqueness constraint. The SignatureService
             adapter MUST NOT accept a signerId that is not registered in the identity
             provider. Reference: 21 CFR Part 11 Section 11.300(a) — each combination
             of identification code and password must be unique.
```

```
REQUIREMENT: In GxP environments, organizations MUST periodically review the signerId
             registry to confirm: (1) no signerId has been reassigned to a different
             individual, (2) departed personnel signerIds have been deactivated,
             (3) each signerId is traceable to a single natural person. This review
             MUST be conducted at least annually or upon personnel changes.
             Reference: 21 CFR 11.300(b).
```

```
REQUIREMENT: Organizations MUST document the password quality expectations enforced
             by their Identity Provider (IdP) as a consumer responsibility. Per
             21 CFR 11.300(d), controls MUST be in place to ensure password quality
             including minimum length, complexity, expiration, and history. Since
             the guard library delegates authentication to the consumer's IdP, the
             site MUST document in their validation plan (section 67) that:
             (a) The IdP enforces password complexity rules meeting or exceeding
                 the organization's security policy.
             (b) Password expiration and history controls are active.
             (c) Account lockout after consecutive failed attempts is enforced.
             (d) These IdP controls have been verified during OQ testing.
             Reference: 21 CFR 11.300(b)-(d).
```

```
REQUIREMENT: When gxp is true, the consumer's Identity Provider and
             SignatureService adapter MUST enforce password quality standards
             meeting or exceeding NIST SP 800-63B (Digital Identity Guidelines,
             Authentication and Lifecycle Management). Specifically, the IdP MUST:
             (a) Enforce a minimum password length of 8 characters (NIST SP
                 800-63B §5.1.1.1).
             (b) Screen new passwords against a blocklist of commonly-used,
                 expected, or compromised values (NIST SP 800-63B §5.1.1.2).
             (c) Allow passwords up to at least 64 characters in length
                 (NIST SP 800-63B §5.1.1.1).
             (d) Not impose composition rules (e.g., requiring mixed case,
                 digits, special characters) beyond the minimum length — per
                 NIST SP 800-63B guidance that composition rules reduce
                 usability without meaningfully increasing security.
             The adopted password quality standard and its enforcement
             mechanism MUST be documented in the validation plan (section 67)
             and verified during OQ testing.
             Reference: 21 CFR 11.300(d), NIST SP 800-63B §5.1.1.

RECOMMENDED: In non-GxP environments, password quality for the re-authentication
             credential component SHOULD follow NIST SP 800-63B or equivalent
             organizational standard. Organizations SHOULD document which password
             quality standard is adopted in the validation plan (section 67).
             Password complexity enforcement is the responsibility of the
             consumer's SignatureService adapter, not the guard library.
             Reference: 21 CFR 11.300(d), NIST SP 800-63B.
```

```
REQUIREMENT: SignatureService.reauthenticate() implementations MUST enforce rate
             limiting or account lockout after a configurable number of consecutive
             failed re-authentication attempts (RECOMMENDED: 5 attempts within
             15 minutes). Failed re-authentication attempts MUST be logged with
             signerId, timestamp, and failure reason. In GxP environments, lockout
             events MUST trigger an operational alert. Account lockout policies
             MUST be documented in the validation plan (section 67).
             Reference: 21 CFR 11.300(d).
```

#### 65b-3. Account Lockout Parameters (GxP)

```
REQUIREMENT: When gxp is true, the following account lockout parameters MUST
             be configured and enforced by the SignatureService adapter:
             (a) Maximum consecutive failures: MUST NOT exceed 5 attempts.
                 After the threshold is reached, the signerId MUST be locked
                 out from further re-authentication attempts.
             (b) Lockout window: MUST be at least 15 minutes from the time
                 of lockout. Automatic unlock after the window is permitted.
             (c) Lockout scope: Lockout MUST apply per signerId, not per
                 session or IP address, to prevent circumvention via session
                 rotation.
             (d) Lockout notification: A CRITICAL-level alert MUST be sent to
                 the security team upon lockout activation. The alert MUST
                 include signerId, timestamp, and the number of failed attempts.
             (e) Manual unlock: A locked signerId MUST be unlockable by a
                 person holding the Guard Administrator role (§64g). The
                 unlock event MUST be recorded in the administrative event
                 log (§64b).
             These parameters MUST be documented in the validation plan
             (section 67) and verified during OQ.
             Reference: 21 CFR 11.300(d), EU GMP Annex 11 §12.

RECOMMENDED: In non-GxP environments, the same parameters are RECOMMENDED
             with the threshold configurable up to 10 attempts.
```

```
REQUIREMENT: Failed re-authentication attempt logs MUST be retained for at least
             the same period as audit trail entries for the corresponding port scope
             (section 63). In GxP environments, failed re-authentication attempts are
             security-relevant records per 21 CFR 11.300(d) and MUST be included in
             the data retention policy alongside audit trail entries. The retention
             period for failed re-authentication logs MUST be documented in the
             validation plan (section 67). Organizations MUST ensure that these logs
             are subject to the same integrity controls (e.g., tamper detection,
             access restriction) as the audit trail itself.
             Reference: 21 CFR 11.300(d), EU GMP Annex 11 §12.3.
```

```
REQUIREMENT: reauthenticate() MUST verify two components:
             1. Identification: signerId (who is signing)
             2. Verification: credential (proof of identity, e.g., password,
                biometric, smartcard)

REQUIREMENT: reauthenticate() MUST return a time-limited
             ReauthenticationToken. Recommended validity: 5 minutes.
             Tokens MUST NOT be reusable after expiration.

REQUIREMENT: capture() MUST reject expired ReauthenticationTokens
             with a SignatureError (category: "reauth_expired").

REQUIREMENT: In GxP environments, ReauthenticationToken validity MUST NOT exceed
             15 minutes. The configured lifetime MUST be documented in the validation
             plan and verified during OQ. Implementations SHOULD use the recommended
             5-minute default; the 15-minute ceiling accommodates complex signing
             workflows while maintaining regulatory compliance.
             Reference: 21 CFR 11.100(a), 11.200(a)(1).
```

#### 62b-1. Constant-Time Comparison Requirements (GxP)

When `gxp: true`, all comparison and evaluation operations that could leak information via timing side-channels MUST use constant-time algorithms. This includes cryptographic comparison operations (signature values, re-authentication tokens) and policy evaluation timing (which could reveal permission set membership).

```
REQUIREMENT: When gxp: true, SignatureService.validate() MUST use constant-time
             comparison for all cryptographic signature values. Implementations
             MUST use crypto.timingSafeEqual() (Node.js) or an equivalent
             constant-time comparison function. Variable-time string comparison
             (e.g., === on signature strings) is not acceptable in GxP mode
             because timing differences can reveal partial signature information
             to an attacker with network-level observation capability.
             Reference: 21 CFR 11.10(a), NIST SP 800-131A.

REQUIREMENT: When gxp: true, ReauthenticationToken comparison in the
             SignatureService adapter MUST use constant-time comparison.
             Token values are cryptographically generated (CSPRNG per
             07-guard-adapter.md section 25) and timing leaks could enable
             token prediction attacks.
             Reference: 21 CFR 11.10(a), NIST SP 800-131A.

REQUIREMENT: When gxp: true, evaluation timing MUST be resistant to timing attacks.
             The guard wrapper MUST add constant-time padding to normalize evaluation
             duration to a configurable ceiling, preventing timing-based inference
             about the subject's permission set. The duration ceiling MUST be
             documented in the validation plan (section 67) and calibrated during
             PQ (section 67c). Implementations MUST ensure that deny evaluations
             and allow evaluations complete in the same observable time window.
             Reference: 21 CFR 11.10(a), NIST SP 800-131A.
             Finding: GCR-2026-001 (elevated from RECOMMENDED to REQUIRED).

RECOMMENDED: In non-GxP environments, evaluation timing resistance remains
             RECOMMENDED. Organizations SHOULD document their timing resistance
             posture in the validation plan with a risk assessment per ICH Q9.
```

> **Cross-reference:** All three security mitigations (evaluation timing, signature comparison, and token comparison) in 16-definition-of-done.md (Security Testing Considerations) are elevated to REQUIREMENT when `gxp: true` per this section. Evaluation timing was elevated from RECOMMENDED to REQUIRED per GxP compliance review finding GCR-2026-001. See 16-definition-of-done.md for the non-GxP baseline.

#### Continuous Signing Session Rules (11.200(a)(1))

For workflows where a signer applies multiple signatures in sequence (e.g., reviewing a batch of records):

```
REQUIREMENT: The first signature in a continuous session MUST require
             re-authentication (both identification and verification
             components).

REQUIREMENT: Subsequent signatures in the same continuous session
             MAY use the identification component only (signerId),
             provided the ReauthenticationToken has not expired.

REQUIREMENT: If the signer leaves the workstation or the session
             is interrupted, re-authentication with both components
             MUST be required before the next signature.
```

The `ReauthenticationToken.expiresAt` field enforces the session timeout. Consumer adapters implement workstation departure detection.

```
REQUIREMENT: In GxP environments, consumer adapters MUST implement at least one
             session interruption detection mechanism to invalidate the active
             ReauthenticationToken when the signer leaves the workstation. The
             implemented mechanism(s) MUST be documented in the validation plan
             (section 67) and verified during OQ. Concrete strategies include:
             (1) Idle timeout: If no user input is received within a configurable
                 window (recommended: 2-5 minutes), expire the token and require
                 full re-authentication before the next signature.
             (2) OS lock-screen detection: Hook into platform-specific screen lock
                 events (e.g., "Lock" event on Windows, sessionDidBecomeInactive on
                 macOS, D-Bus org.freedesktop.ScreenSaver on Linux) and invalidate
                 the token immediately upon lock.
             (3) Heartbeat-based session monitoring: For web-based signing interfaces,
                 use a periodic heartbeat (recommended: every 30 seconds). If the
                 heartbeat is not received within 2 missed intervals, treat the session
                 as interrupted and require re-authentication.
             (4) Browser visibility API: For browser-based workflows, use the Page
                 Visibility API (document.visibilityState === "hidden") to detect
                 tab/window switches and start an idle timer that expires the token
                 after a configurable period (recommended: 1-2 minutes of hidden state).
             The specific strategy MUST be determined by the site's risk assessment
             (section 68) and documented in the validation plan (section 67).
             Reference: 21 CFR 11.200(a)(1).
```

> **Biometric Controls:** When `ReauthenticationChallenge.method` is `"biometric"`, the consumer adapter SHOULD implement additional controls per 21 CFR Part 11 Section 11.200(b) to ensure the biometric cannot be used by anyone other than its genuine owner. These controls are device-specific (e.g., liveness detection, anti-spoofing measures, sensor tamper detection) and are outside the scope of the guard library. The `SignatureService` adapter is responsible for delegating to a biometric verification subsystem that satisfies these requirements.

```
RECOMMENDED: Organizations requiring biometric-based electronic signatures per
             21 CFR 11.300 SHOULD implement biometric verification via the
             ReauthenticationChallenge mechanism with challengeType "biometric".
             The biometric template MUST be stored and compared in accordance
             with 21 CFR 11.300 controls, including uniqueness verification
             (11.300(a)), non-transferability (11.300(b)), and periodic
             re-enrollment (11.300(c)). The guard library does not implement
             biometric capture; this is a consumer integration responsibility.
             Biometric verification results SHOULD be recorded in the
             re-authentication log alongside password-based attempts.
             Reference: 21 CFR 11.300(a)-(d), 21 CFR 11.200(b).
```

```
REQUIREMENT: In GxP environments, consumer adapters capturing electronic signatures
             via web or mobile interfaces MUST implement at least two device checks
             per 21 CFR 11.10(h) to validate the source of the re-authentication
             request. The device checks MUST be selected from:
             (1) TLS client certificate validation for terminal identification,
             (2) session binding to prevent session hijacking during the signing flow,
             (3) user-agent or device fingerprint correlation with the authenticated
                 session,
             (4) IP range restrictions for signing operations in controlled environments.
             The selected device checks MUST be determined by the site's risk assessment
             (section 68), documented in the validation plan (section 67), and verified
             during OQ (section 67b).
             Reference: 21 CFR 11.10(h), EU GMP Annex 11 §12.

RECOMMENDED: In non-GxP environments, consumer adapters capturing electronic
             signatures via web or mobile interfaces SHOULD implement device checks
             to validate the source of re-authentication requests. The specific
             checks SHOULD be determined by the site's risk assessment.
```

### 65c. Key Management Behavioral Contract (11.200)

Guard defines key management as a behavioral contract on the `SignatureService` adapter. The guard library does not manage keys directly -- it specifies what compliant adapters must guarantee.

#### Key Generation

```
REQUIREMENT: Signing keys MUST be generated using a cryptographically
             secure pseudo-random number generator (CSPRNG).
             Use crypto.getRandomValues() or equivalent platform API.
```

#### Key Storage

```
REQUIREMENT: Signing keys MUST NOT be stored in source code,
             environment variables (in production or validation environments),
             or unencrypted configuration files.

REQUIREMENT: When gxp is true, signing keys MUST be stored in a Hardware Security
             Module (HSM) certified to FIPS 140-2 Level 3 or FIPS 140-3 Level 3,
             a platform keystore (AWS KMS, Azure Key Vault, GCP Cloud KMS), or an
             organizational secrets manager with access audit logging. The chosen
             key storage mechanism MUST provide automatic tamper detection or
             tamper-evidence capabilities. This reduces the Detectability score for
             FM-07 (key exposure) from 2 to 1 in the FMEA (section 68), as HSM and
             platform keystores provide automatic tamper detection that does not
             depend on manual review.
             Reference: 21 CFR 11.200, NIST SP 800-131A.

RECOMMENDED: In non-GxP environments, use a Hardware Security Module (HSM),
             platform keystore (e.g., AWS KMS, Azure Key Vault), or secrets
             manager for production key storage.
```

#### §65c-1. HSM Integration Requirements

```
REQUIREMENT: When gxp is true and the organization uses a Hardware Security Module
             (HSM) for signing key storage, the following operational requirements
             MUST be satisfied:

             (a) Key ceremony: Initial key generation and all subsequent key
                 generation events MUST be performed via a documented key ceremony
                 with dual-person control (two authorized personnel must be present
                 and must independently authenticate). The key ceremony MUST produce
                 documented evidence including: ceremony timestamp, identities of
                 both participants, key identifier generated, key algorithm and
                 size, and purpose (initial generation, rotation, or recovery).

             (b) Key rotation procedure: Key rotation MUST follow this sequence:
                 1. Generate a new signing key on the HSM via key ceremony.
                 2. Transition the old key to verify-only state — the old key
                    MUST remain available for signature validation on existing
                    entries but MUST NOT be used for new signatures.
                 3. Record a key rotation audit entry in the administrative
                    event log (section 64b) with: old key identifier, new key
                    identifier, rotation timestamp, ceremony reference, and
                    operator identities.
                 4. Verify that existing signatures produced with the old key
                    still validate correctly after rotation.

             (c) HSM unavailability handling:
                 - SignatureService.capture() MUST return Err(SignatureError)
                   with category "hsm_unavailable" when the HSM is unreachable.
                 - SignatureService.validate() MAY continue using cached public
                   keys when the HSM is unavailable for verification operations,
                   provided the public key cache was populated during a period of
                   confirmed HSM availability and has not expired.
                 - HSM unavailability MUST trigger a MAJOR severity alert per the
                   incident classification matrix (section 68).
                 - The organization's business continuity plan (section 61, BCP)
                   MUST include HSM unavailability as a covered scenario with
                   defined RTO for signature operations.

             Reference: 21 CFR 11.200 (electronic signature controls),
             NIST SP 800-57 (key management), EU GMP Annex 11 §12.
```

> **Cross-reference:** See Appendix H (15-appendices.md) for the HSM reference adapter pattern demonstrating the behavioral contract for HSM-backed SignatureService implementations.

#### Key Rotation

```
REQUIREMENT: Key rotation MUST NOT invalidate existing signatures.
             Old keys transition to a "verify-only" state: they can
             be used by validate() but MUST NOT be used by capture().

REQUIREMENT: When a key is rotated, the new key MUST be used for all
             subsequent capture() calls. The old key MUST remain
             available for validate() calls on previously signed entries.
```

#### Key Revocation

```
REQUIREMENT: Revoked keys MUST NOT be used for new signatures.
             capture() with a revoked key MUST return
             Err(SignatureError) with category "key_revoked".

REQUIREMENT: validate() on a signature made with a revoked key
             MUST return { valid: true, bindingIntact: true, keyActive: false }.
             The signature is still cryptographically valid, but the key
             status indicates the signature warrants additional scrutiny.
```

#### Key Compromise Emergency Response

When a signing key is suspected or confirmed to be compromised, the following emergency response procedures apply.

```
REQUIREMENT: Organizations MUST implement at least one key compromise detection
             mechanism from the following:
             (1) HSM tamper detection: Hardware Security Modules with physical tamper
                 evidence and automated alerting on tamper events.
             (2) Anomaly monitoring: Automated detection of unusual signing patterns
                 (e.g., signatures from unexpected IP ranges, abnormal signing volume,
                 signing outside business hours) with threshold-based alerting.
             (3) Manual reporting: A documented procedure for personnel to report
                 suspected key compromise, with a defined escalation path and
                 response SLA.
             (4) Automated key integrity checks: Periodic verification that the
                 signing key material has not been extracted from its secure storage.
             The implemented mechanism(s) MUST be documented in the validation plan
             (section 67) and verified during OQ testing.
             Reference: 21 CFR 11.10(a), 11.200.

REQUIREMENT: "Confirmed compromise" is defined as any of: (1) evidence that key
             material has been exfiltrated from its secure storage, (2) signatures
             verified as produced outside the legitimate signing infrastructure,
             (3) HSM tamper detection triggered, or (4) credible report from a
             trusted source (e.g., internal security team, vendor advisory). The
             detection procedure and confirmation criteria MUST be documented in
             the site's incident response plan.
```

```
REQUIREMENT: Upon detection of a key compromise, the affected key MUST be revoked
             immediately. Revocation MUST be completed within 1 hour of confirmed
             compromise. The compliance team and IT security team MUST be notified
             within the same 1-hour window. The notification MUST include: the key
             identifier, the estimated window of compromise, and the affected scopes.

REQUIREMENT: A forensic analysis MUST be conducted on all signatures produced by the
             compromised key during the estimated window of compromise. The analysis
             MUST determine: (1) which audit entries were signed with the compromised
             key, (2) whether any signatures show evidence of forgery or tampering,
             and (3) the complete list of affected evaluationIds and scopeIds.

REQUIREMENT: Audit entries signed by the compromised key during the estimated window
             of compromise MUST be quarantined. Quarantined entries MUST NOT be used
             as compliance evidence until the forensic analysis concludes and
             corrective actions are applied.

RECOMMENDED: After forensic analysis, entries confirmed as authentic (i.e., produced
             by the legitimate system before compromise) SHOULD be re-signed with a
             new key.

REQUIREMENT: When re-signing is performed, the operation MUST be documented in the
             change control log with: (1) the original evaluationId, (2) the old key
             identifier, (3) the new key identifier, (4) the re-signing timestamp,
             and (5) the operator identity.

REQUIREMENT: If the compromised key was used to sign entries in a GxP-regulated
             environment, the organization MUST evaluate the need for regulatory
             notification per the applicable regulation (e.g., FDA field alert,
             EU GMP rapid alert). The evaluation and its outcome MUST be documented
             in the incident report.

REQUIREMENT: The key compromise incident MUST be documented as a CAPA (Corrective
             Action / Preventive Action) per the site's quality management system.

RECOMMENDED: The CAPA SHOULD include: root cause analysis of how the key was
             compromised, corrective actions taken (revocation, re-signing,
             notification), and preventive actions to avoid recurrence (e.g.,
             HSM migration, access control tightening, key rotation schedule review).

RECOMMENDED: Forensic analysis of signatures produced by a compromised key (per the
             REQUIREMENT above) SHOULD be completed within 30 calendar days of confirmed
             compromise. If the analysis cannot be completed within 30 days, a status
             update SHOULD be submitted to the compliance team with a revised timeline
             and justification for the extension.
```

#### Supported Algorithms

Compliant `SignatureService` adapters SHOULD support at least one of:

| Algorithm   | Key Size         | Use Case                                  |
| ----------- | ---------------- | ----------------------------------------- |
| HMAC-SHA256 | 256-bit          | Single-server deployments, testing        |
| RSA-SHA256  | 2048-bit minimum | Multi-server deployments, non-repudiation |
| ECDSA P-256 | 256-bit          | High-performance, compact signatures      |

```
REQUIREMENT: GxP SignatureService adapters MUST use key sizes at or above: RSA
             2048-bit, ECDSA P-256 (256-bit), HMAC-SHA256 256-bit. Keys below these
             thresholds MUST be rejected at adapter construction time with a
             ConfigurationError. Reference: 21 CFR 11.200, NIST SP 800-131A.
```

```
RECOMMENDED: Organizations SHOULD establish an algorithm deprecation policy aligned
             with NIST SP 800-131A transition timelines:
             (1) Monitor NIST deprecation announcements annually during periodic
                 review (section 64).
             (2) Plan migration at least 2 years before an algorithm's NIST end-of-life
                 date (e.g., if NIST deprecates RSA-2048, begin migration to RSA-3072
                 or ECDSA P-384 within the 2-year window).
             (3) Document the deprecation timeline and migration plan in the site
                 IQ/OQ validation plan (section 67).
             (4) Include algorithm migration testing in periodic OQ re-verification
                 (section 64, periodic review trigger).
             Reference: NIST SP 800-131A Section 5, 21 CFR 11.200.
```

> **Non-Repudiation Note:** HMAC-SHA256 uses a symmetric shared secret, which means both the signer and the verifier possess the same key. This provides **authentication** (proof that someone with the key produced the signature) but does **NOT** provide **non-repudiation** (the signer can deny authorship because the verifier could have produced the same signature). For workflows requiring non-repudiation — such as regulatory submissions, batch release signatures, or legal attestations — use an asymmetric algorithm (RSA-SHA256 or ECDSA P-256) where only the signer holds the private key.

```
REQUIREMENT: GxP environments using hasSignature policies for compliance evidence
             (batch release, regulatory submissions, counter-signing per 21 CFR 11.50)
             MUST use asymmetric signature algorithms (RSA-SHA256 with 2048-bit minimum
             key size, or ECDSA P-256). HMAC-SHA256 is permitted for development,
             testing, and non-regulatory operational signatures. Asymmetric algorithms
             provide non-repudiation: the signer cannot deny authorship because only
             the signer possesses the private key. The algorithm choice MUST be
             documented in the validation plan (section 67) with justification based
             on the site's risk assessment (section 68).
             Reference: 21 CFR 11.50 (signature binding), 21 CFR 11.200.
```

#### Implementation Guidance Table

| Deployment    | Key Storage                                                            | Algorithm                 | Notes                                                                                                  |
| ------------- | ---------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------ |
| Single server | OS keyring or encrypted file                                           | HMAC-SHA256               | Testing/non-regulatory only when gxp:true. Simplest setup; symmetric key shared by signer and verifier |
| Microservices | Centralized secrets manager (Vault, AWS KMS)                           | RSA-SHA256                | Asymmetric keys allow verification without sharing the private key                                     |
| High-security | HSM (FIPS 140-3 Level 3, or FIPS 140-2 Level 3 for legacy deployments) | ECDSA P-256 or RSA-SHA256 | Hardware-backed key protection; required for highest assurance                                         |
| Development   | In-memory (MemorySignatureService)                                     | HMAC-SHA256               | Testing only; keys are ephemeral and not persisted                                                     |

> **Note on Individual Signature Revocation:** Key revocation (described above) is a forward-looking operation: it prevents new signatures from being created with the revoked key and marks existing signatures as `keyActive: false` during validation. Voiding a specific previously-captured signature (retroactive invalidation of a single signature while leaving other signatures from the same key intact) is outside the scope of `@hex-di/guard`. Key revocation handles the common compliance scenario. Organizations requiring fine-grained retroactive signature invalidation should implement that logic in their `SignatureService` adapter, potentially using a revocation list indexed by signature value or evaluation ID.

### 65c-2. Post-Quantum Cryptography (PQC) Readiness

NIST has finalized its first post-quantum cryptographic standards. While current RSA and ECDSA algorithms remain secure for near-term use, organizations with long-retention audit trails (5-25+ years per §63) must plan for cryptographic agility to ensure signatures remain verifiable throughout the retention period.

#### NIST PQC Standards

| NIST Standard | Algorithm                   | Type                           | Status       | Guard Relevance                                                                |
| ------------- | --------------------------- | ------------------------------ | ------------ | ------------------------------------------------------------------------------ |
| FIPS 203      | ML-KEM (CRYSTALS-Kyber)     | Key Encapsulation              | Final (2024) | Key exchange — relevant if audit data encrypted in transit                     |
| FIPS 204      | ML-DSA (CRYSTALS-Dilithium) | Digital Signature              | Final (2024) | Primary PQC replacement for RSA/ECDSA in `SignatureService`                    |
| FIPS 205      | SLH-DSA (SPHINCS+)          | Digital Signature (hash-based) | Final (2024) | Stateless alternative; larger signatures but conservative security assumptions |

#### Migration Timeline

| Phase                     | Timeline  | Actions                                                                                                                             |
| ------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Awareness**             | 2024-2026 | Monitor NIST PQC standards finalization; inventory all cryptographic algorithms in use                                              |
| **Preparation**           | 2026-2028 | Ensure `SignatureService` adapter interface supports algorithm agility (no hardcoded algorithm assumptions); prototype PQC adapters |
| **Hybrid transition**     | 2028-2030 | Deploy hybrid signatures (classical + PQC) for new audit entries; validate PQC signatures in `verifyAuditChain()`                   |
| **PQC primary**           | 2030-2035 | Transition to PQC-only signatures for new entries; maintain classical verification capability for historical entries                |
| **Classical deprecation** | 2035+     | Classical-only signatures no longer accepted for new entries; historical verification retained indefinitely                         |

```
RECOMMENDED: SignatureService adapter implementations SHOULD be designed for
             algorithm agility. The adapter interface already supports this via
             the `algorithm` field on ElectronicSignature — adapters SHOULD NOT
             hardcode algorithm selection but instead accept it as configuration.
             This allows migration to PQC algorithms without adapter interface
             changes.
             Reference: NIST SP 800-131A (Transitioning the Use of Cryptographic
             Algorithms and Key Lengths), CNSA 2.0.
```

```
RECOMMENDED: Organizations with audit trail retention periods extending beyond
             2035 SHOULD evaluate hybrid signature strategies during the
             Preparation phase (2026-2028). A hybrid signature concatenates a
             classical signature (RSA/ECDSA) with a PQC signature (ML-DSA) over
             the same payload. This provides quantum resistance while maintaining
             backward compatibility with existing verification tooling.
             The hybrid approach SHOULD be documented in the validation plan (§67)
             and verified during OQ.
```

```
RECOMMENDED: The `verifyAuditChain()` function SHOULD support multi-algorithm
             verification — a single chain may contain entries signed with
             different algorithms (RSA, ECDSA, ML-DSA, hybrid) as the
             organization transitions through the migration phases. The
             `hashAlgorithm` and `ElectronicSignature.algorithm` fields provide
             the per-entry metadata needed for multi-algorithm verification.
```

> **Note:** PQC readiness is categorized as RECOMMENDED (not REQUIRED) because NIST PQC standards are newly finalized and ecosystem tooling (Node.js crypto module, HSM firmware) is still maturing. This section will be re-evaluated for elevation to REQUIREMENT when PQC libraries reach production maturity in the Node.js ecosystem. Organizations in sectors with particularly long retention periods (clinical trials: 25+ years) SHOULD prioritize PQC readiness assessment.

### 65c-3. Certificate Lifecycle Management

X.509 certificates underpin the trust chain for electronic signatures in GxP environments. This section specifies requirements for certificate issuance, renewal, revocation, and archival to ensure continuous signature validity throughout the retention period.

```
REQUIREMENT: When gxp is true, SignatureService adapter implementations
             MUST implement certificate lifecycle management as follows:

             1. **Certificate Issuance:**
                (a) Certificates used for GxP electronic signatures MUST be
                    issued by a Certificate Authority (CA) trusted by the
                    organization's PKI infrastructure.
                (b) Self-signed certificates MUST NOT be used in GxP
                    production environments. Self-signed certificates are
                    acceptable only in development and testing environments.
                (c) Certificate issuance events MUST be recorded in the
                    administrative event log (§64b) with: certificate serial
                    number, subject DN, issuer DN, validity period, and
                    intended key usage.

             2. **Certificate Renewal:**
                (a) The SignatureService adapter MUST monitor certificate
                    expiration and produce structured events at the following
                    thresholds before expiry:
                    - 90 days: INFO event "guard.cert-renewal-due"
                    - 30 days: WARNING event "guard.cert-renewal-urgent"
                    - 7 days: CRITICAL event "guard.cert-expiry-imminent"
                (b) checkGxPReadiness() MUST report WARNING when any active
                    signing certificate expires within 30 days.
                (c) Certificate renewal MUST follow the same approval workflow
                    as initial issuance (§64a change control).

             3. **Certificate Revocation:**
                (a) The validate() method MUST check certificate revocation
                    status via CRL (Certificate Revocation List) or OCSP
                    (Online Certificate Status Protocol) before accepting a
                    signature.
                (b) When revocation checking is unavailable (CRL endpoint
                    unreachable, OCSP responder timeout), the adapter MUST
                    apply a configurable policy: "soft-fail" (accept with
                    WARNING log) or "hard-fail" (reject with
                    SignatureError category "cert_revocation_unknown").
                    The default for GxP environments MUST be "hard-fail".
                (c) Certificate revocation events MUST be recorded in the
                    administrative event log with: certificate serial number,
                    revocation reason, revocation timestamp, and CRL/OCSP
                    source.

             4. **Certificate Chain Archival:**
                (a) When gxp is true, the complete certificate chain (end-entity
                    certificate, intermediate CA certificates, root CA
                    certificate) used to produce each signature MUST be
                    archived alongside the audit trail data.
                (b) Archived certificate chains MUST be retained for the same
                    duration as the signatures they validate (per §63
                    retention periods).
                (c) The verifyAuditChain() function MUST support verification
                    of archived signatures using the archived certificate
                    chain, even after the signing certificate has expired or
                    been revoked — historical signatures remain valid if they
                    were valid at the time of signing.

             5. **Certificate Transparency Monitoring:**
                (a) Organizations SHOULD monitor Certificate Transparency (CT)
                    logs for unauthorized certificate issuance using their
                    domain names.
                (b) Detection of unauthorized certificates MUST trigger the
                    key compromise response procedure (§65c-1).

             Reference: 21 CFR 11.10(a), 21 CFR 11.200, X.509 (RFC 5280),
             OCSP (RFC 6960), NIST SP 800-57.
             REQ-GUARD-068.
```

### 65c-4. Signature Algorithm Migration

Organizations transitioning between cryptographic algorithms (e.g., RSA to ECDSA, classical to PQC per §65c-2) require a structured migration path that preserves audit chain integrity across algorithm boundaries.

```
REQUIREMENT: When gxp is true and the organization transitions between
             signature algorithms, the migration MUST follow an epoch-based
             approach:

             1. **Epoch Definition:**
                (a) An algorithm epoch is a time-bounded period during which
                    a specific set of signature algorithms are accepted for
                    new signatures and for verification of existing
                    signatures.
                (b) Each epoch MUST be defined with: epoch identifier (monotonic
                    integer), start timestamp, accepted signing algorithms,
                    accepted verification algorithms, and the preceding epoch
                    identifier.
                (c) Epoch transitions MUST be recorded as
                    PolicyChangeAuditEntry records (§64a-1) in the audit
                    trail.

             2. **Migration Sequence:**
                Algorithm transitions MUST follow a three-phase sequence:
                (a) **Verify-only phase:** The new algorithm is added to the
                    verification algorithm set but NOT to the signing
                    algorithm set. This allows the system to verify
                    signatures created by external systems or future-dated
                    test signatures. Duration: minimum 30 days.
                (b) **Dual-signing phase:** Both the old and new algorithms
                    are accepted for signing. New signatures MAY use either
                    algorithm. Verification accepts both. Duration: minimum
                    90 days (or one full audit review cycle, whichever is
                    longer).
                (c) **Primary phase:** The new algorithm becomes the default
                    for new signatures. The old algorithm remains in the
                    verification set for historical signatures.

             3. **Multi-Algorithm Verification:**
                (a) The verifyAuditChain() function MUST support chains
                    containing entries signed with different algorithms
                    (spanning epoch boundaries).
                (b) For each entry, verifyAuditChain() MUST select the
                    verification algorithm based on the
                    ElectronicSignature.algorithm field on that entry.
                (c) An entry signed with an algorithm not in the current
                    epoch's verification set MUST produce a verification
                    WARNING (not failure) if the algorithm was valid in the
                    epoch that was active when the entry was created.

             4. **Deprecation Timeline:**
                When an algorithm is scheduled for removal from the active
                signing set:
                (a) T-24 months: INFO log "guard.algorithm-deprecation-notice"
                    emitted at startup and recorded in health check output.
                (b) T-12 months: checkGxPReadiness() reports WARNING with
                    diagnostic "guard.algorithm-deprecation-pending" listing
                    the affected algorithm and target removal date.
                (c) T-0: Algorithm removed from the signing algorithm set.
                    The algorithm MUST remain in the verification set
                    indefinitely to support historical signature validation.

             Reference: NIST SP 800-131A (Transitioning the Use of
             Cryptographic Algorithms and Key Lengths), 21 CFR 11.10(a),
             EU GMP Annex 11 Section 5.
             REQ-GUARD-069.
```

### 65d. Signature Meaning Registry

The `hasSignature` policy variant requires a `meaning` field that specifies what the signature represents. Guard defines a standard set of signature meanings:

```typescript
/**
 * Standard signature meanings for 21 CFR Part 11 compliance.
 *
 * These constants define the well-known signature meanings used in
 * hasSignature policies. Consumer adapters may define additional
 * meanings, but these six cover the most common GxP workflows.
 */
const SignatureMeanings = {
  /** The signer authored or created the record. */
  AUTHORED: "authored",
  /** The signer reviewed the record for accuracy. */
  REVIEWED: "reviewed",
  /** The signer approved the record for release or use. */
  APPROVED: "approved",
  /** The signer verified the record against source data. */
  VERIFIED: "verified",
  /** The signer rejected the record (requiring correction). */
  REJECTED: "rejected",
  /** The signer accepts accountability for the content of the record. */
  RESPONSIBLE: "responsible",
} as const;

type SignatureMeaning = (typeof SignatureMeanings)[keyof typeof SignatureMeanings];
```

> **Note on "responsibility" signatures:** 21 CFR 11.50 lists "responsibility" as an example signature meaning alongside "review, approval" and "authorship." The `RESPONSIBLE` standard meaning directly addresses this requirement. It is semantically distinct from `AUTHORED` (creation) and `APPROVED` (release authorization): `RESPONSIBLE` indicates that the signer accepts accountability for the content of a record they may not have created or approved.

```
RECOMMENDED: Organizations whose processes require "responsibility" attestation
             (explicitly listed in 21 CFR 11.50) SHOULD use the standard `RESPONSIBLE`
             meaning. If more granular responsibility semantics are needed (e.g.,
             distinguishing between "responsible for accuracy" and "responsible for
             completeness"), organizations MAY define custom meanings using the
             org.<organization>.responsible.* namespace following the custom meaning
             conventions below.
             Reference: 21 CFR 11.50.
```

#### Custom Signature Meanings

Organizations may define additional signature meanings beyond the six standard constants. Custom meanings MUST follow these conventions:

```
REQUIREMENT: The six standard SignatureMeaning values (AUTHORED, REVIEWED, APPROVED,
             VERIFIED, REJECTED, RESPONSIBLE) MUST NOT be redefined, aliased, or overloaded with
             alternate semantics. Their definitions are fixed for regulatory
             interoperability.

RECOMMENDED: Custom signature meanings SHOULD use a namespaced convention to avoid
             collisions across organizations:

             Format: org.<organization>.<meaning>
             Examples: org.acme.calibration_witnessed
                       org.pharma-co.environmental_monitoring_reviewed

RECOMMENDED: Organizations SHOULD maintain a signature meaning registry as part of
             their computerized system validation documentation (per GAMP 5). The
             registry SHOULD include: (1) the meaning identifier, (2) a human-readable
             description, (3) the regulatory basis for the meaning, (4) the roles
             authorized to apply signatures with that meaning, and (5) the effective
             date.

RECOMMENDED: Custom meanings SHOULD be documented in the site's computerized system
             validation plan per GAMP 5 Appendix D4. Each custom meaning constitutes
             a system configuration change and SHOULD follow the change control process
             defined in section 64a.

REQUIREMENT: When deprecating a custom signature meaning, the old meaning identifier
             MUST NOT be reused with different semantics. Existing signatures using a
             deprecated meaning remain valid and MUST NOT be re-signed unless required
             by a regulatory finding or corrective action.

RECOMMENDED: Deprecated meanings SHOULD be marked in the signature meaning registry
             with: (1) the deprecation effective date, (2) a pointer to the replacement
             meaning (if any), and (3) the reason for deprecation.
```

#### Usage with hasSignature Policy

```typescript
import { hasSignature, allOf, SignatureMeanings } from "@hex-di/guard";

// Require a "reviewed" signature from a reviewer
const reviewPolicy = hasSignature(SignatureMeanings.REVIEWED, { signerRole: "reviewer" });

// Require both review and approval (maker-checker pattern)
const makerCheckerPolicy = allOf(
  hasSignature(SignatureMeanings.REVIEWED, { signerRole: "reviewer" }),
  hasSignature(SignatureMeanings.APPROVED, { signerRole: "approver" })
);
```

### Counter-Signing and Witness Signatures

Counter-signing (also called "witness signing") is the GxP pattern where a second signer independently attests to a record. This is expressed via `allOf` with multiple `hasSignature` policies, each specifying a distinct `signerRole` to enforce separation of duties.

#### Example: Author + Witness

```typescript
import { hasSignature, allOf, SignatureMeanings } from "@hex-di/guard";

// The author creates the record; a separate witness verifies it.
// The two signerRole values MUST be different to enforce separation of duties.
const counterSignPolicy = allOf(
  hasSignature(SignatureMeanings.AUTHORED, { signerRole: "author" }),
  hasSignature(SignatureMeanings.VERIFIED, { signerRole: "witness" })
);
```

#### Sequential Capture Behavior

When the guard wrapper encounters a policy tree with multiple `hasSignature` nodes (e.g., inside an `allOf`), it captures signatures sequentially — one per distinct `meaning`:

1. **First signature:** Re-authenticate the author → capture "authored" signature → validate → append to `signatures` array
2. **Second signature:** Re-authenticate the witness (independent re-authentication) → capture "verified" signature → validate → append to `signatures` array

Each re-authentication is independent. The witness MUST re-authenticate separately from the author, even if both are signing within the same request. This satisfies the 21 CFR Part 11 section 11.100 requirement that each signer provides their own two-component identification.

> **Token Consumption Note:** Token consumption is per-signature. The first signer's `ReauthenticationToken` is consumed by their `capture()` call and is not relevant to the second signer's flow. There is no concern about the first signer's token expiring before the second signer re-authenticates, because each signer obtains and consumes their own independent token.

```
REQUIREMENT: Signatures in an allOf policy requiring multiple signers MUST be
             captured in depth-first, left-to-right policy tree traversal order,
             consistent with the evaluate() traversal defined in 05-policy-evaluator.md
             (section 18). The signatures array on the resulting AuditEntry MUST
             preserve the capture order — the first signature captured appears at
             index 0, the second at index 1, and so on.

             verifyAuditChain() MUST validate that the signature ordering in each
             AuditEntry matches the expected depth-first, left-to-right traversal
             order of the policy tree that was active at the time of evaluation.
             A signature ordering mismatch MUST produce a chain verification failure
             with category "signature_order_mismatch" and a diagnostic message
             indicating the expected vs. actual signer order.

             This deterministic ordering ensures that audit trail reviewers and
             automated verification tools can reliably associate each signature
             with its corresponding policy node, satisfying the requirement that
             electronic signatures be "linked to their respective electronic
             records" (21 CFR 11.70).
             Reference: 21 CFR 11.50, 21 CFR 11.70, ALCOA+ Consistent.
```

#### Separation of Duties Constraint

```
REQUIREMENT: SignatureService.capture() MUST reject same-signer duplicates
             within a single evaluation. If a signer has already provided a
             signature for a given evaluationId, a subsequent capture() call
             for the same signerId within the same evaluationId MUST return
             Err(SignatureError) with category "capture_failed" and a message
             indicating the separation of duties violation.

REQUIREMENT: When gxp is true, separation of duties enforcement MUST be active
             and non-overridable. Consumer adapters MUST expose an `enforceSeparation`
             parameter on SignatureService construction, and when the guard is
             configured with gxp: true, enforceSeparation MUST be set to true.
             Attempting to set enforceSeparation: false with gxp: true MUST produce
             a configuration error. This ensures that the same physical person
             cannot sign multiple meanings for the same evaluation in GxP
             environments. Reference: 21 CFR 11.10(g), EU GMP Annex 11 §12.

RECOMMENDED: In non-regulated environments, consumer adapters MAY set
             enforceSeparation to false, allowing the same physical person to sign
             multiple meanings — suitable for development and testing.
```

```
RECOMMENDED: Organizations SHOULD implement Identity Provider (IdP) controls to prevent
             one individual from obtaining multiple signerIds that could be used to
             circumvent separation of duties enforcement. Specifically:
             (a) Where shared or role-based accounts exist, separation of duties
                 controls and the mapping between accounts and natural persons MUST be
                 documented in the validation plan (section 67).
             (b) The annual signerId registry review (section 65b REQUIREMENT) SHOULD
                 include a check for duplicate natural persons across multiple
                 signerIds — e.g., by cross-referencing with the organizational
                 identity directory.
             (c) Any identified cases of one individual holding multiple signerIds
                 SHOULD be assessed for impact on prior counter-signing evidence and
                 documented as a deviation if separation of duties was potentially
                 compromised.
             Reference: 21 CFR 11.10(g), 21 CFR 11.100(a).
```

> **Consumer Implementation Note:** The per-evaluation tracking uses `evaluationId` as the correlation key. Consumer adapters should maintain a `Map<string, Set<string>>` (evaluationId → signerIds) for the duration of the evaluation. This map can be scoped to the evaluation lifecycle and does not require persistent storage.

---

### 65b-4. ReauthenticationToken Replay Protection

```
REQUIREMENT: When gxp is true, ReauthenticationToken single-use enforcement
             MUST be REQUIRED (elevated from RECOMMENDED in §65b). The
             SignatureService adapter MUST track token usage and reject any
             token that has already been consumed by a successful capture()
             call. Specifically:
             (a) Each ReauthenticationToken MUST carry a unique, CSPRNG-
                 generated token identifier (e.g., UUID v4).
             (b) Upon successful capture(), the token identifier MUST be
                 recorded in a consumed-token registry.
             (c) Subsequent capture() calls with the same token identifier
                 MUST return SignatureError with category "token_replayed".
             (d) The consumed-token registry MUST be durable — surviving
                 process restarts — when gxp is true. Acceptable storage
                 includes: database table, Redis set with persistence, or
                 append-only file. In-memory-only tracking is NOT acceptable
                 for GxP environments because a process restart would reset
                 the registry, allowing replay of previously consumed tokens.
             (e) Consumed token records MUST be retained for at least the
                 ReauthenticationToken expiration window (recommended 5
                 minutes per §65b) plus a safety margin of 5 minutes (total
                 10 minutes minimum). After this window, the token is expired
                 and replay is impossible regardless of registry state.
             Reference: 21 CFR 11.100, 21 CFR 11.300(d).

RECOMMENDED: In non-GxP environments, single-use token enforcement remains
             RECOMMENDED. In-memory tracking (process-scoped) is acceptable
             for non-GxP deployments.
```

### 65d-1. Minimum Signer Count for Counter-Signing Workflows

```
REQUIREMENT: When gxp is true and a hasSignature policy specifies a counter-
             signing workflow (meaning: "approved" or meaning: "released"),
             the minimum number of distinct signers MUST be configurable via
             the minSigners field on the hasSignature policy:

             interface HasSignaturePolicy {
               readonly kind: "hasSignature";
               readonly meaning: SignatureMeaning;
               readonly minSigners?: number; // default: 1
             }

             When minSigners is specified:
             (a) The evaluation MUST NOT return "allow" until at least
                 minSigners distinct signerIds have provided valid signatures
                 with the specified meaning for the evaluation.
             (b) All signers MUST be distinct per the separation of duties
                 rules (§65d).
             (c) The minSigners value MUST be at least 1.
             (d) For GxP batch release and regulatory submissions, minSigners
                 MUST be at least 2 (four-eyes principle). This is the
                 operational minimum; organizations MAY require more.

             The configured minSigners value MUST be documented in the
             validation plan (section 67) for each GxP-critical port.
             Reference: 21 CFR 11.50, 21 CFR 11.100, EU GMP Annex 11 §14.

RECOMMENDED: For non-GxP environments, minSigners defaults to 1. The four-
             eyes principle (minSigners >= 2) is RECOMMENDED for any
             operation with material business impact, regardless of GxP
             classification.
```

---

---

_Previous: [Administrative Controls](./06-administrative-controls.md) | Next: [Compliance Verification](./08-compliance-verification.md)_
