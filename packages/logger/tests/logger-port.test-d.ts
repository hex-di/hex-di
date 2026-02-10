import { describe, it, expectTypeOf } from "vitest";
import { createMemoryLogger } from "../src/index.js";
import type { Logger } from "../src/index.js";

describe("Logger type-level tests", () => {
  it("Logger.child() returns Logger", () => {
    const logger = createMemoryLogger();
    expectTypeOf(logger.child({})).toMatchTypeOf<Logger>();
  });

  it("Logger.withAnnotations() returns Logger", () => {
    const logger = createMemoryLogger();
    expectTypeOf(logger.withAnnotations({})).toMatchTypeOf<Logger>();
  });

  it("Logger.time() infers return type from function", () => {
    const logger = createMemoryLogger();
    expectTypeOf(logger.time("op", () => 42)).toEqualTypeOf<number>();
    expectTypeOf(logger.time("op", () => "hello")).toEqualTypeOf<string>();
  });

  it("Logger.timeAsync() infers Promise<T> from function", () => {
    const logger = createMemoryLogger();
    expectTypeOf(logger.timeAsync("op", async () => 42)).toEqualTypeOf<Promise<number>>();
    expectTypeOf(logger.timeAsync("op", async () => "hello")).toEqualTypeOf<Promise<string>>();
  });

  it("Logger.error() overload accepts (string, Error, Record)", () => {
    const logger = createMemoryLogger();
    // All three overload forms should type-check
    logger.error("msg");
    logger.error("msg", { key: "val" });
    logger.error("msg", new Error("e"), { key: "val" });
  });

  it("Logger.fatal() overload accepts (string, Error, Record)", () => {
    const logger = createMemoryLogger();
    // All three overload forms should type-check
    logger.fatal("msg");
    logger.fatal("msg", { key: "val" });
    logger.fatal("msg", new Error("e"), { key: "val" });
  });
});
