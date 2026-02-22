import { describe, it, expect } from "vitest";
import { ok, err, toSchema, fromJSON } from "../src/index.js";
import pkg from "../package.json";

// BEH-13-002: toSchema
describe("BEH-13-002: toSchema wraps Result-returning fn as StandardSchemaV1", () => {
  const positiveNumber = toSchema((input: unknown) => {
    if (typeof input !== "number") return err("Expected number");
    if (input <= 0) return err("Expected positive number");
    return ok(input);
  });

  it("~standard.version is 1", () => {
    expect(positiveNumber["~standard"].version).toBe(1);
  });

  it("~standard.vendor is '@hex-di/result'", () => {
    expect(positiveNumber["~standard"].vendor).toBe("@hex-di/result");
  });

  it("valid input returns { value }", () => {
    const result = positiveNumber["~standard"].validate(42);
    expect(result).toEqual({ value: 42 });
  });

  it("invalid input returns { issues }", () => {
    const result = positiveNumber["~standard"].validate(-1);
    expect(result).toEqual({
      issues: [{ message: "Expected positive number" }],
    });
  });

  it("wrong type input returns { issues }", () => {
    const result = positiveNumber["~standard"].validate("not a number");
    expect(result).toEqual({
      issues: [{ message: "Expected number" }],
    });
  });

  it("error is stringified via String()", () => {
    const schema = toSchema((input: unknown) => {
      if (input === null) return err(null);
      return ok(input);
    });
    const result = schema["~standard"].validate(null);
    expect(result).toEqual({
      issues: [{ message: "null" }],
    });
  });
});

// BEH-13-003: structuredClone compatibility — toJSON/fromJSON roundtrip
describe("BEH-13-003: structuredClone compatibility — toJSON/fromJSON pattern", () => {
  it("ok(42) survives toJSON/fromJSON roundtrip", () => {
    const original = ok(42);
    const json = original.toJSON();
    const restored = fromJSON(json);

    expect(restored.isOk()).toBe(true);
    expect(restored.isOk() && restored.value).toBe(42);
  });

  it('err("x") survives toJSON/fromJSON roundtrip', () => {
    const original = err("x");
    const json = original.toJSON();
    const restored = fromJSON(json);

    expect(restored.isErr()).toBe(true);
    expect(restored.isErr() && restored.error).toBe("x");
  });

  it("toJSON output is JSON-serializable (structuredClone alternative)", () => {
    const okJson = JSON.stringify(ok(42).toJSON());
    const errJson = JSON.stringify(err("x").toJSON());

    const okRestored = fromJSON(JSON.parse(okJson));
    const errRestored = fromJSON(JSON.parse(errJson));

    expect(okRestored.isOk() && okRestored.value).toBe(42);
    expect(errRestored.isErr() && errRestored.error).toBe("x");
  });
});

// BEH-13-004: Data retention — toJSON produces schema-versioned output for long-term storage
describe("BEH-13-004: data retention — schema-versioned output for regulatory record-keeping", () => {
  it("ok toJSON includes _schemaVersion for long-term storage", () => {
    const json = ok("audit-data").toJSON();

    expect(json).toHaveProperty("_tag", "Ok");
    expect(json).toHaveProperty("_schemaVersion", 1);
    expect(json).toHaveProperty("value", "audit-data");
  });

  it("err toJSON includes _schemaVersion for long-term storage", () => {
    const json = err("validation-failure").toJSON();

    expect(json).toHaveProperty("_tag", "Err");
    expect(json).toHaveProperty("_schemaVersion", 1);
    expect(json).toHaveProperty("error", "validation-failure");
  });

  it("fromJSON restores schema-versioned payloads", () => {
    const stored = { _tag: "Ok" as const, _schemaVersion: 1, value: "archived" };
    const restored = fromJSON(stored);

    expect(restored.isOk() && restored.value).toBe("archived");
  });
});

// BEH-13-005: RxJS companion package (future scope, planned)
describe.todo("BEH-13-005: RxJS companion package (future scope)");

// INV-13: Subpath blocking via package.json exports prevents internal imports
describe("INV-13: subpath blocking via package.json exports prevents internal imports", () => {
  it('package.json exports "./internal/*" is null', () => {
    expect(pkg.exports).toHaveProperty("./internal/*", null);
  });
});
