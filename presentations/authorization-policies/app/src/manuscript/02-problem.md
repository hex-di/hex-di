# 02 — The Authorization Problem

## Key Points

### Authentication vs Authorization

- **Authentication (AuthN)**: Who are you? (identity verification)
- **Authorization (AuthZ)**: What can you do? (access decisions)
- These are fundamentally different concerns that should be decoupled

### The Hardcoded Checks Problem

```typescript
if (user.role === "admin" || (user.role === "manager" && user.department === resource.department)) {
  // allow
}
```

- Scattered throughout codebase
- Impossible to audit
- Every new feature = new if/else branches
- No separation of policy from code

### Role Explosion

- Organization with 50 resources and 10 actions = 500 possible permissions
- Fine-grained control leads to exponential role combinations
- "Senior Editor for Region X in Department Y" — unique roles per user

### No Auditability

- Who granted this access? When? Why?
- What can user X access across the entire system?
- Can we prove compliance to auditors?
- No centralized policy to review

## The Cost

- Security vulnerabilities from inconsistent checks
- Compliance failures (SOC2, HIPAA, GDPR)
- Developer productivity loss maintaining authorization spaghetti
- Impossible to reason about system-wide access
