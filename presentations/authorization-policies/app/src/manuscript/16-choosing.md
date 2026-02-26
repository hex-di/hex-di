# 16 — Choosing the Right Model

## Decision Flowchart

```
START: What does your system need?
│
├── Simple resource permissions?
│   └── ACL (files, network rules)
│
├── Owner controls sharing?
│   └── DAC (collaborative tools, file sharing)
│
├── Strict classification levels?
│   └── MAC (military, government, regulated)
│
├── Role-based organizational access?
│   ├── < 50 roles needed?
│   │   └── RBAC (most enterprise apps)
│   └── Role explosion problem?
│       └── RBAC + ABAC hybrid
│
├── Complex attribute conditions?
│   └── ABAC (healthcare, finance, large enterprise)
│
├── Distributed / federated identity?
│   └── CBAC (multi-org, OAuth2/OIDC)
│
├── Hierarchical resource sharing?
│   └── ReBAC (SaaS, collaborative, social)
│
├── Policy versioning & testing?
│   └── PBAC (microservices, DevOps, cloud-native)
│
├── Adaptive security needed?
│   └── Context + Risk-Based (Zero Trust, financial)
│
└── All of the above?
    └── Hybrid (layer models by concern)
```

## Quick Selection Guide

| Scenario                              | Primary Model  | Add If Needed               |
| ------------------------------------- | -------------- | --------------------------- |
| Internal admin tool                   | RBAC           | —                           |
| SaaS multi-tenant                     | ReBAC          | RBAC for org roles          |
| Healthcare system                     | ABAC           | MAC for data classification |
| Microservices API gateway             | PBAC           | RBAC for service identity   |
| Collaborative docs (Google Docs-like) | ReBAC          | DAC for owner controls      |
| Financial trading platform            | ABAC + Context | Risk-Based for adaptive     |
| Government/military                   | MAC            | RBAC for role assignment    |
| B2B API platform                      | CBAC           | PBAC for rate limits/quotas |

## Anti-Patterns to Avoid

1. **Using RBAC for everything** — leads to role explosion
2. **Hardcoding authorization** — impossible to audit or change
3. **Ignoring context** — same access from office and coffee shop WiFi
4. **Over-engineering** — ABAC for a 3-role internal tool
5. **Mixing authN and authZ** — keep identity and access decisions separate
