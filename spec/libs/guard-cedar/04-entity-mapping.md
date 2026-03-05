# 04 — Entity Mapping

This chapter specifies how Guard's authorization model maps to Cedar's entity DAG. Cedar requires typed entities with explicit hierarchy relationships. The adapter translates Guard's `AuthSubject` and resource objects into Cedar entities.

---

## Guard Subject to Cedar Principal

REQUIREMENT (CD-ENT-001): The `mapSubjectToPrincipal` function MUST convert a Guard `AuthSubject` into a `CedarEntity` with:

- `uid.type` derived from the configured principal type (default: `"User"`)
- `uid.id` set to `AuthSubject.id`
- `attrs` populated from `AuthSubject.attributes`
- `parents` populated from `AuthSubject.roles`, each mapped to a role entity UID

```ts
function mapSubjectToPrincipal(subject: AuthSubject, config: EntityMappingConfig): CedarEntity;
```

REQUIREMENT (CD-ENT-002): Each role in `AuthSubject.roles` MUST produce a parent entity with `uid.type` set to the configured role type (default: `"Role"`) and `uid.id` set to the role name string.

```ts
// Given:
//   subject.id = "alice"
//   subject.roles = ["admin", "editor"]
//   config.principalType = "User"
//   config.roleType = "Role"
//
// Produces:
//   { uid: { type: "User", id: "alice" },
//     attrs: { ...subject.attributes },
//     parents: [
//       { type: "Role", id: "admin" },
//       { type: "Role", id: "editor" },
//     ] }
```

REQUIREMENT (CD-ENT-003): Subject attributes MUST be mapped to Cedar value types according to the following rules:

| JavaScript type                | Cedar value type   |
| ------------------------------ | ------------------ |
| `string`                       | string             |
| `number`                       | long               |
| `boolean`                      | boolean            |
| `string[]`                     | set of strings     |
| `object` (non-null, non-array) | record             |
| `null`, `undefined`            | omitted from attrs |

REQUIREMENT (CD-ENT-004): If a subject attribute value cannot be mapped to a Cedar value type, the adapter MUST omit it from the entity attributes and record a warning diagnostic. It MUST NOT throw.

---

## Guard Resource to Cedar Resource

REQUIREMENT (CD-ENT-010): The `mapResourceToEntity` function MUST convert a Guard resource record into a `CedarEntity` with:

- `uid.type` derived from the configured resource type or from a `__type` field in the resource record
- `uid.id` derived from an `id` field in the resource record
- `attrs` populated from the remaining resource record fields

```ts
function mapResourceToEntity(
  resource: Readonly<Record<string, unknown>>,
  config: EntityMappingConfig
): Result<CedarEntity, EntityMappingError>;
```

REQUIREMENT (CD-ENT-011): If the resource record does not contain an `id` field and no default resource ID is configured, the function MUST return `Err(EntityMappingError)` with tag `"missing-resource-id"`.

REQUIREMENT (CD-ENT-012): If the resource record contains a `__type` field, it MUST be used as the entity type. Otherwise, the configured `defaultResourceType` is used. If neither is available, the function MUST return `Err(EntityMappingError)` with tag `"missing-resource-type"`.

REQUIREMENT (CD-ENT-013): The `__type` and `id` fields MUST NOT appear in the entity's `attrs` record. They are consumed for UID construction.

---

## Action Mapping

REQUIREMENT (CD-ENT-020): The `mapAction` function MUST convert a Cedar action string into a `CedarEntityUid`.

```ts
function mapAction(action: string, config: EntityMappingConfig): CedarEntityUid;
```

REQUIREMENT (CD-ENT-021): If the action string contains `"::"`, it MUST be parsed as a fully-qualified Cedar entity UID (e.g., `Action::"read"` → `{ type: "Action", id: "read" }`).

REQUIREMENT (CD-ENT-022): If the action string does NOT contain `"::"`, the configured `actionType` (default: `"Action"`) MUST be prepended (e.g., `"read"` → `{ type: "Action", id: "read" }`).

---

## Entity Hierarchy

REQUIREMENT (CD-ENT-030): The `EntityMappingConfig` MUST support defining entity hierarchy relationships beyond role membership.

```ts
interface EntityMappingConfig {
  readonly principalType?: string; // default: "User"
  readonly roleType?: string; // default: "Role"
  readonly actionType?: string; // default: "Action"
  readonly defaultResourceType?: string; // no default — required if resource lacks __type
  readonly hierarchies?: ReadonlyArray<EntityHierarchyRule>;
}

interface EntityHierarchyRule {
  readonly entityType: string;
  readonly parentField: string; // field in attrs that references parent UID
  readonly parentType: string; // entity type of the parent
}
```

REQUIREMENT (CD-ENT-031): When hierarchy rules are defined, the entity mapper MUST traverse the `parentField` in the entity's attributes and add the referenced entity to the `parents` array.

REQUIREMENT (CD-ENT-032): Hierarchy traversal MUST NOT recurse deeper than the entities provided in the current evaluation context. Transitive hierarchy resolution is Cedar's responsibility via its `in` operator.

---

## Entity Slice Construction

REQUIREMENT (CD-ENT-040): The `buildEntitySlice` function MUST construct the complete set of entities needed for a Cedar authorization request: the principal entity, the resource entity, all role entities, and any entities referenced by hierarchy rules.

```ts
function buildEntitySlice(
  subject: AuthSubject,
  resource: Readonly<Record<string, unknown>> | undefined,
  config: EntityMappingConfig
): Result<ReadonlyArray<CedarEntity>, EntityMappingError>;
```

REQUIREMENT (CD-ENT-041): The entity slice MUST NOT contain duplicate entities. If the same entity UID appears multiple times (e.g., a role that is both in the subject's roles and in a hierarchy rule), the adapter MUST merge their attributes and parent sets.

REQUIREMENT (CD-ENT-042): Entity attribute merging MUST follow last-write-wins semantics. If two sources provide different values for the same attribute key, the later source in the merge order wins. The merge order is: subject-derived entities first, then resource-derived entities, then hierarchy-derived entities.
