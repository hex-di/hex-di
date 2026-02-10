import { describe, it, expect } from "vitest";
import { shouldLog, LogLevelValue } from "../../src/index.js";
import type { LogLevel } from "../../src/index.js";

describe("LogLevelValue", () => {
  it("has correct ordering", () => {
    expect(LogLevelValue.trace).toBeLessThan(LogLevelValue.debug);
    expect(LogLevelValue.debug).toBeLessThan(LogLevelValue.info);
    expect(LogLevelValue.info).toBeLessThan(LogLevelValue.warn);
    expect(LogLevelValue.warn).toBeLessThan(LogLevelValue.error);
    expect(LogLevelValue.error).toBeLessThan(LogLevelValue.fatal);
  });
});

describe("shouldLog", () => {
  it("returns true when level meets minimum", () => {
    expect(shouldLog("info", "info")).toBe(true);
    expect(shouldLog("warn", "info")).toBe(true);
    expect(shouldLog("error", "info")).toBe(true);
    expect(shouldLog("fatal", "info")).toBe(true);
  });

  it("returns false when level is below minimum", () => {
    expect(shouldLog("trace", "info")).toBe(false);
    expect(shouldLog("debug", "info")).toBe(false);
  });

  it("trace minimum allows everything", () => {
    const levels: LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];
    for (const level of levels) {
      expect(shouldLog(level, "trace")).toBe(true);
    }
  });

  it("fatal minimum only allows fatal", () => {
    const levels: LogLevel[] = ["trace", "debug", "info", "warn", "error"];
    for (const level of levels) {
      expect(shouldLog(level, "fatal")).toBe(false);
    }
    expect(shouldLog("fatal", "fatal")).toBe(true);
  });
});
