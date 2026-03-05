# ADR-CD-002: Entity DAG Mapping Strategy

## Status

Accepted

## Context

Cedar requires a typed entity DAG (directed acyclic graph) where entities have parent-child relationships. Guard's `AuthSubject` has a flat model: `id`, `roles` (string array), `permissions` (Set), and `attributes` (Record).

The adapter must decide how to map Guard's flat model to Cedar's hierarchical entity model. Two approaches were considered:

1. **Convention-based mapping** — The adapter defines a fixed mapping: `AuthSubject.roles` → parent entities of type `Role`, `AuthSubject.attributes` → entity attributes. Users configure type names but not the mapping structure.
2. **Custom mapper function** — Users provide a function `(subject: AuthSubject) => CedarEntity[]` that performs arbitrary mapping. Maximum flexibility but no default behavior.

## Decision

The adapter uses **convention-based mapping with configurable type names**. The mapping structure is fixed (roles → parent entities, attributes → entity attributes), but the Cedar type names are configurable.

```ts
const config: EntityMappingConfig = {
  principalType: "User", // AuthSubject → User::"<id>"
  roleType: "Role", // AuthSubject.roles → Role::"<name>" parents
  actionType: "Action", // cedarPolicy action → Action::"<name>"
  defaultResourceType: "Document", // resource → Document::"<id>"
  hierarchies: [
    // optional: additional parent relationships
    { entityType: "Document", parentField: "folderId", parentType: "Folder" },
  ],
};
```

The `hierarchies` configuration allows defining additional parent relationships beyond role membership, addressing cases like document-folder or team-organization hierarchies.

## Consequences

**Positive**:

- **Works out of the box** — Users configure type names and get a working Cedar entity model without writing mapping code
- **Schema-aligned** — The convention-based mapping produces entities that naturally align with Cedar schemas. The adapter validates the mapping config against the schema at creation time (INV-CD-3)
- **Composable** — The `hierarchies` array lets users extend the DAG beyond roles without replacing the entire mapping
- **Testable** — Fixed mapping structure means entity mapping is deterministic and easy to unit test

**Negative**:

- **Less flexible than custom mappers** — If a user's Cedar schema requires non-standard entity structures (e.g., merging multiple Guard attributes into a single Cedar entity, or splitting one Guard subject into multiple Cedar entities), the convention-based mapping cannot express this
- **Role-centric** — The mapping assumes Guard roles map to Cedar parent entities. If the Cedar schema uses a different hierarchy model (e.g., groups, teams, departments), users must configure `hierarchies` rules or rename their role type

**Trade-off accepted**: The convention-based approach covers the common case (Guard roles → Cedar hierarchy, attributes → entity attributes) with zero boilerplate. Users with non-standard Cedar schemas can implement the `CedarEnginePort` directly, bypassing the adapter's entity mapper entirely. A future version may add a `customMapper` escape hatch.
