import { expectTypeOf, describe, it } from "vitest";
import type { Result, ResultAsync, Option } from "@hex-di/result";
import {
  expectOk,
  expectErr,
  expectOkAsync,
  expectErrAsync,
  expectSome,
  expectNone,
} from "../src/index.js";

// =============================================================================
// BEH-T05-003: Type narrowing contracts — positive cases
// =============================================================================

describe("expectOk narrows to T", () => {
  it("returns T from Result<T, E>", () => {
    const result = {} as Result<number, string>;
    expectTypeOf(expectOk(result)).toEqualTypeOf<number>();
  });
});

describe("expectErr narrows to E", () => {
  it("returns E from Result<T, E>", () => {
    const result = {} as Result<number, string>;
    expectTypeOf(expectErr(result)).toEqualTypeOf<string>();
  });
});

describe("expectOkAsync narrows to Promise<T>", () => {
  it("returns Promise<T> from ResultAsync<T, E>", () => {
    const resultAsync = {} as ResultAsync<number, string>;
    expectTypeOf(expectOkAsync(resultAsync)).toEqualTypeOf<Promise<number>>();
  });
});

describe("expectErrAsync narrows to Promise<E>", () => {
  it("returns Promise<E> from ResultAsync<T, E>", () => {
    const resultAsync = {} as ResultAsync<number, string>;
    expectTypeOf(expectErrAsync(resultAsync)).toEqualTypeOf<Promise<string>>();
  });
});

describe("expectSome narrows to T", () => {
  it("returns T from Option<T>", () => {
    const option = {} as Option<number>;
    expectTypeOf(expectSome(option)).toEqualTypeOf<number>();
  });
});

describe("expectNone returns void", () => {
  it("returns void from Option<T>", () => {
    const option = {} as Option<number>;
    expectTypeOf(expectNone(option)).toEqualTypeOf<void>();
  });
});

// =============================================================================
// BEH-T05-003: Type narrowing contracts — negative cases
// =============================================================================

describe("assertion helpers reject non-matching types", () => {
  it("expectOk rejects non-Result", () => {
    // @ts-expect-error — number is not Result<T, E>
    expectOk(42);
  });

  it("expectErr rejects non-Result", () => {
    // @ts-expect-error — string is not Result<T, E>
    expectErr("hello");
  });

  it("expectOkAsync rejects non-ResultAsync", () => {
    // @ts-expect-error — plain Result is not ResultAsync<T, E>
    void expectOkAsync({} as Result<number, string>);
  });

  it("expectErrAsync rejects non-ResultAsync", () => {
    // @ts-expect-error — plain Result is not ResultAsync<T, E>
    void expectErrAsync({} as Result<number, string>);
  });

  it("expectSome rejects Result (not Option)", () => {
    // @ts-expect-error — Result<T, E> is not Option<T>
    expectSome({} as Result<number, string>);
  });

  it("expectNone rejects Result (not Option)", () => {
    // @ts-expect-error — Result<T, E> is not Option<T>
    expectNone({} as Result<number, string>);
  });
});
