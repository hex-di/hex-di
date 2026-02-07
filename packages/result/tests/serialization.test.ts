import { describe, it, expect } from "vitest";
import { ok, err } from "../src/index.js";

describe("Serialization", () => {
  // DoD 13 #1
  it("ok(42).toJSON() returns { _tag: 'Ok', value: 42 }", () => {
    expect(ok(42).toJSON()).toEqual({ _tag: "Ok", value: 42 });
  });

  // DoD 13 #2
  it("err('fail').toJSON() returns { _tag: 'Err', error: 'fail' }", () => {
    expect(err("fail").toJSON()).toEqual({ _tag: "Err", error: "fail" });
  });

  // DoD 13 #3
  it("JSON.stringify integration with Ok", () => {
    const result = ok({ name: "Alice", age: 30 });
    const json = JSON.stringify(result);
    const parsed = JSON.parse(json);
    expect(parsed._tag).toBe("Ok");
    expect(parsed.value).toEqual({ name: "Alice", age: 30 });
  });

  // DoD 13 #4
  it("JSON.stringify integration with Err", () => {
    const result = err({ _tag: "NotFound", id: "123" });
    const json = JSON.stringify(result);
    const parsed = JSON.parse(json);
    expect(parsed._tag).toBe("Err");
    expect(parsed.error).toEqual({ _tag: "NotFound", id: "123" });
  });

  // DoD 13 #5
  it("toJSON round-trip preserves Ok structure", () => {
    const original = ok([1, 2, 3]);
    const serialized = original.toJSON();
    expect(serialized._tag).toBe("Ok");
    expect(serialized.value).toEqual([1, 2, 3]);
  });

  // DoD 13 #6
  it("toJSON round-trip preserves Err structure", () => {
    const original = err({ code: 404, message: "not found" });
    const serialized = original.toJSON();
    expect(serialized._tag).toBe("Err");
    expect(serialized.error).toEqual({ code: 404, message: "not found" });
  });
});
