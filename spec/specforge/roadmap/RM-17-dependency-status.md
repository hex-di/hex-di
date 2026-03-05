---
id: RM-17
title: "External Dependencies"
kind: roadmap
status: active
dependencies: []
---

## External Dependencies

SpecForge depends on hex-di libraries that are specified and developed outside this roadmap. These must reach sufficient maturity before the phases that require them.

| Dependency       | Required By | Blocking Phase | Notes                     |
| ---------------- | ----------- | -------------- | ------------------------- |
| `@hex-di/agent`  | PH-1        | PH-1           | Spec: `spec/libs/agent/`  |
| `@hex-di/flow`   | PH-1        | PH-1           | Spec: `spec/libs/flow/`   |
| `@hex-di/mcp`    | PH-10       | PH-10          | Spec: `spec/libs/mcp/`    |
| `@hex-di/guard`  | PH-7        | PH-7           | Spec: `spec/libs/guard/`  |
| `@hex-di/crypto` | PH-9        | PH-9           | Spec: `spec/libs/crypto/` |

---

## Dependency Graph

```
PH-1 (Foundation)
  └── PH-2 (Multi-Agent Orchestration) [PT-1]
        ├── PH-3 (Knowledge Graph & Composition)
        │     └── PH-6 (Reverse Engineering & Flows) [PT-3]
        └── PH-4 (Desktop App — Tauri) [PT-2]
              └── PH-5 (Web Dashboard + VS Code)
                    └── PH-7 (SaaS + Collaboration) [PT-4]
                          └── PH-8 (Import/Export + Extensibility)
                                └── PH-9★ (Hooks + Advanced Cost Optimization)
                                      └── PH-10★ (Memory + Advanced Agents + MCP)
                                            └── PH-11★ (Permissions + Structured Output)
                                                  └── PH-12 (Event-Triggered Flows) [PT-5]
                                                        └── PH-13 (Ecosystem + Marketplace) [PT-6]
                                                              └── PH-14 (Intelligence Layer)
                                                                    └── PH-15 (Autonomous Maintenance)
```

★ = expanded phase, [PT-X] = aligned product milestone

---

## Status Summary

| Phase     | Name                                                       | Status  | Items  | Delivered | Remaining |
| --------- | ---------------------------------------------------------- | ------- | ------ | --------- | --------- |
| PH-1      | Foundation                                                 | Planned | 5      | 0         | 5         |
| PH-2      | Multi-Agent Orchestration                                  | Planned | 6      | 0         | 6         |
| PH-3      | Knowledge Graph & Composition                              | Planned | 5      | 0         | 5         |
| PH-4      | Desktop App (Tauri)                                        | Planned | 7      | 0         | 7         |
| PH-5      | Web Dashboard + VS Code Extension                          | Planned | 4      | 0         | 4         |
| PH-6      | Reverse Engineering & Additional Flows                     | Planned | 6      | 0         | 6         |
| PH-7      | SaaS Mode + Collaboration                                  | Planned | 5      | 0         | 5         |
| PH-8      | Import/Export + Extensibility Plugins                      | Planned | 8      | 0         | 8         |
| PH-9      | Hook Infrastructure + Advanced Cost Optimization           | Planned | 3      | 0         | 3         |
| PH-10     | Memory + Advanced Agents + MCP                             | Planned | 4      | 0         | 4         |
| PH-11     | Permission Governance + Structured Output + Stress Testing | Planned | 3      | 0         | 3         |
| PH-12     | Event-Triggered Flows & Continuous Verification            | Planned | 4      | 0         | 4         |
| PH-13     | Ecosystem & Agent Marketplace                              | Planned | 4      | 0         | 4         |
| PH-14     | Intelligence Layer                                         | Planned | 4      | 0         | 4         |
| PH-15     | Autonomous Specification Maintenance                       | Planned | 4      | 0         | 4         |
| **Total** |                                                            |         | **72** | **0**     | **72**    |

### Summary Metrics

