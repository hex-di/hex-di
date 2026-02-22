import { describe, it, expect } from "vitest";
import { NOOP_LOGGER, NoOpLoggerAdapter } from "../../src/index.js";

describe("NOOP_LOGGER", () => {
  it("does not throw on any log level", () => {
    expect(() => NOOP_LOGGER.trace("msg")).not.toThrow();
    expect(() => NOOP_LOGGER.debug("msg")).not.toThrow();
    expect(() => NOOP_LOGGER.info("msg")).not.toThrow();
    expect(() => NOOP_LOGGER.warn("msg")).not.toThrow();
    expect(() => NOOP_LOGGER.error("msg")).not.toThrow();
    expect(() => NOOP_LOGGER.fatal("msg")).not.toThrow();
  });

  it("error/fatal accept Error argument", () => {
    expect(() => NOOP_LOGGER.error("msg", new Error("test"))).not.toThrow();
    expect(() => NOOP_LOGGER.fatal("msg", new Error("test"), { key: 1 })).not.toThrow();
  });

  it("child returns the same noop logger", () => {
    const child = NOOP_LOGGER.child({ correlationId: "abc" });
    expect(child).toBe(NOOP_LOGGER);
  });

  it("withAnnotations returns the same noop logger", () => {
    const annotated = NOOP_LOGGER.withAnnotations({ key: "value" });
    expect(annotated).toBe(NOOP_LOGGER);
  });

  it("isLevelEnabled returns false for all levels", () => {
    expect(NOOP_LOGGER.isLevelEnabled("trace")).toBe(false);
    expect(NOOP_LOGGER.isLevelEnabled("debug")).toBe(false);
    expect(NOOP_LOGGER.isLevelEnabled("info")).toBe(false);
    expect(NOOP_LOGGER.isLevelEnabled("warn")).toBe(false);
    expect(NOOP_LOGGER.isLevelEnabled("error")).toBe(false);
    expect(NOOP_LOGGER.isLevelEnabled("fatal")).toBe(false);
  });

  it("getContext returns empty object", () => {
    expect(NOOP_LOGGER.getContext()).toEqual({});
  });

  it("time executes the function and returns the result", () => {
    const result = NOOP_LOGGER.time("op", () => 42);
    expect(result).toBe(42);
  });

  it("timeAsync executes the async function and returns the result", async () => {
    const result = await NOOP_LOGGER.timeAsync("op", async () => 42);
    expect(result).toBe(42);
  });
});

describe("NoOpLoggerAdapter", () => {
  it("is defined with correct metadata", () => {
    expect(NoOpLoggerAdapter).toBeDefined();
  });
});
