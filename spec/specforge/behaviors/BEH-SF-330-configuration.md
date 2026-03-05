---
id: BEH-SF-330
kind: behavior
title: Configuration Persistence & Settings
status: active
id_range: 330--331
invariants: [INV-SF-7]
adrs: [ADR-005]
types: [extensibility]
ports: [ConfigurationPort]
---

# 54 — Configuration Persistence & Settings

**Feature:** [FEAT-SF-028](../features/FEAT-SF-028-configuration.md)

---

## BEH-SF-330: Configuration Get/Set — Persist and Retrieve Settings

> **Invariant:** [INV-SF-7](../invariants/INV-SF-7-graph-data-persistence.md) — Graph Data Persistence

All configuration changes are persisted to the project's configuration store and recorded in project history. Configuration spans multiple domains: agent backend settings, webhook triggers, tool isolation rules, access matrix entries, and CLI defaults.

### Contract

REQUIREMENT (BEH-SF-330): `ConfigurationPort.get(key)` MUST return the current value for the given configuration key, or `undefined` if the key has no stored value. `ConfigurationPort.set(key, value)` MUST persist the value durably and MUST record the change in the project history log with a timestamp and the identity of the caller. Configuration keys MUST be namespaced by domain (e.g., `webhooks.triggers`, `isolation.rules`, `cli.defaults`). Setting a key to `null` MUST delete the entry. All configuration writes MUST be atomic — a failed write MUST NOT leave partial state.

### Verification

- Round-trip test: set a configuration key; get it back; verify the value matches.
- History test: set a key; verify the project history log contains an entry with the key, new value, timestamp, and caller identity.
- Delete test: set a key to `null`; verify `get` returns `undefined`.
- Atomicity test: simulate a failure mid-write; verify no partial configuration state persists.

---

## BEH-SF-331: Default Parameter Configuration — Set Flow Execution Defaults

Default parameters configure the baseline behavior for flow execution: timeouts, retry counts, model routing preferences, and other operational settings. These defaults apply when a flow invocation does not specify explicit overrides.

### Contract

REQUIREMENT (BEH-SF-331): `ConfigurationPort.set("defaults.flow.<param>", value)` MUST persist a default flow parameter. When a flow is executed without an explicit value for `<param>`, the system MUST use the stored default. Supported default parameters MUST include at minimum: `timeout` (seconds), `maxRetries` (integer), and `modelPreference` (string). If no default is configured and no explicit value is provided, the system MUST use a hardcoded fallback value. Default parameters MUST be retrievable via `ConfigurationPort.get("defaults.flow.<param>")`.

### Verification

- Default application test: set `defaults.flow.timeout` to 300; execute a flow without explicit timeout; verify 300 is used.
- Override test: set `defaults.flow.timeout` to 300; execute a flow with explicit timeout 600; verify 600 is used.
- Fallback test: ensure no default is configured; execute a flow; verify the hardcoded fallback value is used.
- List defaults test: set multiple defaults; retrieve all keys under `defaults.flow.*`; verify all are returned.