| Metric                            | Value                                                                |
| --------------------------------- | -------------------------------------------------------------------- |
| Phases                            | 15                                                                   |
| Behaviors                         | BEH-SF-001–281, BEH-SF-300–358, BEH-SF-400–463 (total across ranges) |
| Core behaviors (Phases 1–3, 5–8)  | BEH-SF-001–208 (208)                                                 |
| Desktop app behaviors (Phase 4)   | BEH-SF-273–281 (9)                                                   |
| Expansion behaviors (Phases 9–15) | BEH-SF-400–463 (64)                                                  |
| Product milestones                | 6 (PT-1 through PT-6)                                                |
| External dependencies             | 5 libraries                                                          |

### Source Documents

- [research/RES-08-model-strategy-cost-optimization.md](../research/RES-08-model-strategy-cost-optimization.md) — Phase 9 expansion
- [research/RES-09-subagent-architecture-patterns.md](../research/RES-09-subagent-architecture-patterns.md) — Phase 10 expansion
- [research/RES-04-structured-output-pipeline.md](../research/RES-04-structured-output-pipeline.md) — Phase 11 expansion
- [research/RES-10-product-vision-synthesis.md](../research/RES-10-product-vision-synthesis.md) — Phases 12–15, Product Track
- [product/competitive-analysis.md](../product/competitive-analysis.md) — Product Track GTM milestones

---

## Status Summary

| Phase     | Name                                                       | Status  | Items  | Delivered | Remaining |
| --------- | ---------------------------------------------------------- | ------- | ------ | --------- | --------- |
| PH-1      | Foundation                                                 | Planned | 5      | 0         | 5         |
| PH-2      | Multi-Agent Orchestration                                  | Planned | 6      | 0         | 6         |
| PH-3      | Knowledge Graph & Composition                              | Planned | 5      | 0         | 5         |
| PH-4      | Desktop App (Tauri)                                        | Planned | 7      | 0         | 7         |
| PH-5      | Web Dashboard + VS Code Extension                          | Planned | 4      | 0         | 4         |
| PH-6      | Reverse Engineering & Additional Flows                     | Planned | 6      | 0         | 6         |
| PH-7      | SaaS Mode + Collaboration                                  | Planned | 5      | 0         | 5         |
| PH-8      | Import/Export + Extensibility Plugins                      | Planned | 8      | 0         | 8         |
| PH-9      | Hook Infrastructure + Advanced Cost Optimization           | Planned | 3      | 0         | 3         |
| PH-10     | Memory + Advanced Agents + MCP                             | Planned | 4      | 0         | 4         |
| PH-11     | Permission Governance + Structured Output + Stress Testing | Planned | 3      | 0         | 3         |
| PH-12     | Event-Triggered Flows & Continuous Verification            | Planned | 4      | 0         | 4         |
| PH-13     | Ecosystem & Agent Marketplace                              | Planned | 4      | 0         | 4         |
| PH-14     | Intelligence Layer                                         | Planned | 4      | 0         | 4         |
| PH-15     | Autonomous Specification Maintenance                       | Planned | 4      | 0         | 4         |
| **Total** |                                                            |         | **72** | **0**     | **72**    |

### Summary Metrics

| Metric                            | Value                                                                |
| --------------------------------- | -------------------------------------------------------------------- |
| Phases                            | 15                                                                   |
| Behaviors                         | BEH-SF-001–281, BEH-SF-300–358, BEH-SF-400–463 (total across ranges) |
| Core behaviors (Phases 1–3, 5–8)  | BEH-SF-001–208 (208)                                                 |
| Desktop app behaviors (Phase 4)   | BEH-SF-273–281 (9)                                                   |
| Expansion behaviors (Phases 9–15) | BEH-SF-400–463 (64)                                                  |
| Product milestones                | 6 (PT-1 through PT-6)                                                |
| External dependencies             | 5 libraries                                                          |

### Source Documents

- [research/RES-08-model-strategy-cost-optimization.md](../research/RES-08-model-strategy-cost-optimization.md) — Phase 9 expansion
- [research/RES-09-subagent-architecture-patterns.md](../research/RES-09-subagent-architecture-patterns.md) — Phase 10 expansion
- [research/RES-04-structured-output-pipeline.md](../research/RES-04-structured-output-pipeline.md) — Phase 11 expansion
- [research/RES-10-product-vision-synthesis.md](../research/RES-10-product-vision-synthesis.md) — Phases 12–15, Product Track
- [product/competitive-analysis.md](../product/competitive-analysis.md) — Product Track GTM milestones
