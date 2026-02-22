import { describe, it, expect } from "vitest";
import { ok, err, fromJSON, isResult, some, none, fromOptionJSON, isOption } from "../src/index.js";

describe("BEH-04-010: Serialization", () => {
  it("ok(42).toJSON() returns { _tag: 'Ok', _schemaVersion: 1, value: 42 }", () => {
    expect(ok(42).toJSON()).toEqual({ _tag: "Ok", _schemaVersion: 1, value: 42 });
  });

  it("err('fail').toJSON() returns { _tag: 'Err', _schemaVersion: 1, error: 'fail' }", () => {
    expect(err("fail").toJSON()).toEqual({ _tag: "Err", _schemaVersion: 1, error: "fail" });
  });

  it("toJSON _schemaVersion is exactly 1", () => {
    expect(ok(42).toJSON()._schemaVersion).toBe(1);
    expect(err("x").toJSON()._schemaVersion).toBe(1);
  });

  it("JSON.stringify integration with Ok", () => {
    const result = ok({ name: "Alice", age: 30 });
    const json = JSON.stringify(result);
    const parsed = JSON.parse(json);
    expect(parsed._tag).toBe("Ok");
    expect(parsed._schemaVersion).toBe(1);
    expect(parsed.value).toEqual({ name: "Alice", age: 30 });
  });

  it("JSON.stringify integration with Err", () => {
    const result = err({ _tag: "NotFound", id: "123" });
    const json = JSON.stringify(result);
    const parsed = JSON.parse(json);
    expect(parsed._tag).toBe("Err");
    expect(parsed._schemaVersion).toBe(1);
    expect(parsed.error).toEqual({ _tag: "NotFound", id: "123" });
  });

  it("toJSON round-trip preserves Ok structure", () => {
    const original = ok([1, 2, 3]);
    const serialized = original.toJSON();
    expect(serialized._tag).toBe("Ok");
    expect(serialized._schemaVersion).toBe(1);
    expect(serialized.value).toEqual([1, 2, 3]);
  });

  it("toJSON round-trip preserves Err structure", () => {
    const original = err({ code: 404, message: "not found" });
    const serialized = original.toJSON();
    expect(serialized._tag).toBe("Err");
    expect(serialized._schemaVersion).toBe(1);
    expect(serialized.error).toEqual({ code: 404, message: "not found" });
  });
});

describe("BEH-04-011 BEH-13-001: fromJSON", () => {
  it("fromJSON with Ok tag returns branded Result", () => {
    const restored = fromJSON({ _tag: "Ok", _schemaVersion: 1, value: 42 });
    expect(isResult(restored)).toBe(true);
    expect(restored.isOk()).toBe(true);
    if (restored.isOk()) expect(restored.value).toBe(42);
  });

  it("fromJSON with Err tag returns branded Result", () => {
    const restored = fromJSON({ _tag: "Err", _schemaVersion: 1, error: "fail" });
    expect(isResult(restored)).toBe(true);
    expect(restored.isErr()).toBe(true);
    if (restored.isErr()) expect(restored.error).toBe("fail");
  });

  it("fromJSON with invalid _tag throws TypeError", () => {
    expect(() =>
      fromJSON({ _tag: "Invalid" } as never)
    ).toThrow(TypeError);
    expect(() =>
      fromJSON({ _tag: "Invalid" } as never)
    ).toThrow("Invalid Result JSON: expected _tag to be 'Ok' or 'Err'");
  });

  it("fromJSON accepts legacy format (no _schemaVersion)", () => {
    const restored = fromJSON({ _tag: "Ok", value: 42 });
    expect(isResult(restored)).toBe(true);
    expect(restored.isOk()).toBe(true);
    if (restored.isOk()) expect(restored.value).toBe(42);
  });

  it("fromJSON returns frozen Result", () => {
    const restored = fromJSON({ _tag: "Ok", value: 42 });
    expect(Object.isFrozen(restored)).toBe(true);
  });

  it("round-trip: fromJSON(ok(v).toJSON()) produces branded Result", () => {
    const original = ok(42);
    const restored = fromJSON(original.toJSON());
    expect(isResult(restored)).toBe(true);
    expect(restored.isOk()).toBe(true);
    if (restored.isOk()) expect(restored.value).toBe(42);
  });

  it("round-trip: fromJSON(err(e).toJSON()) produces branded Result", () => {
    const original = err("fail");
    const restored = fromJSON(original.toJSON());
    expect(isResult(restored)).toBe(true);
    expect(restored.isErr()).toBe(true);
    if (restored.isErr()) expect(restored.error).toBe("fail");
  });
});

describe("BEH-13-006: Option serialization interop", () => {
  it("toJSON/fromOptionJSON round-trip preserves Some", () => {
    const original = some(42);
    const json = original.toJSON();
    const restored = fromOptionJSON(json);
    expect(isOption(restored)).toBe(true);
    expect(restored.isSome()).toBe(true);
    if (restored.isSome()) expect(restored.value).toBe(42);
  });

  it("toJSON/fromOptionJSON round-trip preserves None", () => {
    const original = none();
    const json = original.toJSON();
    const restored = fromOptionJSON(json);
    expect(isOption(restored)).toBe(true);
    expect(restored.isNone()).toBe(true);
  });
});
