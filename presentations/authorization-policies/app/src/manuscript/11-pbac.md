# 11 — Policy-Based Access Control (PBAC)

## Core Concept

Authorization logic is expressed as code — policies written in a dedicated language, versioned, tested, and deployed independently from application code.

## Policy-as-Code: Three Major Approaches

### OPA / Rego (Open Policy Agent)

```rego
package authz

default allow = false

allow {
  input.method == "GET"
  input.path == ["api", "public"]
}

allow {
  input.method == "GET"
  input.user.roles[_] == "viewer"
}

allow {
  input.method == "PUT"
  input.user.roles[_] == "editor"
  input.resource.owner == input.user.id
}
```

### Cedar (AWS)

```cedar
permit(
  principal in Group::"editors",
  action in [Action::"edit", Action::"view"],
  resource in Folder::"engineering"
) when {
  context.time.hour >= 9 && context.time.hour <= 18
};

forbid(
  principal,
  action,
  resource
) when {
  resource.classification == "top-secret"
} unless {
  principal.clearance == "top-secret"
};
```

### Cerbos

```yaml
apiVersion: api.cerbos.dev/v1
resourcePolicy:
  version: default
  resource: document
  rules:
    - actions: ["view"]
      effect: EFFECT_ALLOW
      roles: ["viewer", "editor", "admin"]
    - actions: ["edit"]
      effect: EFFECT_ALLOW
      roles: ["editor", "admin"]
      condition:
        match:
          expr: request.resource.attr.owner == request.principal.id
```

## Strengths

- Policies are version-controlled and testable
- Separation of concerns (policy decoupled from application)
- Audit-friendly (policy changes are tracked in git)
- Language-specific optimizations (OPA: partial evaluation, Cedar: formal verification)

## Weaknesses

- New language to learn (Rego, Cedar)
- Debugging policies can be challenging
- Operational overhead (policy server deployment)
- Performance depends on policy complexity
