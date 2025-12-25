/**
 * Type-level tests for error-channeling types.
 *
 * These tests verify that InferService and InferPortName return
 * descriptive error types instead of plain `never` when given non-Port types.
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort, InferPortName, InferService, NotAPortError, Port } from "../src/index.js";

interface Logger {
  log(message: string): void;
}

// Shared port for type-only tests - value consumed via void to suppress lint warning
const LoggerPort = createPort<"Logger", Logger>("Logger");
void LoggerPort;

describe("NotAPortError type", () => {
  it("has the expected branded structure", () => {
    type Error = NotAPortError<string>;

    expectTypeOf<Error["__errorBrand"]>().toEqualTypeOf<"NotAPortError">();
    expectTypeOf<Error["__received"]>().toEqualTypeOf<string>();
    expectTypeOf<Error>().toHaveProperty("__message");
    expectTypeOf<Error>().toHaveProperty("__hint");
  });

  it("preserves the received type for debugging", () => {
    type StringError = NotAPortError<string>;
    type NumberError = NotAPortError<number>;
    type ObjectError = NotAPortError<{ foo: string }>;

    expectTypeOf<StringError["__received"]>().toEqualTypeOf<string>();
    expectTypeOf<NumberError["__received"]>().toEqualTypeOf<number>();
    expectTypeOf<ObjectError["__received"]>().toEqualTypeOf<{ foo: string }>();
  });

  it("message properties are literal string types", () => {
    type Error = NotAPortError<string>;

    // The message should be a specific string literal, not just string
    type Message = Error["__message"];
    type Hint = Error["__hint"];

    expectTypeOf<Message>().not.toEqualTypeOf<string>();
    expectTypeOf<Hint>().not.toEqualTypeOf<string>();
  });
});

describe("InferService error channeling", () => {
  it("returns service type for valid Port", () => {
    type LoggerPort = Port<Logger, "Logger">;
    type Service = InferService<LoggerPort>;

    expectTypeOf<Service>().toEqualTypeOf<Logger>();
  });

  it("returns service type for port created with createPort", () => {
    type Service = InferService<typeof LoggerPort>;

    expectTypeOf<Service>().toEqualTypeOf<Logger>();
  });

  it("returns NotAPortError for string", () => {
    type Result = InferService<string>;

    expectTypeOf<Result>().toMatchTypeOf<NotAPortError<string>>();
    expectTypeOf<Result["__errorBrand"]>().toEqualTypeOf<"NotAPortError">();
  });

  it("returns NotAPortError for number", () => {
    type Result = InferService<number>;

    expectTypeOf<Result>().toMatchTypeOf<NotAPortError<number>>();
  });

  it("returns NotAPortError for boolean", () => {
    type Result = InferService<boolean>;

    expectTypeOf<Result>().toMatchTypeOf<NotAPortError<boolean>>();
  });

  it("returns NotAPortError for object that looks like Port but is not branded", () => {
    type FakePort = { __portName: "Fake" };
    type Result = InferService<FakePort>;

    expectTypeOf<Result>().toMatchTypeOf<NotAPortError<FakePort>>();
  });

  it("returns NotAPortError for undefined", () => {
    type Result = InferService<undefined>;

    expectTypeOf<Result>().toMatchTypeOf<NotAPortError<undefined>>();
  });

  it("returns NotAPortError for null", () => {
    type Result = InferService<null>;

    expectTypeOf<Result>().toMatchTypeOf<NotAPortError<null>>();
  });
});

describe("InferPortName error channeling", () => {
  it("returns port name for valid Port", () => {
    type LoggerPort = Port<Logger, "Logger">;
    type Name = InferPortName<LoggerPort>;

    expectTypeOf<Name>().toEqualTypeOf<"Logger">();
  });

  it("returns port name for port created with createPort", () => {
    type Name = InferPortName<typeof LoggerPort>;

    expectTypeOf<Name>().toEqualTypeOf<"Logger">();
  });

  it("returns NotAPortError for string", () => {
    type Result = InferPortName<string>;

    expectTypeOf<Result>().toMatchTypeOf<NotAPortError<string>>();
  });

  it("returns NotAPortError for number", () => {
    type Result = InferPortName<number>;

    expectTypeOf<Result>().toMatchTypeOf<NotAPortError<number>>();
  });

  it("returns NotAPortError for object without brand", () => {
    type FakePort = { readonly __portName: "fake" };
    type Result = InferPortName<FakePort>;

    expectTypeOf<Result>().toMatchTypeOf<NotAPortError<FakePort>>();
  });
});

describe("Edge cases", () => {
  it("handles union types correctly (distributes)", () => {
    type ValidPort = typeof LoggerPort;

    // Union of valid port and invalid type
    type Mixed = InferService<ValidPort | string>;

    // Should produce union of Logger and error (distributive conditional type behavior)
    expectTypeOf<Mixed>().toEqualTypeOf<Logger | NotAPortError<string>>();
  });

  it("handles never input (returns never)", () => {
    // never should produce never (standard conditional type behavior)
    type Result = InferService<never>;
    expectTypeOf<Result>().toBeNever();
  });

  it("handles unknown input", () => {
    type Result = InferService<unknown>;
    expectTypeOf<Result>().toMatchTypeOf<NotAPortError<unknown>>();
  });

  it("preserves complex object types in error", () => {
    interface ComplexObject {
      nested: {
        value: number;
      };
      callback: () => void;
    }

    type Result = InferService<ComplexObject>;
    expectTypeOf<Result["__received"]>().toEqualTypeOf<ComplexObject>();
  });
});
