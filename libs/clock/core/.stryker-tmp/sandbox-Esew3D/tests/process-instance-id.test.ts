/**
 * Process instance ID tests — DoD 34
 */
// @ts-nocheck


import { describe, it, expect, vi, afterEach } from "vitest";
import { createProcessInstanceId } from "../src/process-instance.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

// =============================================================================
// DoD 34: Process Instance ID
// =============================================================================

describe("createProcessInstanceId()", () => {
  it("createProcessInstanceId() returns a string", () => {
    const id = createProcessInstanceId();
    expect(typeof id).toBe("string");
  });

  it("createProcessInstanceId() format matches `{hostname}-{timestamp}-{uuid}` pattern", () => {
    const id = createProcessInstanceId();
    // Format: hostname-timestamp-uuid where uuid can be UUID v4 or fallback format
    // The pattern has at least 3 dash-separated segments
    const parts = id.split("-");
    expect(parts.length).toBeGreaterThanOrEqual(3);
  });

  it("createProcessInstanceId() hostname segment is a non-empty string", () => {
    const id = createProcessInstanceId();
    const firstDash = id.indexOf("-");
    const hostname = id.slice(0, firstDash);
    expect(hostname.length).toBeGreaterThan(0);
  });

  it("createProcessInstanceId() timestamp segment is a valid epoch millisecond number", () => {
    const before = Date.now();
    const id = createProcessInstanceId();
    const after = Date.now();

    // Format: {hostname}-{timestamp}-{rest}
    // hostname may contain dashes, so we need to find the timestamp by parsing from the known format
    // We know timestamp is Date.now() at call time
    // The timestamp is embedded as: hostname-{timestamp}-{uuid...}
    // A simpler approach: find a numeric segment that's a plausible timestamp
    const segments = id.split("-");
    const numericSegments = segments.filter((s) => /^\d+$/.test(s));
    const timestamps = numericSegments.map(Number).filter((n) => n >= before && n <= after);
    expect(timestamps.length).toBeGreaterThanOrEqual(1);
  });

  it("createProcessInstanceId() uuid segment is a valid UUID v4 format or fallback", () => {
    const id = createProcessInstanceId();
    // Either ends with a UUID v4 pattern OR a fallback pattern
    const uuidV4Pattern = /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const fallbackPattern = /fallback-[\d.]+(-\d+)?$/;
    const isUuid = uuidV4Pattern.test(id);
    const isFallback = fallbackPattern.test(id);
    expect(isUuid || isFallback).toBe(true);
  });

  it("two calls to createProcessInstanceId() return different values (uuid uniqueness)", () => {
    const id1 = createProcessInstanceId();
    const id2 = createProcessInstanceId();
    expect(id1).not.toBe(id2);
  });

  it("createProcessInstanceId() falls back to 'unknown' hostname when env vars are missing", () => {
    // Save and remove hostname env vars
    const savedHostname = process.env["HOSTNAME"];
    const savedComputername = process.env["COMPUTERNAME"];
    delete process.env["HOSTNAME"];
    delete process.env["COMPUTERNAME"];

    try {
      const id = createProcessInstanceId();
      expect(id.startsWith("unknown-")).toBe(true);
    } finally {
      if (savedHostname !== undefined) process.env["HOSTNAME"] = savedHostname;
      if (savedComputername !== undefined) process.env["COMPUTERNAME"] = savedComputername;
    }
  });

  it("createProcessInstanceId() uses fallback format when crypto.randomUUID is unavailable", () => {
    // Temporarily stub out crypto.randomUUID
    const originalRandomUUID = globalThis.crypto?.randomUUID;

    try {
      if (globalThis.crypto) {
        // Override randomUUID to be undefined
        Object.defineProperty(globalThis.crypto, "randomUUID", {
          value: undefined,
          writable: true,
          configurable: true,
        });
      }

      const id = createProcessInstanceId();
      // Should contain the fallback pattern
      expect(id).toContain("fallback");
    } finally {
      if (globalThis.crypto && originalRandomUUID !== undefined) {
        Object.defineProperty(globalThis.crypto, "randomUUID", {
          value: originalRandomUUID,
          writable: true,
          configurable: true,
        });
      }
    }
  });

  it("fallback identifier includes performance.now() precision component", () => {
    const originalRandomUUID = globalThis.crypto?.randomUUID;

    try {
      if (globalThis.crypto) {
        Object.defineProperty(globalThis.crypto, "randomUUID", {
          value: undefined,
          writable: true,
          configurable: true,
        });
      }

      const id = createProcessInstanceId();
      // Fallback format includes fractional performance.now()
      // pattern: fallback-{perf.toFixed(6)}-{counter}
      expect(id).toMatch(/fallback-\d+\.\d+/);
    } finally {
      if (globalThis.crypto && originalRandomUUID !== undefined) {
        Object.defineProperty(globalThis.crypto, "randomUUID", {
          value: originalRandomUUID,
          writable: true,
          configurable: true,
        });
      }
    }
  });

  it("fallback identifier includes monotonic counter for same-microsecond uniqueness", () => {
    const originalRandomUUID = globalThis.crypto?.randomUUID;

    try {
      if (globalThis.crypto) {
        Object.defineProperty(globalThis.crypto, "randomUUID", {
          value: undefined,
          writable: true,
          configurable: true,
        });
      }

      const id1 = createProcessInstanceId();
      const id2 = createProcessInstanceId();
      // The counter ensures uniqueness even in the same microsecond
      expect(id1).not.toBe(id2);
    } finally {
      if (globalThis.crypto && originalRandomUUID !== undefined) {
        Object.defineProperty(globalThis.crypto, "randomUUID", {
          value: originalRandomUUID,
          writable: true,
          configurable: true,
        });
      }
    }
  });
});

