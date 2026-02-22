import { describe, it, expect } from "vitest";
import { createCompletenessMonitor } from "../../src/guard/guard.js";
import type { CompletenessMonitor } from "../../src/guard/guard.js";

describe("createCompletenessMonitor", () => {
  it("returns a CompletenessMonitor", () => {
    const monitor = createCompletenessMonitor();
    expect(typeof monitor.recordResolution).toBe("function");
    expect(typeof monitor.recordAuditEntry).toBe("function");
    expect(typeof monitor.queryCompleteness).toBe("function");
    expect(Array.isArray(monitor.portNames)).toBe(true);
  });

  it("recordResolution + queryCompleteness shows correct count", () => {
    const monitor = createCompletenessMonitor();
    monitor.recordResolution("UserPort");
    monitor.recordResolution("UserPort");
    const result = monitor.queryCompleteness("UserPort");
    expect(result.resolutions).toBe(2);
  });

  it("recordAuditEntry + queryCompleteness shows correct count", () => {
    const monitor = createCompletenessMonitor();
    monitor.recordAuditEntry("OrderPort");
    const result = monitor.queryCompleteness("OrderPort");
    expect(result.auditEntries).toBe(1);
  });

  it("discrepancy is resolutions - auditEntries", () => {
    const monitor = createCompletenessMonitor();
    monitor.recordResolution("ReportPort");
    monitor.recordResolution("ReportPort");
    monitor.recordResolution("ReportPort");
    monitor.recordAuditEntry("ReportPort");
    const result = monitor.queryCompleteness("ReportPort");
    expect(result.discrepancy).toBe(2);
  });

  it("discrepancy is 0 when resolutions and auditEntries are equal", () => {
    const monitor = createCompletenessMonitor();
    monitor.recordResolution("BalancedPort");
    monitor.recordAuditEntry("BalancedPort");
    const result = monitor.queryCompleteness("BalancedPort");
    expect(result.discrepancy).toBe(0);
    expect(result.resolutions).toBe(1);
    expect(result.auditEntries).toBe(1);
  });

  it("queryCompleteness returns 0 for unknown portName", () => {
    const monitor = createCompletenessMonitor();
    const result = monitor.queryCompleteness("UnknownPort");
    expect(result.resolutions).toBe(0);
    expect(result.auditEntries).toBe(0);
    expect(result.discrepancy).toBe(0);
  });

  it("portNames lists all ports seen", () => {
    const monitor = createCompletenessMonitor();
    monitor.recordResolution("PortA");
    monitor.recordAuditEntry("PortB");
    monitor.recordResolution("PortC");
    const names = [...monitor.portNames].sort();
    expect(names).toEqual(["PortA", "PortB", "PortC"]);
  });

  it("portNames does not contain duplicates", () => {
    const monitor = createCompletenessMonitor();
    monitor.recordResolution("SamePort");
    monitor.recordResolution("SamePort");
    monitor.recordAuditEntry("SamePort");
    expect(monitor.portNames).toHaveLength(1);
    expect(monitor.portNames[0]).toBe("SamePort");
  });

  it("tracks multiple ports independently", () => {
    const monitor: CompletenessMonitor = createCompletenessMonitor();
    monitor.recordResolution("Alpha");
    monitor.recordResolution("Alpha");
    monitor.recordAuditEntry("Beta");
    const alpha = monitor.queryCompleteness("Alpha");
    const beta = monitor.queryCompleteness("Beta");
    expect(alpha.resolutions).toBe(2);
    expect(alpha.auditEntries).toBe(0);
    expect(beta.resolutions).toBe(0);
    expect(beta.auditEntries).toBe(1);
  });

  it("queryCompleteness result is frozen (immutable)", () => {
    const monitor = createCompletenessMonitor();
    monitor.recordResolution("FrozenPort");
    const result = monitor.queryCompleteness("FrozenPort");
    expect(Object.isFrozen(result)).toBe(true);
  });
});
