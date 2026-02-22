import { describe, it, expect } from "vitest";
import { ok, err, bind, let_, safeTry } from "../src/index.js";
import { pipe } from "../src/fn/pipe.js";
import { andThen } from "../src/fn/and-then.js";
import { map } from "../src/fn/map.js";
import type { Result } from "../src/index.js";

// BEH-12-001
describe("Do Notation", () => {
  describe("Result.Do (BEH-12-001)", () => {
    it("[BEH-12-001] Do is ok({})", () => {
      const Do = ok({});
      expect(Do._tag).toBe("Ok");
      if (Do.isOk()) {
        expect(Do.value).toEqual({});
      }
    });
  });

  // BEH-12-002
  describe("bind (BEH-12-002)", () => {
    it("[BEH-12-002] adds a named Ok value to the context", () => {
      const result = ok({})
        .andThen(bind("a", () => ok(42)));
      expect(result._tag).toBe("Ok");
      if (result.isOk()) {
        expect(result.value).toEqual({ a: 42 });
      }
    });

    it("[BEH-12-002] short-circuits on Err", () => {
      const result = ok({})
        .andThen(bind("a", () => err("fail") as Result<number, string>));
      expect(result._tag).toBe("Err");
      if (result.isErr()) {
        expect(result.error).toBe("fail");
      }
    });

    it("[BEH-12-002] chains multiple binds accumulating context", () => {
      const result = ok({})
        .andThen(bind("x", () => ok(1)))
        .andThen(bind("y", (ctx) => ok(ctx.x + 10)));
      expect(result._tag).toBe("Ok");
      if (result.isOk()) {
        expect(result.value).toEqual({ x: 1, y: 11 });
      }
    });

    it("[BEH-12-002] second bind short-circuits preserving first Err", () => {
      const result = ok({})
        .andThen(bind("x", () => ok(1)))
        .andThen(bind("y", () => err("boom") as Result<number, string>));
      expect(result._tag).toBe("Err");
      if (result.isErr()) {
        expect(result.error).toBe("boom");
      }
    });
  });

  // BEH-12-003
  describe("let_ (BEH-12-003)", () => {
    it("[BEH-12-003] adds a non-Result computed value to the context", () => {
      const result = ok({})
        .andThen(let_("greeting", () => "hello"));
      expect(result._tag).toBe("Ok");
      if (result.isOk()) {
        expect(result.value).toEqual({ greeting: "hello" });
      }
    });

    it("[BEH-12-003] never short-circuits (always succeeds)", () => {
      const result = ok({})
        .andThen(let_("val", () => 42));
      expect(result._tag).toBe("Ok");
    });

    it("[BEH-12-003] receives context from previous binds", () => {
      const result = ok({})
        .andThen(bind("x", () => ok(10)))
        .andThen(let_("doubled", (ctx) => ctx.x * 2));
      expect(result._tag).toBe("Ok");
      if (result.isOk()) {
        expect(result.value).toEqual({ x: 10, doubled: 20 });
      }
    });
  });

  // BEH-12-004
  describe("Type Accumulation (BEH-12-004)", () => {
    it("[BEH-12-004] context grows with each bind/let_ call", () => {
      const result = ok({})
        .andThen(bind("name", () => ok("Alice")))
        .andThen(bind("age", () => ok(30)))
        .andThen(let_("greeting", (ctx) => `Hi ${ctx.name}, you are ${ctx.age}`));
      expect(result._tag).toBe("Ok");
      if (result.isOk()) {
        expect(result.value.name).toBe("Alice");
        expect(result.value.age).toBe(30);
        expect(result.value.greeting).toBe("Hi Alice, you are 30");
      }
    });
  });

  // BEH-12-006
  describe("Usage with method chaining (BEH-12-006)", () => {
    it("[BEH-12-006] works with .map() at the end", () => {
      const result = ok({})
        .andThen(bind("x", () => ok(5)))
        .andThen(bind("y", () => ok(3)))
        .map(({ x, y }) => x + y);
      expect(result._tag).toBe("Ok");
      if (result.isOk()) {
        expect(result.value).toBe(8);
      }
    });
  });

  // BEH-12-005
  describe("Usage with pipe() (BEH-12-005)", () => {
    it("[BEH-12-005] Do notation works with pipe and andThen", () => {
      const result = pipe(
        ok({}),
        andThen(bind("x", () => ok(10))),
        andThen(bind("y", (ctx: { x: number }) => ok(ctx.x + 5))),
        map(({ x, y }: { x: number; y: number }) => x + y),
      );
      expect(result._tag).toBe("Ok");
      if (result.isOk()) {
        expect(result.value).toBe(25);
      }
    });
  });

  // BEH-12-007
  describe("ResultAsync.Do (BEH-12-007)", () => {
    it("[BEH-12-007] works with ResultAsync.andThen and bind", async () => {
      const { ResultAsync } = await import("../src/index.js");
      const result = await ResultAsync.ok({})
        .andThen(bind("a", () => ok(1)))
        .andThen(bind("b", (ctx: { a: number }) => ok(ctx.a + 1)));
      expect(result._tag).toBe("Ok");
      if (result.isOk()) {
        expect(result.value).toEqual({ a: 1, b: 2 });
      }
    });
  });

  // BEH-12-008
  describe("Relationship between Do notation and safeTry (BEH-12-008)", () => {
    it("[BEH-12-008] Do and safeTry achieve the same result for equivalent logic", () => {
      // Do notation approach
      const doResult = ok({})
        .andThen(bind("x", () => ok(10)))
        .andThen(bind("y", (ctx) => ok(ctx.x * 2)))
        .map(({ x, y }) => x + y);

      // safeTry generator approach
      const safeTryResult = safeTry(function* () {
        const x = yield* ok(10);
        const y = yield* ok(x * 2);
        return ok(x + y);
      });

      expect(doResult._tag).toBe("Ok");
      expect(safeTryResult._tag).toBe("Ok");
      if (doResult.isOk() && safeTryResult.isOk()) {
        expect(doResult.value).toBe(safeTryResult.value);
        expect(doResult.value).toBe(30);
      }
    });
  });
});
