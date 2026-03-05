---
id: FM-SF-013
kind: risk-assessment
title: Data Integrity Failure Modes
status: active
fm_range: 013--018
invariants: []
---

# Data Integrity Failure Modes

Graph data, rendering, session, and blackboard integrity failures.

| FM ID     | Failure Mode                                                | S   | O   | D   | RPN | Risk Level   | Mitigation                                                                                                                          | Behaviors                                                                                                      |
| --------- | ----------------------------------------------------------- | --- | --- | --- | --- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| FM-SF-013 | Graph storage limit exceeded (SaaS)                         | 5   | 3   | 3   | 45  | Acceptable   | Usage monitoring, tier upgrade prompt                                                                                               | [BEH-SF-108](../behaviors/BEH-SF-107-cloud-services.md)                                                        |
| FM-SF-014 | Orphan node accumulation                                    | 3   | 7   | 5   | 105 | Unacceptable | Periodic cleanup command, orphan detection query                                                                                    | [BEH-SF-007](../behaviors/BEH-SF-001-graph-operations.md)                                                      |
| FM-SF-015 | GxP hash chain tamper detection false positive              | 8   | 3   | 8   | 192 | Unacceptable | Hash chain verification with rollback capability                                                                                    | [plugins/PLG-gxp.md](../plugins/PLG-gxp.md)                                                                    |
| FM-SF-016 | Human feedback injection during wrong phase                 | 3   | 5   | 3   | 45  | Acceptable   | Feedback queued as ACP message regardless of phase; synthesizer processes it on next applicable iteration                           | [BEH-SF-121](../behaviors/BEH-SF-121-human-in-the-loop.md)                                                     |
| FM-SF-017 | Import data corruption (malformed markdown/OpenAPI parsing) | 5   | 5   | 3   | 75  | Conditional  | `--dry-run` preview before commit; incremental import with content hash validation; parser error reporting with line/column context | [BEH-SF-127](../behaviors/BEH-SF-127-import-export.md), [BEH-SF-128](../behaviors/BEH-SF-127-import-export.md) |
| FM-SF-018 | Hook pipeline timeout (handler exceeds timeout)             | 5   | 5   | 3   | 75  | Conditional  | Handler terminated after timeout; next handler proceeds; timeout logged as finding                                                  | [BEH-SF-164](../behaviors/BEH-SF-161-hook-pipeline.md)                                                         |
