# Huly — Data Model

**Source:** https://github.com/hcengineering/platform/tree/main/packages/core/src, https://github.com/hcengineering/platform/tree/main/models
**Captured:** 2026-02-28

---

## Object Hierarchy

Huly's data model is built on a three-level hierarchy rooted in `Obj`:

```
Obj                          ← Base: has _class
 └── Doc                     ← Persistent: adds _id, space, modifiedOn, modifiedBy
      └── AttachedDoc        ← Nested: adds attachedTo, attachedToClass, collection
```

### `Obj`

The root of all Huly objects. Only carries the `_class` discriminant.

```typescript
interface Obj {
  _class: Ref<Class<this>>; // Self-referencing class descriptor
}
```

### `Doc`

A persistent document stored in the database. Every `Doc` belongs to a `Space`.

```typescript
interface Doc extends Obj {
  _id: Ref<this>; // Globally unique identifier (branded string)
  space: Ref<Space>; // Workspace partition (multi-tenancy)
  modifiedOn: Timestamp; // Last modification time
  modifiedBy: PersonId; // Who modified (branded string)
  createdOn?: Timestamp; // Creation time (optional)
  createdBy?: PersonId; // Who created (optional)
}
```

### `AttachedDoc`

A document that is logically nested under a parent document:

```typescript
interface AttachedDoc extends Doc {
  attachedTo: Ref<Doc>; // Parent document reference
  attachedToClass: Ref<Class<Doc>>; // Parent's class
  collection: string; // Collection name on parent
}
```

**Example:** An `Issue` (Doc) has `Comment` children (AttachedDoc) in the `comments` collection.

---

## Meta-Model: Classes and Mixins

Huly uses a **self-describing meta-model** where classes themselves are documents:

### `Class<T>`

```typescript
interface Class<T extends Obj> extends Doc {
  kind: ClassifierKind; // 'class' | 'interface' | 'mixin'
  extends?: Ref<Class<Obj>>; // Superclass reference
  domain?: Domain; // Storage domain (e.g., 'tracker', 'chunter')
  label: IntlString; // Localized display name
  icon?: Asset; // UI icon
}
```

### `Mixin<T>`

Mixins extend existing classes without modifying them — similar to TypeScript intersection types:

```typescript
// A Mixin applied to an Issue adds GitHub-specific fields
interface GithubIssue extends Issue {
  githubNumber: number;
  repository: Ref<GithubRepository>;
  url: string;
}
```

Mixins are applied at runtime by the platform. A document can have multiple mixins, each adding fields.

### ClassifierKind

| Kind        | Description                                                      |
| ----------- | ---------------------------------------------------------------- |
| `class`     | Concrete class with storage                                      |
| `interface` | Abstract interface (no storage)                                  |
| `mixin`     | Runtime-applied extension (stored inline on the target document) |

---

## Branded Types

Huly uses **branded string types** for type-safe identifiers:

```typescript
// Branded type — a string that carries compile-time type information
type Ref<T extends Doc> = string & { __ref: T };

// Domain — logical storage partition
type Domain = string & { __domain: true };

// PersonId — unique person identity across workspaces
type PersonId = string & { __personId: true };

// PersonUuid — global identity (UUID)
type PersonUuid = string & { __personUuid: true };

// AccountUuid — account identity (UUID)
type AccountUuid = string & { __accountUuid: true };

// Timestamp — milliseconds since epoch
type Timestamp = number & { __timestamp: true };
```

### Usage Patterns

```typescript
// Compile-time safety: can't assign a Ref<Issue> where Ref<Contact> is expected
function getIssue(id: Ref<Issue>): Promise<Issue> {
  /* ... */
}

// Domain literal
const DOMAIN_TRACKER: Domain = "tracker" as Domain;

// PersonId creation from social identity
function toPersonId(socialId: string): PersonId {
  /* ... */
}
```

---

## Space — Multi-Tenancy Within Workspaces

A `Space` is a top-level organizational container. Every `Doc` belongs to exactly one Space:

```typescript
interface Space extends Doc {
  name: string;
  description?: string;
  private: boolean;
  archived: boolean;
  members: PersonId[]; // Who can access
  owners: PersonId[]; // Who can manage
  type?: Ref<SpaceType>; // Optional SpaceType reference
}
```

### Space Subclasses

| Space Type   | Module    | Purpose                                 |
| ------------ | --------- | --------------------------------------- |
| `Project`    | Tracker   | Issue container with workflows, sprints |
| `Department` | HR        | Organizational unit                     |
| `Channel`    | Chunter   | Chat channel                            |
| `Teamspace`  | Documents | Document workspace                      |
| `Drive`      | Drive     | File storage root                       |

