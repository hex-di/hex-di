// @traces BEH-R01-001 INV-R5
import { describe, it, expectTypeOf } from "vitest";
import React from "react";
import { ok, type Result } from "@hex-di/result";
import { Match } from "../../src/components/match.js";

describe("Match types (BEH-R01-001)", () => {
  it("infers T and E from result prop", () => {
    const result: Result<{ name: string }, { code: number }> = ok({
      name: "Alice",
    });

    // Just verify the callback types are correct
    const _element = (
      <Match
        result={result}
        ok={(value) => {
          expectTypeOf(value).toEqualTypeOf<{ name: string }>();
          return <span>{value.name}</span>;
        }}
        err={(error) => {
          expectTypeOf(error).toEqualTypeOf<{ code: number }>();
          return <span>{error.code}</span>;
        }}
      />
    );
  });

  it("requires both ok and err render props (INV-R5)", () => {
    const result: Result<string, number> = ok("hello");

    // @ts-expect-error missing err prop
    const _missingErr = <Match result={result} ok={(v) => <span>{v}</span>} />;

    // @ts-expect-error missing ok prop
    const _missingOk = <Match result={result} err={(e) => <span>{e}</span>} />;
  });
});
