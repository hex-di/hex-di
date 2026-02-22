import { describe, it, expect } from "vitest";
import { ok, err } from "../src/index.js";
import type { Result } from "../src/index.js";
import { UnwrapError, unwrap, unwrapErr } from "../src/unsafe/index.js";

describe("[BEH-11-001] UnwrapError", () => {
  it("[INV-12] has .context with _tag and value", () => {
    const e = new UnwrapError("msg", { _tag: "Err", value: "x" });
    expect(e.context._tag).toBe("Err");
    expect(e.context.value).toBe("x");
  });

  it("extends Error", () => {
    const e = new UnwrapError("msg", { _tag: "Ok", value: 42 });
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe("msg");
    expect(e.name).toBe("UnwrapError");
  });
});

describe("[BEH-11-002] unwrap", () => {
  it("unwrap(ok(42)) returns 42", () => {
    expect(unwrap(ok(42))).toBe(42);
  });

  it("unwrap(err('x')) throws UnwrapError", () => {
    expect(() => unwrap(err("x"))).toThrow(UnwrapError);
  });

  it("unwrap(err('x')) throws with context._tag === 'Err'", () => {
    try {
      unwrap(err("x"));
    } catch (e) {
      expect(e).toBeInstanceOf(UnwrapError);
      expect((e as UnwrapError).context._tag).toBe("Err");
      expect((e as UnwrapError).context.value).toBe("x");
    }
  });

  it("unwrap(err('x')) throws with message 'Called unwrap on Err'", () => {
    expect(() => unwrap(err("x"))).toThrow("Called unwrap on Err");
  });
});

describe("[BEH-11-003] unwrapErr", () => {
  it("unwrapErr(err('x')) returns 'x'", () => {
    expect(unwrapErr(err("x"))).toBe("x");
  });

  it("unwrapErr(ok(42)) throws UnwrapError", () => {
    expect(() => unwrapErr(ok(42))).toThrow(UnwrapError);
  });

  it("unwrapErr(ok(42)) throws with context._tag === 'Ok'", () => {
    try {
      unwrapErr(ok(42));
    } catch (e) {
      expect(e).toBeInstanceOf(UnwrapError);
      expect((e as UnwrapError).context._tag).toBe("Ok");
      expect((e as UnwrapError).context.value).toBe(42);
    }
  });
});

describe("[BEH-11-004] expect/expectErr throw UnwrapError", () => {
  it("err('x').expect('msg') throws UnwrapError", () => {
    const result: Result<number, string> = err("x");
    expect(() => result.expect("msg")).toThrow(UnwrapError);
  });

  it("err('x').expect('msg') includes error in context", () => {
    const result: Result<number, string> = err("x");
    try {
      result.expect("msg");
    } catch (e) {
      expect(e).toBeInstanceOf(UnwrapError);
      expect((e as UnwrapError).context._tag).toBe("Err");
      expect((e as UnwrapError).context.value).toBe("x");
      expect((e as UnwrapError).message).toBe("msg");
    }
  });

  it("ok(42).expectErr('msg') throws UnwrapError", () => {
    expect(() => ok(42).expectErr("msg")).toThrow(UnwrapError);
  });

  it("ok(42).expectErr('msg') includes value in context", () => {
    try {
      ok(42).expectErr("msg");
    } catch (e) {
      expect(e).toBeInstanceOf(UnwrapError);
      expect((e as UnwrapError).context._tag).toBe("Ok");
      expect((e as UnwrapError).context.value).toBe(42);
    }
  });

  it("expect/expectErr still extend Error", () => {
    const result: Result<number, string> = err("x");
    expect(() => result.expect("msg")).toThrow(Error);
    expect(() => ok(42).expectErr("msg")).toThrow(Error);
  });
});

describe("[BEH-11-005] unsafe subpath exports", () => {
  it("exports UnwrapError, unwrap, and unwrapErr from unsafe/index", () => {
    expect(UnwrapError).toBeDefined();
    expect(typeof UnwrapError).toBe("function");
    expect(unwrap).toBeDefined();
    expect(typeof unwrap).toBe("function");
    expect(unwrapErr).toBeDefined();
    expect(typeof unwrapErr).toBe("function");
  });
});
