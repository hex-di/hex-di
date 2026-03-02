import { describe, it, expectTypeOf } from "vitest";
import { ok, createError } from "../src/index.js";
import type {
  Result,
  TaggedError,
  TagsOf,
  HasTag,
  ErrorByTag,
  RemoveTag,
  RemoveTags,
  ExhaustiveHandlerMap,
} from "../src/index.js";

// -- Shared test error types --------------------------------------------------

type NotFoundError = Readonly<{ _tag: "NotFound"; resource: string }>;
type TimeoutError = Readonly<{ _tag: "Timeout"; ms: number }>;
type ForbiddenError = Readonly<{ _tag: "Forbidden"; reason: string }>;
type AppError = NotFoundError | TimeoutError | ForbiddenError;

// =============================================================================
// TaggedError
// =============================================================================

describe("TaggedError", () => {
  it("constructs a tagged error type with fields", () => {
    type E = TaggedError<"NotFound", { resource: string }>;
    expectTypeOf<E>().toEqualTypeOf<Readonly<{ _tag: "NotFound"; resource: string }>>();
  });

  it("constructs a tagged error type without fields", () => {
    type E = TaggedError<"Timeout">;
    expectTypeOf<E>().toEqualTypeOf<Readonly<{ _tag: "Timeout" }>>();
  });

  it("matches createError output shape", () => {
    const NotFound = createError("NotFound");
    type FromFactory = ReturnType<typeof NotFound<{ resource: string }>>;
    type FromType = TaggedError<"NotFound", { resource: string }>;
    expectTypeOf<FromFactory>().toMatchTypeOf<FromType>();
  });

  it("fields are readonly", () => {
    type E = TaggedError<"Fail", { code: number }>;
    expectTypeOf<E>().toMatchTypeOf<Readonly<{ _tag: "Fail"; code: number }>>();
  });
});

// =============================================================================
// TagsOf
// =============================================================================

