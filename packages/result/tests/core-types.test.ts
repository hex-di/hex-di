import { describe, it, expect } from "vitest";
import { ok, err } from "../src/index.js";
import type { Result } from "../src/index.js";

describe("Core Types", () => {
  // DoD 1 #1
  it("Ok variant has _tag: 'Ok'", () => {
    const result = ok(42);
    expect(result._tag).toBe("Ok");
  });

  // DoD 1 #2
  it("Err variant has _tag: 'Err'", () => {
    const result = err("fail");
    expect(result._tag).toBe("Err");
  });

  // DoD 1 #3
  it("Ok variant holds the value in .value", () => {
    const result = ok(42);
    expect(result.value).toBe(42);
  });

  // DoD 1 #4
  it("Err variant holds the error in .error", () => {
    const result = err("fail");
    expect(result.error).toBe("fail");
  });

  // DoD 1 #5
  it("Ok and Err are structurally distinct (discriminated union)", () => {
    const success: Result<number, string> = ok(1);
    const failure: Result<number, string> = err("x");
    expect(success._tag).not.toBe(failure._tag);
  });

  // DoD 1 #6
  it("Result is a union of Ok and Err", () => {
    const success: Result<number, string> = ok(1);
    const failure: Result<number, string> = err("x");
    // Both should be valid Results — tags are one of the two valid discriminants
    expect(["Ok", "Err"]).toContain(success._tag);
    expect(["Ok", "Err"]).toContain(failure._tag);
  });

  // DoD 2 #1
  it("ok(42) creates Ok with value 42", () => {
    const result = ok(42);
    expect(result._tag).toBe("Ok");
    expect(result.value).toBe(42);
  });

  // DoD 2 #2
  it("err('fail') creates Err with error 'fail'", () => {
    const result = err("fail");
    expect(result._tag).toBe("Err");
    expect(result.error).toBe("fail");
  });

  // DoD 2 #3
  it("ok(42) has _tag: 'Ok'", () => {
    expect(ok(42)._tag).toBe("Ok");
  });

  // DoD 2 #4
  it("err('fail') has _tag: 'Err'", () => {
    expect(err("fail")._tag).toBe("Err");
  });
});
