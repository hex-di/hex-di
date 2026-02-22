# Appendix D: Type Relationship Diagram

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-15-D                               |
> | Revision         | 1.0                                      |
> | Effective Date   | 2026-02-15                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Appendix                             |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 1.0 (2026-02-15): Split from consolidated 15-appendices.md (CCR-GUARD-017) |

_Previous: [Appendix C: Glossary](./../glossary.md) | Next: [Appendix E: Comparison with Existing hex-di Patterns](./hex-di-pattern-comparison.md)_

---

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

_Previous: [Appendix C: Glossary](./../glossary.md) | Next: [Appendix E: Comparison with Existing hex-di Patterns](./hex-di-pattern-comparison.md)_
