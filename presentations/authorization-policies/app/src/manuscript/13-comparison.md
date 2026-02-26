# 13 — Deep Comparison Matrix

## All 10 Models Compared

| Model   | Granularity   | Scalability | Complexity | Auditability | Dynamic | Best For                            |
| ------- | ------------- | ----------- | ---------- | ------------ | ------- | ----------------------------------- |
| ACL     | Per-resource  | Low         | Low        | Low          | No      | File systems, network rules         |
| DAC     | Per-resource  | Low         | Low        | Low          | No      | Collaborative tools, file sharing   |
| MAC     | Per-level     | Medium      | High       | High         | No      | Military, government, high-security |
| RBAC    | Per-role      | Medium      | Medium     | High         | No      | Enterprise apps, databases          |
| ABAC    | Per-attribute | High        | High       | Medium       | Yes     | Complex enterprises, healthcare     |
| CBAC    | Per-claim     | High        | Medium     | Medium       | Partial | Federated/distributed systems       |
| ReBAC   | Per-relation  | Very High   | High       | Medium       | Yes     | Social, collaborative, hierarchical |
| PBAC    | Per-policy    | Very High   | High       | Very High    | Yes     | Microservices, cloud-native         |
| Context | Per-context   | High        | Very High  | High         | Yes     | Zero Trust, adaptive security       |
| Risk    | Per-score     | High        | Very High  | High         | Yes     | Financial, compliance-heavy         |

## Key Dimensions Explained

### Granularity

- **ACL/DAC**: Resource-level only
- **RBAC**: Role-level (coarse)
- **ABAC/PBAC**: Attribute/policy-level (fine)
- **ReBAC**: Relationship-level (structural)

### Scalability

- **ACL**: O(users × resources)
- **RBAC**: O(roles × permissions) — roles << users
- **ReBAC**: O(relationships) — graph-based, sub-millisecond checks
- **ABAC/PBAC**: Depends on policy complexity

### Auditability

- **RBAC**: "User X has role Y which grants Z" — clear
- **PBAC**: Policies in version control — auditable by design
- **ABAC**: Difficult — many attribute combinations
- **Risk-Based**: Score explanations needed

## When to Combine

Most production systems use 2-3 models together:

- RBAC + ABAC: Roles for coarse access, attributes for fine-grained
- ReBAC + PBAC: Relationships for structure, policies for rules
- RBAC + Context: Roles with environmental restrictions
