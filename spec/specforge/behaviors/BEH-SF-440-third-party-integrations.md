---
id: BEH-SF-440
kind: behavior
title: Third-Party Integrations
status: active
id_range: 440--443
invariants: [INV-SF-7]
adrs: [ADR-005]
types: [ports]
ports: [IntegrationAdapterPort]
---

# 58 — Third-Party Integrations

**Feature:** [FEAT-SF-031](../features/FEAT-SF-031-third-party-integrations.md)

---

## BEH-SF-440: Adapter Registry — Discover and List Integration Adapters

> **Invariant:** [INV-SF-7](../invariants/INV-SF-7-graph-data-persistence.md) — Graph Data Persistence

The adapter registry maintains a catalog of available third-party integration adapters (Jira, Linear, Confluence, GitHub, etc.). Each adapter implements a standard contract for credential management, entity mapping, and sync operations.

### Contract

REQUIREMENT (BEH-SF-440): `IntegrationAdapterPort.listAdapters()` MUST return a list of all registered integration adapters. Each adapter entry MUST include `adapterId`, `name`, `supportedEntities` (array of entity type strings), `syncModes` (array of "import-only", "export-only", "bidirectional"), and `status` ("available", "configured", "connected", "error"). Adapters MUST be discoverable without credentials — credentials are provided during connection setup. The registry MUST be extensible: custom adapters MAY be registered via `IntegrationAdapterPort.registerAdapter(definition)`.

### Verification

- List test: register 3 adapters; call `listAdapters()`; verify all 3 are returned with correct metadata.
- Extensibility test: register a custom adapter; verify it appears in `listAdapters()`.
- No-credential discovery test: list adapters without any configured credentials; verify all are returned with status "available".

---

## BEH-SF-441: Bidirectional Sync — Full and Incremental Synchronization with Conflict Resolution

> **Invariant:** [INV-SF-7](../invariants/INV-SF-7-graph-data-persistence.md) — Graph Data Persistence

Connected integrations synchronize entities between the external system and the SpecForge knowledge graph. Initial full sync populates the graph; subsequent incremental syncs keep both sides consistent. Conflict resolution handles concurrent modifications.

### Contract

REQUIREMENT (BEH-SF-441): `IntegrationAdapterPort.fullSync(adapterId)` MUST fetch all entities from the external system and upsert them as graph nodes using the configured entity mapping (BEH-SF-443). `IntegrationAdapterPort.incrementalSync(adapterId)` MUST sync only entities modified since the last sync checkpoint. Sync direction MUST respect the configured mode: "import-only" syncs external→graph, "export-only" syncs graph→external, "bidirectional" syncs both directions. For bidirectional sync, conflicts (same entity modified in both systems since last sync) MUST be resolved using the configured strategy: "external-wins", "graph-wins", or "manual-review". The sync checkpoint MUST be updated atomically after a successful sync.

### Verification

- Full sync test: connect an adapter; trigger full sync; verify all external entities appear as graph nodes.
- Incremental sync test: modify one external entity; trigger incremental sync; verify only the modified entity is updated.
- Conflict resolution test: modify the same entity in both systems; sync with "external-wins"; verify the external version prevails.
- Direction test: configure "import-only"; modify a graph node; sync; verify the external system is not updated.

---

## BEH-SF-442: Webhook-Driven Incremental Sync — React to External Events

External systems notify SpecForge of changes via webhooks. Each incoming webhook event triggers an incremental sync for the affected entities, keeping the graph up-to-date without polling.

### Contract

REQUIREMENT (BEH-SF-442): `IntegrationAdapterPort.configureWebhook(adapterId, webhookUrl)` MUST register a webhook endpoint that the external system calls on entity changes. When a webhook event is received, the system MUST parse the event payload, identify the affected entities, and trigger an incremental sync for those entities only. Webhook events MUST be idempotent — processing the same event twice MUST NOT create duplicate nodes or corrupt state. The system MUST validate webhook signatures using the adapter's configured secret. Invalid signatures MUST be rejected with HTTP 401.

### Verification

- Webhook trigger test: configure a webhook; send a valid event; verify the affected entity is synced.
- Idempotency test: send the same webhook event twice; verify no duplicate graph nodes.
- Signature validation test: send an event with an invalid signature; verify HTTP 401 rejection.
- Selective sync test: send an event for one entity; verify only that entity is synced, not the entire dataset.

---

## BEH-SF-443: Entity Mapping — Map External Types to Graph Node Types

Entity mapping defines how external system entities (Jira issues, Linear tickets, Confluence pages) correspond to graph node types (Requirement, Feature, Document). Mappings are configurable per adapter and per entity type.

### Contract

REQUIREMENT (BEH-SF-443): `IntegrationAdapterPort.setMappings(adapterId, mappings)` MUST persist an entity mapping configuration. Each mapping entry MUST specify `externalType` (string), `graphNodeType` (string), and `fieldMappings` (array of `{ externalField, graphProperty, transform? }`). During sync, the system MUST apply field mappings to transform external entity fields into graph node properties. Unknown external types (not in the mapping) MUST be stored as `UnmappedEntity` nodes with the raw payload preserved. Mappings MUST be retrievable via `IntegrationAdapterPort.getMappings(adapterId)`.

### Verification

- Mapping application test: set a mapping from Jira Issue to Requirement; sync a Jira issue; verify a Requirement node is created with mapped fields.
- Field transform test: configure a field mapping with a transform; verify the transform is applied during sync.
- Unmapped type test: sync an entity type not in the mapping; verify it is stored as `UnmappedEntity` with raw payload.
- Round-trip test: set mappings; get mappings; verify they match.
