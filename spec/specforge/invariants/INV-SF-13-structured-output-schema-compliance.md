---
id: INV-SF-13
kind: invariant
title: Structured Output Schema Compliance
status: active
enforced_by: [ClaudeCodeBackend` schema validation, --json-schema` flag]
behaviors: [BEH-SF-239, BEH-SF-241]
---

## INV-SF-13: Structured Output Schema Compliance

Agent output MUST validate against the declared JSON schema for the agent's role. Invalid output is rejected with a `SchemaValidationError` — it never reaches the graph. The schema acts as a contract between the agent and the graph sync layer.
