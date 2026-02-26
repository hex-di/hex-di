# 03 — Evolution of Access Control

## Timeline

### 1970s — Access Control Lists (ACL)

- Multics OS introduces per-object permission lists
- UNIX file permissions (rwx) become standard
- Simple but foundational concept

### 1973 — Bell-LaPadula Model (MAC)

- Military-grade classification levels
- "No read up, no write down" — formal security model
- Designed for government/defense systems

### 1992 — Role-Based Access Control (RBAC)

- Ferraiolo & Kuhn publish seminal RBAC paper
- NIST standardizes RBAC (2004)
- Becomes the dominant enterprise model

### 2005 — Attribute-Based Access Control (ABAC)

- XACML 2.0 specification
- Policies based on subject, resource, action, environment attributes
- First policy-as-data approach

### 2014 — Claims-Based Access Control (CBAC)

- OAuth 2.0 and OpenID Connect adoption
- JWT tokens carry claims for distributed authorization
- Federated identity becomes mainstream

### 2019 — Relationship-Based Access Control (ReBAC)

- Google publishes Zanzibar paper
- Access derived from entity relationships (graphs)
- Inspired SpiceDB, OpenFGA, Ory Keto

### 2020s — Policy-as-Code & Zero Trust

- OPA/Rego, Cedar, Cerbos emerge
- Zero Trust Architecture (NIST SP 800-207)
- Context-aware, risk-adaptive authorization
- Formal verification of policies
