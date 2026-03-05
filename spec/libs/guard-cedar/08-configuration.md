# 08 — Configuration

This chapter specifies the adapter factory, its configuration options, and how it integrates with the HexDI Guard system.

---

## Adapter Factory

REQUIREMENT (CD-CFG-001): The `createCedarAdapter` function MUST be the primary entry point for creating a Guard-compatible Cedar adapter. It returns `Result<CedarAdapter, CedarAdapterCreationError>`.

```ts
function createCedarAdapter(
  config: CedarAdapterConfig
): Result<CedarAdapter, CedarAdapterCreationError>;

interface CedarAdapter {
  readonly engine: CedarEnginePort;
  readonly policyStore: CedarPolicyStore;
  readonly entityMapper: EntityMapper;
  readonly evaluate: (
    context: EvaluationContext,
    action: string,
    options?: CedarEvaluateOptions
  ) => Result<Decision, CedarAdapterError>;
}
```

REQUIREMENT (CD-CFG-002): The `CedarAdapterConfig` MUST accept schema, policies, entity mapping configuration, and optional evaluation defaults.

```ts
interface CedarAdapterConfig {
  readonly schema: CedarSchema | string;
  readonly policies: string;
  readonly entityMapping: EntityMappingConfig;
  readonly validateOnLoad?: boolean; // default: true
  readonly defaultContext?: Readonly<Record<string, unknown>>;
}
```

REQUIREMENT (CD-CFG-003): The factory MUST perform the following steps in order:

1. Load and validate the schema
2. Initialize the Cedar WASM engine
3. Load and parse Cedar policies
4. Validate policies against the schema (if `validateOnLoad` is true)
5. Validate the entity mapping config against the schema
6. Return the assembled `CedarAdapter`

If any step fails, the factory MUST return `Err` with the specific error from that step.

---

## Policy Loading Options

REQUIREMENT (CD-CFG-010): Policies MUST be provided as a single Cedar policy text string. The string MAY contain multiple `permit` and `forbid` statements.

```cedar
// Example: Multiple policies in a single string
@id("viewer-can-read")
permit(
  principal in Role::"viewer",
  action == Action::"read",
  resource
);

@id("admin-full-access")
permit(
  principal in Role::"admin",
  action,
  resource
);

@id("deny-classified-to-non-cleared")
forbid(
  principal,
  action,
  resource
)
when {
  resource.classification == "secret"
}
unless {
  principal.clearanceLevel >= 3
};
```

REQUIREMENT (CD-CFG-011): Each policy SHOULD have an `@id("...")` annotation for traceability. Policies without IDs will be assigned auto-generated IDs by the Cedar engine.

---

## Entity Provider Options

REQUIREMENT (CD-CFG-020): The `EntityMappingConfig` is specified in [04-entity-mapping.md](./04-entity-mapping.md). The configuration supports:

- Custom principal/role/action/resource type names
- Entity hierarchy rules for parent-child relationships
- Default resource type for resources without `__type`

REQUIREMENT (CD-CFG-021): The entity mapping configuration MUST be validated against the Cedar schema at adapter creation time. See CD-SCH-030 and CD-SCH-031.

---

## Guard Integration

REQUIREMENT (CD-CFG-030): The `cedarPolicy` factory function MUST accept a reference to a `CedarAdapter` instance (or a port that resolves to one) and produce a Guard `PolicyConstraint`.

```ts
function cedarPolicy(
  adapter: CedarAdapter,
  action: string,
  options?: CedarPolicyOptions
): PolicyConstraint;
```

REQUIREMENT (CD-CFG-031): The produced `PolicyConstraint` MUST be usable with Guard's `evaluate()` function. When Guard encounters a `cedarPolicy` kind during evaluation, it MUST delegate to the Cedar adapter's `evaluate` method.

REQUIREMENT (CD-CFG-032): The Cedar adapter MUST be injectable via HexDI's dependency graph. The adapter is created as a singleton port and resolved at container build time.

```ts
// Example DI registration:
const cedarPort = createPort<CedarAdapter>("cedar-engine");

const cedarAdapter = createAdapter({
  port: cedarPort,
  factory: () =>
    createCedarAdapter({
      schema: cedarSchemaJson,
      policies: cedarPoliciesText,
      entityMapping: {
        principalType: "User",
        roleType: "Role",
        defaultResourceType: "Document",
      },
    }),
});
```

REQUIREMENT (CD-CFG-033): The Cedar adapter MUST support being wrapped with Guard's `guard()` function for policy enforcement at port resolution time.

```ts
// Example: Cedar-backed authorization on a document service
const documentService = guard({
  adapter: documentServiceAdapter,
  policy: allOf([
    hasRole("viewer"), // native Guard check
    cedarPolicy(cedarAdapter, "Document::read"), // Cedar check
  ]),
  subject: subjectProvider,
});
```

---

## Evaluation Options

REQUIREMENT (CD-CFG-040): The `CedarEvaluateOptions` MUST support per-evaluation overrides for context and additional entities.

```ts
interface CedarEvaluateOptions {
  readonly additionalContext?: Readonly<Record<string, unknown>>;
  readonly additionalEntities?: ReadonlyArray<CedarEntity>;
}
```

REQUIREMENT (CD-CFG-041): Per-evaluation context MUST be merged with the default context from `CedarAdapterConfig.defaultContext`. Per-evaluation values override defaults (shallow merge).

REQUIREMENT (CD-CFG-042): Additional entities MUST be appended to the entity slice built from the evaluation context. They participate in Cedar's entity hierarchy resolution.
