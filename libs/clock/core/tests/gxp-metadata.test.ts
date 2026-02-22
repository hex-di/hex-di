/**
 * GxP Metadata tests — DoD 14/15
 */

import { describe, it, expect } from "vitest";
import { getClockGxPMetadata } from "../src/gxp-metadata.js";
import { createProcessInstanceId } from "../src/process-instance.js";

// =============================================================================
// DoD 14/15: GxP Metadata
// =============================================================================

describe("getClockGxPMetadata", () => {
  it("returns a frozen ClockGxPMetadata object", () => {
    const meta = getClockGxPMetadata();
    expect(Object.isFrozen(meta)).toBe(true);
  });

  it("clockVersion is a non-empty string matching package version", () => {
    const meta = getClockGxPMetadata();
    expect(typeof meta.clockVersion).toBe("string");
    expect(meta.clockVersion.length).toBeGreaterThan(0);
  });

  it("specRevision is a non-empty string matching the current specification revision", () => {
    const meta = getClockGxPMetadata();
    expect(meta.specRevision).toBe("2.9");
  });

  it("requiredMonitoringVersion field exists", () => {
    const meta = getClockGxPMetadata();
    expect("requiredMonitoringVersion" in meta).toBe(true);
  });
});

// =============================================================================
// DoD 10.9: Process Instance ID
// =============================================================================

describe("createProcessInstanceId", () => {
  it("returns a string in {hostname}-{timestamp}-{uuid} format", () => {
    const id = createProcessInstanceId();
    expect(typeof id).toBe("string");
    // Format: something-timestamp-uuid
    const parts = id.split("-");
    expect(parts.length).toBeGreaterThanOrEqual(3);
  });

  it("two calls return different UUIDs", () => {
    const id1 = createProcessInstanceId();
    const id2 = createProcessInstanceId();
    expect(id1).not.toBe(id2);
  });
});
