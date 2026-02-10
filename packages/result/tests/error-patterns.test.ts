import { describe, it, expect } from "vitest";
import { ok, err } from "../src/index.js";
import type { Result } from "../src/index.js";
import { createError } from "../src/errors/create-error.js";
import { assertNever } from "../src/errors/assert-never.js";

describe("Error Patterns", () => {
  // DoD 10 #1
  it("Tagged error with _tag discriminant is created correctly", () => {
    const error = { _tag: "NotFound" as const, resource: "User", id: "123" };
    expect(error._tag).toBe("NotFound");
    expect(error.resource).toBe("User");
    expect(error.id).toBe("123");
  });

  // DoD 10 #2
  it("createError('NotFound') returns factory producing { _tag: 'NotFound' }", () => {
    const NotFound = createError("NotFound");
    const error = NotFound({});
    expect(error._tag).toBe("NotFound");
  });

  // DoD 10 #3
  it("createError('NotFound') factory accepts and merges additional fields", () => {
    const NotFound = createError("NotFound");
    const error = NotFound({ resource: "User", id: "123" });
    expect(error._tag).toBe("NotFound");
    expect(error.resource).toBe("User");
    expect(error.id).toBe("123");
  });

  // --- Mutation gap: createError returns frozen object ---
  it("createError factory produces frozen (immutable) objects", () => {
    const NotFound = createError("NotFound");
    const error = NotFound({ id: "123" });
    expect(Object.isFrozen(error)).toBe(true);
  });

  // --- Mutation gap: assertNever with custom message ---
  it("assertNever throws with custom message when provided", () => {
    const badValue = "unexpected" as never;
    expect(() => assertNever(badValue, "custom message")).toThrow("custom message");
  });

  // --- Mutation gap: assertNever default message includes value ---
  it("assertNever default message includes the value", () => {
    const badValue = "oops" as never;
    expect(() => assertNever(badValue)).toThrow("Unexpected value");
  });

  // DoD 10 #4
  it("assertNever throws on non-exhaustive match", () => {
    type MyError = { _tag: "A" } | { _tag: "B" };

    function handle(e: MyError): string {
      switch (e._tag) {
        case "A":
          return "handled A";
        case "B":
          return "handled B";
        default:
          return assertNever(e);
      }
    }

    expect(handle({ _tag: "A" })).toBe("handled A");
    expect(handle({ _tag: "B" })).toBe("handled B");

    // Force a bad value past TypeScript to test runtime behavior
    const badError = { _tag: "C" } as unknown as MyError;
    expect(() => handle(badError)).toThrow();
  });

  // DoD 10 #5
  it("Switch on error._tag handles all variants exhaustively", () => {
    type AppError =
      | { _tag: "NotFound"; id: string }
      | { _tag: "Validation"; field: string }
      | { _tag: "Database"; cause: string };

    function toStatus(error: AppError): number {
      switch (error._tag) {
        case "NotFound":
          return 404;
        case "Validation":
          return 422;
        case "Database":
          return 500;
      }
    }

    expect(toStatus({ _tag: "NotFound", id: "1" })).toBe(404);
    expect(toStatus({ _tag: "Validation", field: "email" })).toBe(422);
    expect(toStatus({ _tag: "Database", cause: "timeout" })).toBe(500);
  });

  // DoD 10 #6
  it("Error with cause chain preserves inner error reference", () => {
    const inner = { _tag: "ConnectionFailed" as const, host: "db.example.com" };
    const outer = { _tag: "InfraFailure" as const, cause: inner };

    expect(outer.cause._tag).toBe("ConnectionFailed");
    expect(outer.cause.host).toBe("db.example.com");
  });

  // DoD 10 #7
  it("mapErr transforms error from infrastructure to domain type", () => {
    type InfraError = { _tag: "Timeout"; ms: number };
    type DomainError = { _tag: "ServiceUnavailable"; reason: string };

    const infraResult: Result<string, InfraError> = err({ _tag: "Timeout", ms: 5000 });
    const domainResult = infraResult.mapErr(
      (e): DomainError => ({
        _tag: "ServiceUnavailable",
        reason: `Timed out after ${e.ms}ms`,
      })
    );

    expect(domainResult._tag).toBe("Err");
    if (domainResult.isErr()) {
      expect(domainResult.error._tag).toBe("ServiceUnavailable");
      expect(domainResult.error.reason).toBe("Timed out after 5000ms");
    }
  });

  // DoD 10 #8
  it("Error types compose via andThen union accumulation", () => {
    type E1 = { _tag: "E1" };
    type E2 = { _tag: "E2" };
    type E3 = { _tag: "E3" };

    function step1(): Result<number, E1> {
      return ok(1);
    }
    function step2(n: number): Result<string, E2> {
      return ok(String(n));
    }
    function step3(_s: string): Result<boolean, E3> {
      return err({ _tag: "E3" });
    }

    const result = step1().andThen(step2).andThen(step3);

    expect(result._tag).toBe("Err");
    if (result.isErr()) {
      expect(result.error._tag).toBe("E3");
    }
  });
});