---

## Association & Relation System

Huly has a rich relationship system between documents:

### Relations (Tracker)

```typescript
interface IssueRelation {
  _id: Ref<IssueRelation>;
  issueId: Ref<Issue>; // Source issue
  relatedIssueId: Ref<Issue>; // Target issue
  type: IssueRelationType; // 'blocks' | 'isBlockedBy' | 'relatedTo' | 'duplicates' | ...
}
```

### Associations (Core)

```typescript
interface Association extends Doc {
  type: Ref<AssociationType>;
  classA: Ref<Class<Doc>>; // Source class
  classB: Ref<Class<Doc>>; // Target class
  nameA?: string; // Label from A's perspective
  nameB?: string; // Label from B's perspective
}
```

---

## Transaction Types

All mutations in Huly are expressed as transactions:

### Transaction Hierarchy

```
Tx                           ← Base transaction
 ├── TxCUD<T>               ← Create/Update/Delete wrapper
 │    ├── TxCreateDoc<T>    ← Create a new document
 │    ├── TxUpdateDoc<T>    ← Partial update (field-level)
 │    ├── TxRemoveDoc<T>    ← Delete a document
 │    └── TxMixin<T, M>     ← Apply/update a mixin
 └── TxApplyIf              ← Conditional batch (optimistic concurrency)
```

### `TxCreateDoc<T>`

```typescript
interface TxCreateDoc<T extends Doc> extends TxCUD<T> {
  objectClass: Ref<Class<T>>;
  objectSpace: Ref<Space>;
  objectId: Ref<T>;
  attributes: Data<T>; // All required fields for T
}
```

### `TxUpdateDoc<T>`

```typescript
interface TxUpdateDoc<T extends Doc> extends TxCUD<T> {
  objectClass: Ref<Class<T>>;
  objectSpace: Ref<Space>;
  objectId: Ref<T>;
  operations: DocumentUpdate<T>; // Partial update operations
}
```

### `TxApplyIf` — Optimistic Concurrency

```typescript
interface TxApplyIf extends Tx {
  // Conditions that must be true for the batch to apply
  match: DocumentQuery<Doc>[];
  notMatch: DocumentQuery<Doc>[];
  // Transactions to apply if conditions hold
  txes: TxCUD<Doc>[];
}
```

`TxApplyIf` enables atomic multi-document updates with precondition checking — similar to a compare-and-swap operation.

---

## Model Definition Pattern

Models are defined in dedicated packages under `models/`:

```typescript
// models/tracker/src/index.ts
import { Model, Prop, Index, Collection } from "@hcengineering/model";
import core from "@hcengineering/model-core";
import tracker from "./plugin";

@Model(tracker.class.Issue, core.class.Doc)
export class TIssue extends TDoc implements Issue {
  @Prop(TypeString(), tracker.string.Identifier)
  identifier!: string;

  @Prop(TypeString(), tracker.string.Title)
  @Index(IndexKind.FullText)
  title!: string;

  @Prop(TypeMarkup(), tracker.string.Description)
  description!: Markup;

  @Prop(TypeRef(tracker.class.IssueStatus), tracker.string.Status)
  status!: Ref<IssueStatus>;

  @Collection(tracker.class.Issue)
  subIssues!: number; // Count of child issues

  @Collection(chunter.class.ChatMessage)
  comments!: number; // Count of comments
}
```

Decorators (`@Model`, `@Prop`, `@Collection`, `@Index`) generate the runtime class descriptors and UI metadata.

---

## SpecForge Relevance

| Huly Concept                                   | SpecForge Parallel                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| `Obj → Doc → AttachedDoc` hierarchy            | SpecForge's layered type hierarchies with branded discriminants (`_tag`) |
| Branded types (`Ref<T>`, `Domain`, `PersonId`) | SpecForge's phantom brands (`Ref<T>`, `Tag<T>`, `PortId<T>`)             |
| `Class<T>` self-describing meta-model          | SpecForge's port metadata (`PortDescriptor`, `AdapterDescriptor`)        |
| `Space` multi-tenancy                          | SpecForge's scoped containers — each scope isolates a set of services    |
| Transaction types (`TxCUD`, `TxApplyIf`)       | SpecForge Saga's transaction model, compensation patterns                |
| Decorator-based model definitions              | SpecForge's builder-pattern definitions (`port()`, `createAdapter()`)    |
| `Mixin<T>` runtime extension                   | SpecForge's adapter composition — adapters can layer behavior onto ports |
