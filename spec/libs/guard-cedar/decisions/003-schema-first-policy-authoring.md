# ADR-CD-003: Schema-First Policy Authoring

## Status

Accepted

## Context

Cedar supports two authoring workflows:

1. **Schema-first** — Define the entity type schema before writing policies. The schema constrains which entity types, actions, and attributes policies can reference. Policies are validated against the schema at load time.
2. **Schema-optional** — Write policies without a schema. The Cedar engine evaluates policies against whatever entities are provided at runtime. Missing attributes trigger skip-on-error rather than load-time errors.

The adapter must decide whether to require, recommend, or ignore schemas.

## Decision

The adapter **requires a schema** in the `CedarAdapterConfig`. Policies are validated against the schema at adapter creation time by default (`validateOnLoad: true`).

```ts
const adapter = createCedarAdapter({
  schema: cedarSchema,           // REQUIRED
  policies: cedarPolicies,
  entityMapping: { ... },
  validateOnLoad: true,          // default: validates policies against schema
})
```

Users can opt out of load-time validation by setting `validateOnLoad: false`, but the schema itself remains required. It is used for entity mapping validation (CD-SCH-030) even when policy validation is disabled.

## Consequences

**Positive**:

- **Early error detection** — Schema validation at load time catches typos in entity type names, missing attribute references, and action scope mismatches. These errors are reported at startup, not when a user hits a specific authorization path at runtime.
- **Formal verification enabled** — Cedar's formal verification tools require a schema. By mandating schemas, the adapter ensures that users' policies are always verifiable.
- **Entity mapping validation** — The adapter validates that `EntityMappingConfig` type names exist in the schema (INV-CD-3). Without a schema, this validation is impossible.
- **Better error messages** — Schema-aware validation produces specific error messages ("entity type 'Usr' not found in schema; did you mean 'User'?") rather than opaque runtime failures.

**Negative**:

- **Higher onboarding friction** — Users must write a Cedar schema before writing their first policy. For simple use cases (e.g., 3 roles and 2 resource types), the schema may feel like unnecessary boilerplate.
- **Schema maintenance burden** — As the authorization model evolves, both the schema and the policies must be updated. Schema-policy drift causes load-time validation errors that must be resolved before deployment.

**Trade-off accepted**: The upfront cost of writing a schema is repaid by early error detection, formal verification eligibility, and entity mapping safety. The schema is typically small (10-50 lines for most applications) and changes infrequently. For users who find schema authoring burdensome, the `validateOnLoad: false` escape hatch allows skipping policy validation while retaining entity mapping validation.
