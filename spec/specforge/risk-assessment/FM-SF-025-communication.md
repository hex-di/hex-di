---
id: FM-SF-025
kind: risk-assessment
title: Communication Failure Modes
status: active
fm_range: 025--030
invariants: [INV-SF-13, INV-SF-18, INV-SF-19]
---

# Communication Failure Modes

ACP messaging, agent sessions, and structured output failures.

| FM ID     | Failure Mode                                                            | S   | O   | D   | RPN | Risk Level   | Mitigation                                                                                                                                                                                            | Behaviors                                              |
| --------- | ----------------------------------------------------------------------- | --- | --- | --- | --- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| FM-SF-025 | Structured output schema mismatch (agent output fails validation)       | 5   | 3   | 3   | 45  | Acceptable   | SchemaValidationError recorded; agent retries; graceful degradation to text mode after N failures ([INV-SF-13](../invariants/INV-SF-13-structured-output-schema-compliance.md))                       | [BEH-SF-241](../behaviors/BEH-SF-239-agent-backend.md) |
| FM-SF-026 | Server crash (SpecForge Server OOM or unexpected termination)           | 5   | 3   | 3   | 45  | Acceptable   | Server Lifecycle Manager detects server failure within 5 seconds; automatic restart with last-known config; in-flight flow state preserved in Neo4j for recovery                                      | [BEH-SF-281](../behaviors/BEH-SF-273-desktop-app.md)   |
| FM-SF-027 | Auto-update failure (new version fails to start)                        | 5   | 3   | 3   | 45  | Acceptable   | Health check within 30 seconds of restart; automatic rollback to previous version on failure; user notified of rollback; Server Lifecycle Manager coordinates server restart                          | [BEH-SF-279](../behaviors/BEH-SF-273-desktop-app.md)   |
| FM-SF-028 | Cross-platform webview inconsistency (CSS/JS behavior varies across OS) | 3   | 5   | 5   | 75  | Conditional  | Target modern webview versions only; automated cross-platform testing in CI; platform-specific CSS workarounds where needed                                                                           | [BEH-SF-274](../behaviors/BEH-SF-273-desktop-app.md)   |
| FM-SF-029 | ACP Server startup failure (port bind, initialization)                  | 8   | 3   | 3   | 72  | Conditional  | Health check within 5 seconds; fallback to retry with backoff; queued runs replayed on recovery ([INV-SF-19](../invariants/INV-SF-19-degraded-mode.md))                                               | [BEH-SF-209](../behaviors/BEH-SF-209-acp-server.md)    |
| FM-SF-030 | ACP Run state corruption (invalid state transition)                     | 8   | 3   | 5   | 120 | Unacceptable | State machine enforces valid transitions only ([INV-SF-18](../invariants/INV-SF-18-acp-run-state-consistency.md)); invalid transitions rejected with ACPRunStateError; run state persisted atomically | [BEH-SF-212](../behaviors/BEH-SF-209-acp-server.md)    |
