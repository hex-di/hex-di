import { describe, it, expect } from "vitest";
import { LogLevelValue, shouldLog } from "../src/index.js";
import type { LogLevel } from "../src/index.js";

describe("LogLevelValue", () => {
  it("trace is 10", () => {
    expect(LogLevelValue.trace).toBe(10);
  });

  it("debug is 20", () => {
    expect(LogLevelValue.debug).toBe(20);
  });

  it("info is 30", () => {
    expect(LogLevelValue.info).toBe(30);
  });

  it("warn is 40", () => {
    expect(LogLevelValue.warn).toBe(40);
  });

  it("error is 50", () => {
    expect(LogLevelValue.error).toBe(50);
  });

  it("fatal is 60", () => {
    expect(LogLevelValue.fatal).toBe(60);
  });
});

describe("shouldLog", () => {
  it('shouldLog("info", "debug") returns true', () => {
    expect(shouldLog("info", "debug")).toBe(true);
  });

  it('shouldLog("debug", "info") returns false', () => {
    expect(shouldLog("debug", "info")).toBe(false);
  });

  it('shouldLog("error", "error") returns true', () => {
    expect(shouldLog("error", "error")).toBe(true);
  });

  it('shouldLog("trace", "info") returns false', () => {
    expect(shouldLog("trace", "info")).toBe(false);
  });

  it('shouldLog("fatal", "trace") returns true', () => {
    expect(shouldLog("fatal", "trace")).toBe(true);
  });

  it('every level should log when minLevel is "trace"', () => {
    const levels: LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];
    for (const level of levels) {
      expect(shouldLog(level, "trace")).toBe(true);
    }
  });

  it('only "fatal" should log when minLevel is "fatal"', () => {
    const nonFatal: LogLevel[] = ["trace", "debug", "info", "warn", "error"];
    for (const level of nonFatal) {
      expect(shouldLog(level, "fatal")).toBe(false);
    }
    expect(shouldLog("fatal", "fatal")).toBe(true);
  });
});
