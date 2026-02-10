import { describe, it, expectTypeOf } from "vitest";
import { LogLevelValue } from "../src/index.js";
import type { LogLevel, LogEntry, LogContext } from "../src/index.js";

describe("LogLevel type", () => {
  it('accepts "trace", "debug", "info", "warn", "error", "fatal"', () => {
    expectTypeOf<"trace">().toMatchTypeOf<LogLevel>();
    expectTypeOf<"debug">().toMatchTypeOf<LogLevel>();
    expectTypeOf<"info">().toMatchTypeOf<LogLevel>();
    expectTypeOf<"warn">().toMatchTypeOf<LogLevel>();
    expectTypeOf<"error">().toMatchTypeOf<LogLevel>();
    expectTypeOf<"fatal">().toMatchTypeOf<LogLevel>();
  });

  it('rejects "verbose", "notice", or other strings', () => {
    expectTypeOf<"verbose">().not.toMatchTypeOf<LogLevel>();
    expectTypeOf<"notice">().not.toMatchTypeOf<LogLevel>();
    expectTypeOf<"critical">().not.toMatchTypeOf<LogLevel>();
  });
});

describe("LogEntry type", () => {
  it("level is assignable to LogLevel", () => {
    expectTypeOf<LogEntry["level"]>().toMatchTypeOf<LogLevel>();
  });

  it("annotations is Readonly<Record<string, unknown>>", () => {
    expectTypeOf<LogEntry["annotations"]>().toEqualTypeOf<Readonly<Record<string, unknown>>>();
  });

  it("error is optional Error", () => {
    expectTypeOf<LogEntry["error"]>().toEqualTypeOf<Error | undefined>();
  });

  it("spans is optional ReadonlyArray", () => {
    expectTypeOf<LogEntry["spans"]>().toEqualTypeOf<
      ReadonlyArray<{ readonly traceId: string; readonly spanId: string }> | undefined
    >();
  });
});

describe("LogContext type", () => {
  it("allows known fields and index signature", () => {
    expectTypeOf<{ correlationId: string; requestId: string }>().toMatchTypeOf<LogContext>();
    expectTypeOf<{ customField: number }>().toMatchTypeOf<LogContext>();
  });
});

describe("LogLevelValue type", () => {
  it("is Readonly<Record<LogLevel, number>>", () => {
    expectTypeOf(LogLevelValue).toMatchTypeOf<Readonly<Record<LogLevel, number>>>();
  });
});
