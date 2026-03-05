---
id: FM-SF-019
kind: risk-assessment
title: Security Failure Modes
status: active
fm_range: 019--024
invariants: [INV-SF-15, INV-SF-16, INV-SF-17]
---

# Security Failure Modes

Authentication, permissions, tool isolation, and governance failures.

| FM ID     | Failure Mode                                                             | S   | O   | D   | RPN | Risk Level   | Mitigation                                                                                                                                                                                       | Behaviors                                                                                                                      |
| --------- | ------------------------------------------------------------------------ | --- | --- | --- | --- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| FM-SF-019 | Compliance gate false rejection (valid write blocked)                    | 5   | 3   | 5   | 75  | Conditional  | Manual override via `specforge approve`; false positive logged for rule refinement                                                                                                               | [BEH-SF-166](../behaviors/BEH-SF-161-hook-pipeline.md)                                                                         |
| FM-SF-020 | Budget zone transition race (rapid consumption skips zones)              | 3   | 3   | 3   | 27  | Acceptable   | Monotonic zone transitions ([INV-SF-15](../invariants/INV-SF-15-budget-zone-monotonicity.md)); atomic zone state updates                                                                         | [BEH-SF-170](../behaviors/BEH-SF-169-cost-optimization.md)                                                                     |
| FM-SF-021 | CLAUDE.md stale generation (graph changes during flow not reflected)     | 5   | 5   | 3   | 75  | Conditional  | Hook-triggered regeneration on significant graph mutations; content hash skip prevents unnecessary writes                                                                                        | [BEH-SF-177](../behaviors/BEH-SF-177-memory-generation.md)                                                                     |
| FM-SF-022 | MCP server unavailable at spawn time                                     | 5   | 5   | 3   | 75  | Conditional  | Health check excludes unhealthy servers; agent spawns without MCP; warning recorded ([INV-SF-17](../invariants/INV-SF-17-mcp-server-health-gate.md))                                             | [BEH-SF-195](../behaviors/BEH-SF-193-mcp-composition.md)                                                                       |
| FM-SF-023 | Permission escalation bypass (agent gains unauthorized access)           | 8   | 3   | 5   | 120 | Unacceptable | Explicit grant required ([INV-SF-16](../invariants/INV-SF-16-permission-escalation-requires-explicit-grant.md)); all decisions audited as graph nodes; blast radius analysis for elevated access | [BEH-SF-202](../behaviors/BEH-SF-201-permission-governance.md), [BEH-SF-208](../behaviors/BEH-SF-201-permission-governance.md) |
| FM-SF-024 | Dynamic role misconfiguration (activation predicate matches incorrectly) | 5   | 3   | 3   | 45  | Acceptable   | Predicate timeout at 5 seconds with false default; role validation against AgentPort protocol; predicate results cached per flow                                                                 | [BEH-SF-186](../behaviors/BEH-SF-185-dynamic-agents.md)                                                                        |
