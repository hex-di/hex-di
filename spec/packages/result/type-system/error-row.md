# Type System — Error Row Utilities

Type-level utilities for working with tagged error unions (the `E` in `Result<T, E>`). All types are pure aliases — zero runtime cost, zero JavaScript emitted.

**Source**: `packages/result/src/type-utils.ts`

## TaggedError\<Tag, Fields?\>

```ts
type TaggedError<Tag extends string, Fields extends Record<string, unknown> = never> = [
  Fields,
] extends [never]
  ? Readonly<{ _tag: Tag }>
  : Readonly<{ _tag: Tag } & Fields>;
```

Constructs a frozen tagged error type. Type-level companion to `createError()`.

**Behavior**:

- `TaggedError<"NotFound", { resource: string }>` → `Readonly<{ _tag: "NotFound"; resource: string }>`
- `TaggedError<"Timeout">` → `Readonly<{ _tag: "Timeout" }>` (no extra fields)
- Output is always `Readonly`, matching `createError()` which returns `Object.freeze()`d objects

**Relationship to `createError`**:

```ts
const NotFound = createError("NotFound");
type FromFactory = ReturnType<typeof NotFound<{ resource: string }>>;
type FromType = TaggedError<"NotFound", { resource: string }>;
// FromFactory is assignable to FromType
```

## TagsOf\<E\>

```ts
type TagsOf<E> = E extends { _tag: infer Tag extends string } ? Tag : never;
```

Extracts all `_tag` literal values from an error union as a string union.

**Behavior**:

- `TagsOf<{ _tag: "A" } | { _tag: "B" }>` → `"A" | "B"`
- `TagsOf<{ _tag: "A" }>` → `"A"` (single member)
- `TagsOf<string>` → `never` (non-tagged type)
- `TagsOf<{ _tag: "A" } | string>` → `"A"` (mixed union, non-tagged members ignored)
- `TagsOf<never>` → `never`

## HasTag\<E, Tag\>

```ts
type HasTag<E, Tag extends string> = Extract<E, { _tag: Tag }> extends never ? false : true;
```

Boolean type: does the error union `E` contain a member with the given `_tag`?

**Behavior**:

- `HasTag<AppError, "NotFound">` → `true`
- `HasTag<AppError, "Unknown">` → `false`
- `HasTag<string, "NotFound">` → `false`
- `HasTag<{ _tag: "A" }, "A">` → `true`

## ErrorByTag\<E, Tag\>

```ts
type ErrorByTag<E, Tag extends string> = Extract<E, { _tag: Tag }>;
```

Extracts the error member with a specific `_tag` from a union. Readable alias for `Extract<E, { _tag: Tag }>`.

**Behavior**:

- `ErrorByTag<AppError, "NotFound">` → `{ _tag: "NotFound"; resource: string }`
- `ErrorByTag<AppError, "Unknown">` → `never`
- Preserves all fields of the matched member

## RemoveTag\<E, Tag\>

```ts
type RemoveTag<E, Tag extends string> = Exclude<E, { _tag: Tag }>;
```

Removes the error member with a specific `_tag` from a union. Readable alias for `Exclude<E, { _tag: Tag }>`.

**Behavior**:

- `RemoveTag<AppError, "NotFound">` → `TimeoutError | ForbiddenError`
- `RemoveTag<NotFoundError, "NotFound">` → `never` (only member removed)
- `RemoveTag<AppError, "Unknown">` → `AppError` (non-existent tag, unchanged)

## RemoveTags\<E, Tags\>

```ts
type RemoveTags<E, Tags extends readonly string[]> = Tags extends readonly [
  infer Head extends string,
  ...infer Tail extends string[],
]
  ? RemoveTags<Exclude<E, { _tag: Head }>, Tail>
  : E;
```

Removes multiple tagged members from an error union at once. Recursive over a tuple of tag strings.

**Behavior**:

- `RemoveTags<AppError, ["NotFound", "Timeout"]>` → `ForbiddenError`
- `RemoveTags<AppError, ["NotFound", "Timeout", "Forbidden"]>` → `never`
- `RemoveTags<AppError, []>` → `AppError` (empty tuple, unchanged)
- `RemoveTags<AppError, ["Unknown", "NotFound"]>` → `TimeoutError | ForbiddenError` (non-existent tags ignored)

**Practical limit**: ~50 tags per tuple. Real-world error unions rarely exceed 20 members.

**Equivalence**: `RemoveTags<E, [A, B]>` ≡ `Exclude<Exclude<E, { _tag: A }>, { _tag: B }>`

## ExhaustiveHandlerMap\<E, T\>

```ts
type ExhaustiveHandlerMap<E extends { _tag: string }, T> = {
  [K in E["_tag"]]: (error: Extract<E, { _tag: K }>) => Result<T, never>;
};
```

Required handler map for every `_tag` in the error union. Each handler must return `Result<T, never>` (infallible recovery). This type is **opt-in** — `catchTags` accepts `Partial` handlers by default.

**Behavior**:

- `ExhaustiveHandlerMap<AppError, string>` requires keys `"NotFound"`, `"Timeout"`, `"Forbidden"`
- Each handler receives the correctly narrowed error type
- Missing any handler is a compile-time error when used as a type annotation

**Usage with `catchTags`**:

```ts
type E = NotFoundError | TimeoutError;
const handlers: ExhaustiveHandlerMap<E, string> = {
  NotFound: e => ok(`missing: ${e.resource}`),
  Timeout: e => ok(`timed out after ${e.ms}ms`),
};
result.catchTags(handlers); // E narrows to never
```

**Design note**: `catchTags` itself uses `Partial<...>` for its handler constraint, allowing incremental error handling. `ExhaustiveHandlerMap` is a type-annotation tool for users who want compile-time exhaustiveness verification at a specific call site.

## Composition Patterns

These types compose naturally:

| Pattern                            | Effect                                              |
| ---------------------------------- | --------------------------------------------------- |
| `TagsOf<E>` + `ErrorByTag<E, Tag>` | Round-trip: extract tags, then retrieve each member |
| `TagsOf<TaggedError<T, F>>`        | Always equals `T`                                   |
| `RemoveTag<E, Tag>`                | Equivalent to `Exclude<E, { _tag: Tag }>`           |
| `RemoveTags<E, [A, B]>`            | Equivalent to sequential `Exclude`                  |
| `keyof ExhaustiveHandlerMap<E, T>` | Equals `TagsOf<E>`                                  |

## Cross-References

- **Runtime companion**: `createError()` — [behaviors/08-error-patterns.md](../behaviors/08-error-patterns.md)
- **Effect elimination**: `catchTag`, `catchTags` — [behaviors/15-effect-error-handling.md](../behaviors/15-effect-error-handling.md)
- **General type utilities**: [type-system/utility.md](utility.md)
- **ADR**: [decisions/014-catch-tag-effect-elimination.md](../decisions/014-catch-tag-effect-elimination.md)
- **Research**: [research/RES-01-type-and-effect-systems.md](../../../research/RES-01-type-and-effect-systems.md)
