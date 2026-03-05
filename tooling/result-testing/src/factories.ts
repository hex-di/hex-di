/**
 * Test data builders for creating Result and Option fixtures.
 *
 * @see {@link https://github.com/hex-di/hex-di | @hex-di/result}
 * @since 0.2.0
 * @packageDocumentation
 */

import type { Ok, Err, Result, ResultAsync as ResultAsyncType, Some, None } from "@hex-di/result";
import { ok, err, ResultAsync, some, none, createError, createErrorGroup } from "@hex-di/result";

/**
 * Creates a fixture factory for Result and ResultAsync values with a default Ok value.
 *
 * @example
 * ```ts
 * const fixture = createResultFixture({ id: 1, name: "Alice" });
 * fixture.ok();           // Ok({ id: 1, name: "Alice" })
 * fixture.ok({ id: 2 });  // Ok({ id: 2 })
 * fixture.err("fail");    // Err("fail")
 * ```
 *
 * @param defaults - The default Ok value used when no override is provided
 * @returns Factory object with ok, err, okAsync, errAsync methods
 * @see BEH-T03-001
 * @since 0.2.0
 */
export function createResultFixture<T>(defaults: T): {
  ok: (value?: T) => Ok<T, never>;
  err: <E>(error: E) => Err<never, E>;
  okAsync: (value?: T) => ResultAsyncType<T, never>;
  errAsync: <E>(error: E) => ResultAsyncType<T, E>;
} {
  return {
    ok: (value?: T) => ok(value !== undefined ? value : defaults),
    err: <E>(error: E) => err(error),
    okAsync: (value?: T) =>
      ResultAsync.fromSafePromise(Promise.resolve(value !== undefined ? value : defaults)),
    errAsync: <E>(error: E) => ResultAsync.fromPromise(Promise.reject(error), () => error),
  };
}

/**
 * Creates a fixture factory for Option values with a default Some value.
 *
 * @example
 * ```ts
 * const fixture = createOptionFixture({ timeout: 3000 });
 * fixture.some();              // Some({ timeout: 3000 })
 * fixture.some({ timeout: 0 }); // Some({ timeout: 0 })
 * fixture.none();              // None
 * ```
 *
 * @param defaults - The default Some value used when no override is provided
 * @returns Factory object with some and none methods
 * @see BEH-T03-002
 * @since 0.2.0
 */
export function createOptionFixture<T>(defaults: T): {
  some: (value?: T) => Some<T>;
  none: () => None;
} {
  return {
    some: (value?: T) => some(value !== undefined ? value : defaults),
    none: () => none(),
  };
}

/**
 * Creates a deferred ResultAsync whose resolution is controlled by the caller.
 *
 * @example
 * ```ts
 * const { resultAsync, resolve, reject } = mockResultAsync<string, Error>();
 * // resultAsync is pending...
 * resolve("hello"); // resolves to Ok("hello")
 * ```
 *
 * @returns Object with resultAsync, resolve, and reject
 * @see BEH-T03-003
 * @since 0.2.0
 */
export function mockResultAsync<T, E>(): {
  resultAsync: ResultAsyncType<T, E>;
  resolve: (value: T) => void;
  reject: (error: E) => void;
} {
  let resolvePromise!: (result: Result<T, E>) => void;
  const promise = new Promise<Result<T, E>>(res => {
    resolvePromise = res;
  });

  return {
    resultAsync: ResultAsync.fromResult(promise),
    resolve: (value: T) => resolvePromise(ok(value)),
    reject: (error: E) => resolvePromise(err(error)),
  };
}

/**
 * Creates a test fixture factory for tagged errors.
 *
 * @example
 * ```ts
 * const fixture = createErrorFixture("NotFound");
 * const error = fixture.create({ resource: "User", id: "1" });
 * // { _tag: "NotFound", resource: "User", id: "1" }
 * fixture.tag; // "NotFound"
 * ```
 *
 * @param tag - The error tag
 * @returns Factory object with create method and tag property
 * @since 0.3.0
 */
export function createErrorFixture<Tag extends string>(
  tag: Tag
): {
  create: <Fields extends Record<string, unknown>>(
    fields: Fields
  ) => Readonly<{ _tag: Tag } & Fields>;
  tag: Tag;
} {
  const factory = createError(tag);
  return {
    create: factory,
    tag,
  };
}

/**
 * Creates a test fixture factory for error groups with multiple tags.
 *
 * @example
 * ```ts
 * const fixture = createErrorGroupFixture("HttpError", "NotFound", "Timeout");
 * const error = fixture.create.NotFound({ url: "/" });
 * // { _namespace: "HttpError", _tag: "NotFound", url: "/" }
 * fixture.group.is(error); // true
 * ```
 *
 * @param namespace - The error group namespace
 * @param tags - The tags within the group
 * @returns Factory with create map and group reference
 * @since 0.3.0
 */
export function createErrorGroupFixture<NS extends string, Tags extends readonly string[]>(
  namespace: NS,
  ...tags: Tags
): {
  create: {
    [K in Tags[number]]: <Fields extends Record<string, unknown>>(
      fields: Fields
    ) => Readonly<{ _namespace: NS; _tag: K } & Fields>;
  };
  group: ReturnType<typeof createErrorGroup<NS>>;
} {
  const group = createErrorGroup<NS>(namespace);
  const create = {} as Record<
    string,
    <Fields extends Record<string, unknown>>(
      fields: Fields
    ) => Readonly<{ _namespace: NS; _tag: string } & Fields>
  >;
  for (const tag of tags) {
    create[tag] = group.create(tag);
  }
  return {
    create: create as {
      [K in Tags[number]]: <Fields extends Record<string, unknown>>(
        fields: Fields
      ) => Readonly<{ _namespace: NS; _tag: K } & Fields>;
    },
    group,
  };
}