// =============================================================================
// Mutation score improvement — global stubbing and hostname detection
// =============================================================================

// =============================================================================
// Mutation score improvement — UUID path vs fallback and counter direction
// =============================================================================

describe("createProcessInstanceId() — UUID path verification", () => {
  it("result does NOT contain 'fallback' when crypto.randomUUID is available (kills L17/L18/L19)", () => {
    // Default test env has crypto.randomUUID
    // L17 CE(false): always goes to fallback → id contains "fallback" → kills mutant
    // L18 StringLiteral(""): typeof fn === "" → false → fallback → kills mutant
    // L19 BlockStatement: body replaced → falls through to fallback → kills mutant
    const id = createProcessInstanceId();
    expect(id).not.toContain("fallback");
  });

  it("fallback uses actual performance.now() value when performance is available (kills L25 CE=false)", () => {
    // L25 CE(false): perfNow = 0 always → "fallback-0.000000-"
    // With known perf mock returning 1000, we get "fallback-1000.000000-"
    vi.stubGlobal("crypto", undefined);
    vi.stubGlobal("performance", { now: () => 1000 });
    const id = createProcessInstanceId();
    expect(id).toContain("fallback-1000.000000-");
  });

  it("fallback counter is non-negative (kills L26 AssignmentOperator -=)", () => {
    // fallbackCounter += 1 → positive; mutant: -= 1 → negative → double dash in id
    vi.stubGlobal("crypto", undefined);
    vi.stubGlobal("performance", undefined);
    const id = createProcessInstanceId();
    // Positive counter: "...fallback-0.000000-1" matches \d+$
    // Negative counter: "...fallback-0.000000--1" does NOT match \d+$ (has double dash)
    expect(id).toMatch(/fallback-0\.000000-\d+$/);
  });
});

describe("createProcessInstanceId() — hostname env null handling", () => {
  it("returns 'unknown' prefix when process.env is null (kills L35 CE/LogicalOperator mutants)", () => {
    // Original: proc["env"] !== null → false when env=null → returns "unknown"
    // L35 CE(true): skips null check → tries null["HOSTNAME"] → TypeError
    vi.stubGlobal("process", { env: null });
    const id = createProcessInstanceId();
    expect(id.startsWith("unknown-")).toBe(true);
  });
});

