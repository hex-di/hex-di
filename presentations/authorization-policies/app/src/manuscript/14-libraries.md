# 14 — Authorization Libraries & Tools

## Library Landscape

### CASL (JavaScript)

- **Stars**: ~6.2k | **Language**: TypeScript/JavaScript
- **Model**: ABAC with RBAC sugar
- **Key Feature**: Isomorphic — same rules on frontend & backend
- **Syntax**: `can('read', 'Article', { authorId: user.id })`
- **Use Case**: Full-stack JS apps, UI permission checks

### Casbin

- **Stars**: ~19.9k | **Languages**: Go, Java, Node, Python, Rust, .NET
- **Model**: ACL, RBAC, ABAC (configurable via model file)
- **Key Feature**: Multi-language, policy-model separation
- **Syntax**: Model in PERM format + policy in CSV/DB
- **Use Case**: Polyglot microservices, API gateways

### Open Policy Agent (OPA)

- **Stars**: ~11.2k | **Language**: Go (Rego policy language)
- **Model**: ABAC, PBAC (general-purpose)
- **Key Feature**: Decoupled policy engine, partial evaluation
- **Syntax**: Rego (Datalog-inspired)
- **Use Case**: Kubernetes, microservices, infrastructure policies

### Cedar (AWS)

- **Stars**: ~4.2k | **Language**: Rust
- **Model**: ABAC + RBAC (structured)
- **Key Feature**: Formal verification, fast evaluation
- **Syntax**: Cedar policy language
- **Use Case**: AWS Verified Permissions, fine-grained access

### OpenFGA

- **Stars**: ~4.8k | **Language**: Go
- **Model**: ReBAC (Zanzibar-inspired)
- **Key Feature**: Fine-grained authorization as a service
- **Syntax**: DSL for relationship types
- **Use Case**: SaaS multi-tenancy, document sharing

### SpiceDB

- **Stars**: ~6.4k | **Language**: Go
- **Model**: ReBAC (Zanzibar-inspired)
- **Key Feature**: Consistent, global permissions database
- **Syntax**: Schema language + gRPC API
- **Use Case**: Large-scale distributed systems

### Cerbos

- **Stars**: ~4.2k | **Language**: Go
- **Model**: ABAC + RBAC (policy-as-code)
- **Key Feature**: YAML/JSON policies, GitOps workflow
- **Syntax**: YAML resource policies
- **Use Case**: Microservices, API authorization

### Ory Keto

- **Stars**: ~5.3k | **Language**: Go
- **Model**: ReBAC (Zanzibar-inspired)
- **Key Feature**: Part of Ory ecosystem (Hydra, Kratos)
- **Syntax**: Relationship tuples via REST/gRPC
- **Use Case**: Self-hosted, privacy-focused systems