describe("TagsOf", () => {
  it("extracts tags from a union", () => {
    expectTypeOf<TagsOf<AppError>>().toEqualTypeOf<"NotFound" | "Timeout" | "Forbidden">();
  });

  it("extracts tag from a single type", () => {
    expectTypeOf<TagsOf<NotFoundError>>().toEqualTypeOf<"NotFound">();
  });

  it("returns never for non-tagged types", () => {
    expectTypeOf<TagsOf<string>>().toEqualTypeOf<never>();
  });

  it("handles mixed union (tagged + non-tagged)", () => {
    type Mixed = NotFoundError | string;
    expectTypeOf<TagsOf<Mixed>>().toEqualTypeOf<"NotFound">();
  });

  it("returns never for never", () => {
    expectTypeOf<TagsOf<never>>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// HasTag
// =============================================================================

describe("HasTag", () => {
  it("returns true when tag exists", () => {
    expectTypeOf<HasTag<AppError, "NotFound">>().toEqualTypeOf<true>();
  });

  it("returns false when tag is missing", () => {
    expectTypeOf<HasTag<AppError, "Unknown">>().toEqualTypeOf<false>();
  });

  it("returns false for non-tagged types", () => {
    expectTypeOf<HasTag<string, "NotFound">>().toEqualTypeOf<false>();
  });

  it("works with single-member type", () => {
    expectTypeOf<HasTag<NotFoundError, "NotFound">>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// ErrorByTag
// =============================================================================

describe("ErrorByTag", () => {
  it("extracts the matching member", () => {
    expectTypeOf<ErrorByTag<AppError, "NotFound">>().toEqualTypeOf<NotFoundError>();
  });

  it("returns never for non-existent tag", () => {
    expectTypeOf<ErrorByTag<AppError, "Unknown">>().toEqualTypeOf<never>();
  });

  it("preserves the full type with all fields", () => {
    type E = ErrorByTag<AppError, "Timeout">;
    expectTypeOf<E>().toEqualTypeOf<TimeoutError>();
  });
});

// =============================================================================
// RemoveTag
// =============================================================================

describe("RemoveTag", () => {
  it("removes a tag from a union", () => {
    expectTypeOf<RemoveTag<AppError, "NotFound">>().toEqualTypeOf<TimeoutError | ForbiddenError>();
  });

  it("returns never when removing the only member", () => {
    expectTypeOf<RemoveTag<NotFoundError, "NotFound">>().toEqualTypeOf<never>();
  });

  it("returns unchanged union when tag does not exist", () => {
    expectTypeOf<RemoveTag<AppError, "Unknown">>().toEqualTypeOf<AppError>();
  });
});

// =============================================================================
// RemoveTags
// =============================================================================

describe("RemoveTags", () => {
  it("removes multiple tags", () => {
    expectTypeOf<RemoveTags<AppError, ["NotFound", "Timeout"]>>().toEqualTypeOf<ForbiddenError>();
  });

  it("removes all tags to produce never", () => {
    expectTypeOf<
      RemoveTags<AppError, ["NotFound", "Timeout", "Forbidden"]>
    >().toEqualTypeOf<never>();
  });

  it("empty list returns unchanged union", () => {
    expectTypeOf<RemoveTags<AppError, []>>().toEqualTypeOf<AppError>();
  });

  it("ignores non-existent tags", () => {
    expectTypeOf<RemoveTags<AppError, ["Unknown", "NotFound"]>>().toEqualTypeOf<
      TimeoutError | ForbiddenError
    >();
  });

  it("works with single-element tuple", () => {
    expectTypeOf<RemoveTags<AppError, ["Forbidden"]>>().toEqualTypeOf<
      NotFoundError | TimeoutError
    >();
  });
});

// =============================================================================
// ExhaustiveHandlerMap
// =============================================================================

describe("ExhaustiveHandlerMap", () => {
  it("requires handlers for all tags", () => {
    type Map = ExhaustiveHandlerMap<AppError, string>;
    expectTypeOf<keyof Map>().toEqualTypeOf<"NotFound" | "Timeout" | "Forbidden">();
  });

  it("works with two-member union", () => {
    type SmallError = NotFoundError | TimeoutError;
    type Map = ExhaustiveHandlerMap<SmallError, number>;
    expectTypeOf<keyof Map>().toEqualTypeOf<"NotFound" | "Timeout">();
  });

  it("works with single-member type", () => {
    type Map = ExhaustiveHandlerMap<NotFoundError, boolean>;
    expectTypeOf<keyof Map>().toEqualTypeOf<"NotFound">();
  });

  it("handler receives the correct error type", () => {
    type Map = ExhaustiveHandlerMap<AppError, string>;
    type NotFoundHandler = Map["NotFound"];
    expectTypeOf<Parameters<NotFoundHandler>[0]>().toEqualTypeOf<NotFoundError>();
  });
});

// =============================================================================
// Composition
// =============================================================================

describe("Composition", () => {
  it("TagsOf + ErrorByTag round-trip preserves type", () => {
    // For each tag in the union, ErrorByTag should produce the original member
    type Tag = TagsOf<AppError>;
    type Reconstructed = { [K in Tag]: ErrorByTag<AppError, K> }[Tag];
    expectTypeOf<Reconstructed>().toEqualTypeOf<AppError>();
  });

  it("RemoveTag is equivalent to Exclude", () => {
    type A = RemoveTag<AppError, "NotFound">;
    type B = Exclude<AppError, { _tag: "NotFound" }>;
    expectTypeOf<A>().toEqualTypeOf<B>();
  });

  it("RemoveTags is equivalent to sequential Exclude", () => {
    type A = RemoveTags<AppError, ["NotFound", "Timeout"]>;
    type B = Exclude<Exclude<AppError, { _tag: "NotFound" }>, { _tag: "Timeout" }>;
    expectTypeOf<A>().toEqualTypeOf<B>();
  });

  it("TaggedError + TagsOf extracts the tag", () => {
    type E = TaggedError<"MyError", { detail: string }>;
    expectTypeOf<TagsOf<E>>().toEqualTypeOf<"MyError">();
  });

  it("ExhaustiveHandlerMap keys equal TagsOf", () => {
    type Keys = keyof ExhaustiveHandlerMap<AppError, string>;
    type Tags = TagsOf<AppError>;
    expectTypeOf<Keys>().toEqualTypeOf<Tags>();
  });
});
