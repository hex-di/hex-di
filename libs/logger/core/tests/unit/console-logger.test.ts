import { describe, it, expect, vi, afterEach } from "vitest";
import { createConsoleLogger } from "../../src/index.js";

describe("ConsoleLogger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a logger with default options", () => {
    const logger = createConsoleLogger();
    expect(logger).toBeDefined();
  });

  it("respects minimum level", () => {
    const logger = createConsoleLogger({ level: "warn" });
    expect(logger.isLevelEnabled("trace")).toBe(false);
    expect(logger.isLevelEnabled("debug")).toBe(false);
    expect(logger.isLevelEnabled("info")).toBe(false);
    expect(logger.isLevelEnabled("warn")).toBe(true);
    expect(logger.isLevelEnabled("error")).toBe(true);
  });

  it("getContext returns empty context for root logger", () => {
    const logger = createConsoleLogger();
    expect(logger.getContext()).toEqual({});
  });

  it("child adds context", () => {
    const logger = createConsoleLogger();
    const child = logger.child({ service: "test" });
    expect(child.getContext()).toEqual({ service: "test" });
  });

  it("withAnnotations returns new logger", () => {
    const logger = createConsoleLogger();
    const annotated = logger.withAnnotations({ key: "val" });
    expect(annotated).not.toBe(logger);
  });

  it("time returns the result", () => {
    const logger = createConsoleLogger({ level: "fatal" }); // suppress output
    const result = logger.time("op", () => 42);
    expect(result).toBe(42);
  });

  it("timeAsync returns the result", async () => {
    const logger = createConsoleLogger({ level: "fatal" });
    const result = await logger.timeAsync("op", async () => 99);
    expect(result).toBe(99);
  });

  it("accepts a custom formatter type", () => {
    const logger = createConsoleLogger({ formatterType: "json" });
    expect(logger).toBeDefined();
  });
});