describe("createProcessInstanceId() — crypto global stubbing", () => {
  it("uses fallback when crypto is undefined", () => {
    vi.stubGlobal("crypto", undefined);
    const id = createProcessInstanceId();
    expect(id).toContain("fallback-");
  });

  it("uses fallback when crypto.randomUUID is not a function", () => {
    vi.stubGlobal("crypto", { randomUUID: "not-a-function" });
    const id = createProcessInstanceId();
    expect(id).toContain("fallback-");
  });

  it("fallback uses perfNow=0 when performance is also undefined", () => {
    vi.stubGlobal("crypto", undefined);
    vi.stubGlobal("performance", undefined);
    const id = createProcessInstanceId();
    // perfNow = 0, so fallback id contains "fallback-0.000000-"
    expect(id).toContain("fallback-0.000000-");
  });
});

describe("createProcessInstanceId() — hostname env detection", () => {
  it("uses HOSTNAME env var as ID prefix", () => {
    const savedHostname = process.env["HOSTNAME"];
    const savedComputername = process.env["COMPUTERNAME"];
    process.env["HOSTNAME"] = "my-host";
    delete process.env["COMPUTERNAME"];
    try {
      const id = createProcessInstanceId();
      expect(id.startsWith("my-host-")).toBe(true);
    } finally {
      if (savedHostname !== undefined) process.env["HOSTNAME"] = savedHostname;
      else delete process.env["HOSTNAME"];
      if (savedComputername !== undefined) process.env["COMPUTERNAME"] = savedComputername;
      else delete process.env["COMPUTERNAME"];
    }
  });

  it("falls back to COMPUTERNAME when HOSTNAME is absent", () => {
    const savedHostname = process.env["HOSTNAME"];
    const savedComputername = process.env["COMPUTERNAME"];
    delete process.env["HOSTNAME"];
    process.env["COMPUTERNAME"] = "WIN-HOST";
    try {
      const id = createProcessInstanceId();
      expect(id.startsWith("WIN-HOST-")).toBe(true);
    } finally {
      if (savedHostname !== undefined) process.env["HOSTNAME"] = savedHostname;
      else delete process.env["HOSTNAME"];
      if (savedComputername !== undefined) process.env["COMPUTERNAME"] = savedComputername;
      else delete process.env["COMPUTERNAME"];
    }
  });

  it("HOSTNAME wins over COMPUTERNAME when both are set", () => {
    const savedHostname = process.env["HOSTNAME"];
    const savedComputername = process.env["COMPUTERNAME"];
    process.env["HOSTNAME"] = "my-host";
    process.env["COMPUTERNAME"] = "WIN-HOST";
    try {
      const id = createProcessInstanceId();
      expect(id.startsWith("my-host-")).toBe(true);
    } finally {
      if (savedHostname !== undefined) process.env["HOSTNAME"] = savedHostname;
      else delete process.env["HOSTNAME"];
      if (savedComputername !== undefined) process.env["COMPUTERNAME"] = savedComputername;
      else delete process.env["COMPUTERNAME"];
    }
  });

  it("empty HOSTNAME returns 'unknown' prefix", () => {
    const savedHostname = process.env["HOSTNAME"];
    const savedComputername = process.env["COMPUTERNAME"];
    process.env["HOSTNAME"] = "";
    delete process.env["COMPUTERNAME"];
    try {
      const id = createProcessInstanceId();
      expect(id.startsWith("unknown-")).toBe(true);
    } finally {
      if (savedHostname !== undefined) process.env["HOSTNAME"] = savedHostname;
      else delete process.env["HOSTNAME"];
      if (savedComputername !== undefined) process.env["COMPUTERNAME"] = savedComputername;
      else delete process.env["COMPUTERNAME"];
    }
  });
});
