import { describe, it, expect } from "vitest";
import { createLoggerInspectorAdapter, LoggerInspectorPort } from "../src/index.js";
import type { LogEntry, LogLevel, HandlerInfo, LoggerInspectorEvent } from "../src/index.js";

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    level: "info",
    message: "test message",
    timestamp: Date.now(),
    sequence: 0,
    context: {},
    annotations: {},
    ...overrides,
  };
}

// =============================================================================
// getSnapshot() tests
// =============================================================================

describe("LoggerInspector", () => {
  it("1. getSnapshot() returns valid LoggingSnapshot with all required fields", () => {
    const inspector = createLoggerInspectorAdapter({
      handlers: [{ type: "memory", name: "mem", active: true, entryCount: 0 }],
      samplingConfig: { rate: 0.5 },
      redactionConfig: { paths: ["password"] },
    });

    const snapshot = inspector.getSnapshot();

    expect(snapshot.timestamp).toBeGreaterThan(0);
    expect(snapshot.totalEntries).toBe(0);
    expect(snapshot.entriesByLevel).toEqual({
      trace: 0,
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0,
    });
    expect(snapshot.errorRate).toBe(0);
    expect(snapshot.handlers).toHaveLength(1);
    expect(snapshot.samplingActive).toBe(true);
    expect(snapshot.redactionActive).toBe(true);
    expect(typeof snapshot.contextDepth).toBe("number");
  });

  // ===========================================================================
  // getEntryCounts() tests
  // ===========================================================================

  it("2. getEntryCounts() returns zero counts initially", () => {
    const inspector = createLoggerInspectorAdapter();
    const counts = inspector.getEntryCounts();
    expect(counts).toEqual({
      trace: 0,
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0,
    });
  });

  it("3. getEntryCounts() increments on each log entry", () => {
    const inspector = createLoggerInspectorAdapter();

    inspector.recordEntry(makeEntry({ level: "info" }));
    inspector.recordEntry(makeEntry({ level: "info" }));
    inspector.recordEntry(makeEntry({ level: "info" }));

    const counts = inspector.getEntryCounts();
    expect(counts.info).toBe(3);
  });

  it("4. getEntryCounts() tracks all six levels independently", () => {
    const inspector = createLoggerInspectorAdapter();

    const levels: LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];
    for (const level of levels) {
      inspector.recordEntry(makeEntry({ level }));
    }

    const counts = inspector.getEntryCounts();
    for (const level of levels) {
      expect(counts[level]).toBe(1);
    }
  });

  // ===========================================================================
  // getErrorRate() tests
  // ===========================================================================

  it("5. getErrorRate() returns 0 when no entries logged", () => {
    const inspector = createLoggerInspectorAdapter();
    expect(inspector.getErrorRate()).toBe(0);
  });

  it("6. getErrorRate() calculates (error+fatal)/total correctly", () => {
    const inspector = createLoggerInspectorAdapter();

    inspector.recordEntry(makeEntry({ level: "info" }));
    inspector.recordEntry(makeEntry({ level: "info" }));
    inspector.recordEntry(makeEntry({ level: "error" }));
    inspector.recordEntry(makeEntry({ level: "fatal" }));

    // (1 error + 1 fatal) / 4 total = 0.5
    expect(inspector.getErrorRate()).toBe(0.5);
  });

  it("7. getErrorRate() respects time window option", () => {
    const inspector = createLoggerInspectorAdapter();

    const now = Date.now();

    // Old entries (outside window)
    inspector.recordEntry(makeEntry({ level: "error", timestamp: now - 120_000 }));
    inspector.recordEntry(makeEntry({ level: "info", timestamp: now - 120_000 }));

    // Recent entries (inside window)
    inspector.recordEntry(makeEntry({ level: "info", timestamp: now }));
    inspector.recordEntry(makeEntry({ level: "error", timestamp: now }));

    // Within 60s window: 1 error / 2 total = 0.5
    const rate = inspector.getErrorRate({ windowMs: 60_000 });
    expect(rate).toBe(0.5);
  });

  // ===========================================================================
  // getHandlerInfo() tests
  // ===========================================================================

  it("8. getHandlerInfo() returns handler metadata array", () => {
    const handlers: HandlerInfo[] = [
      { type: "memory", name: "mem-handler", active: true, entryCount: 0 },
      { type: "console", name: "console-handler", active: true, entryCount: 5 },
    ];
    const inspector = createLoggerInspectorAdapter({ handlers });

    const info = inspector.getHandlerInfo();
    expect(info).toHaveLength(2);
    expect(info[0].name).toBe("mem-handler");
    expect(info[1].name).toBe("console-handler");
  });

  it("9. getHandlerInfo() includes handler type discriminant", () => {
    const handlers: HandlerInfo[] = [
      {
        type: "memory",
        name: "mem",
        active: true,
        entryCount: 0,
        formatterType: "json",
        minLevel: "debug",
      },
    ];
    const inspector = createLoggerInspectorAdapter({ handlers });

    const info = inspector.getHandlerInfo();
    expect(info[0].type).toBe("memory");
    expect(info[0].formatterType).toBe("json");
    expect(info[0].minLevel).toBe("debug");
  });

  // ===========================================================================
  // getSamplingStatistics() tests
  // ===========================================================================

  it("10. getSamplingStatistics() returns zero stats initially", () => {
    const inspector = createLoggerInspectorAdapter({ samplingConfig: { rate: 0.5 } });
    const stats = inspector.getSamplingStatistics();

    expect(stats.active).toBe(true);
    expect(stats.acceptanceRate).toBe(1); // No entries yet, default 1
    for (const level of ["trace", "debug", "info", "warn", "error", "fatal"] as const) {
      expect(stats.byLevel[level].received).toBe(0);
      expect(stats.byLevel[level].accepted).toBe(0);
      expect(stats.byLevel[level].dropped).toBe(0);
    }
  });

  it("11. getSamplingStatistics() tracks accepted vs dropped per level", () => {
    const inspector = createLoggerInspectorAdapter({ samplingConfig: { rate: 0.5 } });

    // Record 2 accepted entries and 1 dropped for "info"
    inspector.recordEntry(makeEntry({ level: "info" }));
    inspector.recordEntry(makeEntry({ level: "info" }));
    inspector.recordSamplingDrop("info");

    const stats = inspector.getSamplingStatistics();
    // recordEntry records as received+accepted. recordSamplingDrop records as received+dropped
    // info: received = 2 (from recordEntry) + 1 (from recordSamplingDrop) = 3
    // info: dropped = 1
    // info: accepted = 3 - 1 = 2
    expect(stats.byLevel.info.received).toBe(3);
    expect(stats.byLevel.info.dropped).toBe(1);
    expect(stats.byLevel.info.accepted).toBe(2);
  });

  // ===========================================================================
  // getRedactionStatistics() tests
  // ===========================================================================

  it("12. getRedactionStatistics() tracks redacted field count", () => {
    const inspector = createLoggerInspectorAdapter({
      redactionConfig: { paths: ["password", "ssn"] },
    });

    inspector.recordRedaction("password");
    inspector.recordRedaction("password");
    inspector.recordRedaction("ssn");

    const stats = inspector.getRedactionStatistics();
    expect(stats.active).toBe(true);
    expect(stats.totalRedactions).toBe(3);
    expect(stats.fieldFrequency).toEqual({ password: 2, ssn: 1 });
    expect(stats.patternMatches).toBe(3);
  });

  // ===========================================================================
  // getRecentEntries() tests
  // ===========================================================================

  it("13. getRecentEntries() returns entries", () => {
    const inspector = createLoggerInspectorAdapter();

    inspector.recordEntry(makeEntry({ message: "first" }));
    inspector.recordEntry(makeEntry({ message: "second" }));

    const recent = inspector.getRecentEntries();
    expect(recent).toHaveLength(2);
    expect(recent[0].message).toBe("first");
    expect(recent[1].message).toBe("second");
  });

  it("14. getRecentEntries() returns empty array when no entries", () => {
    const inspector = createLoggerInspectorAdapter();
    const recent = inspector.getRecentEntries();
    expect(recent).toEqual([]);
  });

  it("15. getRecentEntries() respects limit option", () => {
    const inspector = createLoggerInspectorAdapter();

    for (let i = 0; i < 10; i++) {
      inspector.recordEntry(makeEntry({ message: `msg-${i}` }));
    }

    const recent = inspector.getRecentEntries({ limit: 3 });
    expect(recent).toHaveLength(3);
    // Should return the last 3
    expect(recent[0].message).toBe("msg-7");
    expect(recent[1].message).toBe("msg-8");
    expect(recent[2].message).toBe("msg-9");
  });

  // ===========================================================================
  // getContextUsage() tests
  // ===========================================================================

  it("16. getContextUsage() reports context field frequency", () => {
    const inspector = createLoggerInspectorAdapter();

    inspector.recordContextUsage(["correlationId", "userId"], 1);
    inspector.recordContextUsage(["correlationId", "sessionId"], 2);

    const usage = inspector.getContextUsage();
    expect(usage.activeVariables).toBe(3);
    expect(usage.fieldFrequency).toEqual({
      correlationId: 2,
      userId: 1,
      sessionId: 1,
    });
    expect(usage.maxChildDepth).toBe(2);
  });

  // ===========================================================================
  // subscribe() tests
  // ===========================================================================

  it('17. subscribe() fires "entry-logged" on log call', () => {
    const inspector = createLoggerInspectorAdapter();
    const events: LoggerInspectorEvent[] = [];
    inspector.subscribe(e => events.push(e));

    inspector.recordEntry(makeEntry({ level: "warn", message: "test" }));

    const entryLogged = events.find(e => e.type === "entry-logged");
    expect(entryLogged).toBeDefined();
    expect(entryLogged?.type === "entry-logged" && entryLogged.level).toBe("warn");
    expect(entryLogged?.type === "entry-logged" && entryLogged.message).toBe("test");
  });

  it('18. subscribe() fires "error-rate-threshold" when threshold exceeded', () => {
    const inspector = createLoggerInspectorAdapter({
      errorRateThreshold: 0.3,
      errorRateWindowMs: 60_000,
    });
    const events: LoggerInspectorEvent[] = [];
    inspector.subscribe(e => events.push(e));

    // 1 info + 1 error => error rate = 0.5 > 0.3 threshold
    inspector.recordEntry(makeEntry({ level: "info", timestamp: Date.now() }));
    inspector.recordEntry(makeEntry({ level: "error", timestamp: Date.now() }));

    const thresholdEvent = events.find(e => e.type === "error-rate-threshold");
    expect(thresholdEvent).toBeDefined();
    if (thresholdEvent?.type === "error-rate-threshold") {
      expect(thresholdEvent.errorRate).toBeGreaterThanOrEqual(0.3);
      expect(thresholdEvent.threshold).toBe(0.3);
    }
  });

  it('19. subscribe() fires "snapshot-changed" after state updates', () => {
    const inspector = createLoggerInspectorAdapter();
    const events: LoggerInspectorEvent[] = [];
    inspector.subscribe(e => events.push(e));

    inspector.recordEntry(makeEntry());

    const snapshotChanged = events.filter(e => e.type === "snapshot-changed");
    expect(snapshotChanged.length).toBeGreaterThanOrEqual(1);
  });

  // ===========================================================================
  // Port test
  // ===========================================================================

  it('20. LoggerInspectorPort.name is "LoggerInspector"', () => {
    expect(LoggerInspectorPort.__portName).toBe("LoggerInspector");
  });
});
