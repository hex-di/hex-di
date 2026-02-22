/**
 * Deserialization tests — DoD 8b/13
 */
// @ts-nocheck


import { describe, it, expect } from "vitest";
import {
  deserializeTemporalContext,
  deserializeOverflowTemporalContext,
  deserializeClockDiagnostics,
  createDeserializationError,
} from "../src/deserialization.js";

// =============================================================================
// DoD 8b/13: Schema Deserialization
// =============================================================================

describe("deserializeTemporalContext", () => {
  const validRaw = {
    sequenceNumber: 42,
    monotonicTimestamp: 1000,
    wallClockTimestamp: 1707753600000,
  };

  it("returns Ok for valid v1 TemporalContext JSON", () => {
    const result = deserializeTemporalContext(validRaw);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.sequenceNumber).toBe(42);
      expect(result.value.monotonicTimestamp).toBe(1000);
      expect(result.value.wallClockTimestamp).toBe(1707753600000);
    }
  });

  it("returns Err when sequenceNumber is missing", () => {
    const result = deserializeTemporalContext({
      monotonicTimestamp: 1000,
      wallClockTimestamp: 1707753600000,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("DeserializationError");
    }
  });

  it("returns Err when sequenceNumber is not an integer (type check)", () => {
    const result = deserializeTemporalContext({
      sequenceNumber: "not-a-number",
      monotonicTimestamp: 1000,
      wallClockTimestamp: 1707753600000,
    });
    expect(result.isErr()).toBe(true);
  });

  it("returns Err when monotonicTimestamp is missing", () => {
    const result = deserializeTemporalContext({
      sequenceNumber: 1,
      wallClockTimestamp: 1707753600000,
    });
    expect(result.isErr()).toBe(true);
  });

  it("returns Err when wallClockTimestamp is missing", () => {
    const result = deserializeTemporalContext({
      sequenceNumber: 1,
      monotonicTimestamp: 1000,
    });
    expect(result.isErr()).toBe(true);
  });

  it("returns a frozen TemporalContext on success", () => {
    const result = deserializeTemporalContext(validRaw);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });

  it("returns Err when input is null/undefined/string/number", () => {
    expect(deserializeTemporalContext(null).isErr()).toBe(true);
    expect(deserializeTemporalContext(undefined).isErr()).toBe(true);
    expect(deserializeTemporalContext("string").isErr()).toBe(true);
    expect(deserializeTemporalContext(42).isErr()).toBe(true);
  });

  it("branded types on deserialized fields", () => {
    const result = deserializeTemporalContext(validRaw);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // At runtime, branded types are plain numbers
      expect(typeof result.value.monotonicTimestamp).toBe("number");
      expect(typeof result.value.wallClockTimestamp).toBe("number");
    }
  });
});

describe("deserializeOverflowTemporalContext", () => {
  const validOverflowRaw = {
    _tag: "OverflowTemporalContext",
    sequenceNumber: -1,
    lastValidSequenceNumber: Number.MAX_SAFE_INTEGER,
    monotonicTimestamp: 9999999,
    wallClockTimestamp: 1707753600000,
  };

  it("returns Ok for valid v1 OverflowTemporalContext JSON", () => {
    const result = deserializeOverflowTemporalContext(validOverflowRaw);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value._tag).toBe("OverflowTemporalContext");
      expect(result.value.sequenceNumber).toBe(-1);
    }
  });

  it("returns Err when _tag is not 'OverflowTemporalContext'", () => {
    const result = deserializeOverflowTemporalContext({
      ...validOverflowRaw,
      _tag: "Wrong",
    });
    expect(result.isErr()).toBe(true);
  });

  it("returns Err when sequenceNumber is not -1", () => {
    const result = deserializeOverflowTemporalContext({
      ...validOverflowRaw,
      sequenceNumber: 1,
    });
    expect(result.isErr()).toBe(true);
  });
});

describe("deserializeClockDiagnostics", () => {
  const validDiagRaw = {
    adapterName: "SystemClockAdapter",
    monotonicSource: "performance.now",
    highResSource: "performance.timeOrigin+now",
    platformResolutionMs: 0.001,
    cryptoFipsMode: undefined,
  };

  it("returns Ok for valid v1 ClockDiagnostics JSON", () => {
    const result = deserializeClockDiagnostics(validDiagRaw);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.adapterName).toBe("SystemClockAdapter");
      expect(result.value.monotonicSource).toBe("performance.now");
    }
  });

  it("returns Err when monotonicSource is not a known enum value", () => {
    const result = deserializeClockDiagnostics({
      ...validDiagRaw,
      monotonicSource: "unknown-source",
    });
    expect(result.isErr()).toBe(true);
  });
});

describe("deserializeOverflowTemporalContext — additional coverage", () => {
  const validOverflowRaw = {
    _tag: "OverflowTemporalContext",
    sequenceNumber: -1,
    lastValidSequenceNumber: Number.MAX_SAFE_INTEGER,
    monotonicTimestamp: 9999999,
    wallClockTimestamp: 1707753600000,
  };

  it("returns Err when input is null", () => {
    const result = deserializeOverflowTemporalContext(null);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("DeserializationError");
    }
  });

  it("returns Err when input is an array", () => {
    expect(deserializeOverflowTemporalContext([]).isErr()).toBe(true);
  });

  it("returns Err when input is a string", () => {
    expect(deserializeOverflowTemporalContext("not-an-object").isErr()).toBe(true);
  });

  it("returns Err when lastValidSequenceNumber is missing", () => {
    const result = deserializeOverflowTemporalContext({
      _tag: "OverflowTemporalContext",
      sequenceNumber: -1,
      monotonicTimestamp: 9999999,
      wallClockTimestamp: 1707753600000,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe("lastValidSequenceNumber");
    }
  });

  it("returns Err when monotonicTimestamp is missing", () => {
    const result = deserializeOverflowTemporalContext({
      _tag: "OverflowTemporalContext",
      sequenceNumber: -1,
      lastValidSequenceNumber: 100,
      wallClockTimestamp: 1707753600000,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe("monotonicTimestamp");
    }
  });

  it("returns Err when wallClockTimestamp is missing", () => {
    const result = deserializeOverflowTemporalContext({
      _tag: "OverflowTemporalContext",
      sequenceNumber: -1,
      lastValidSequenceNumber: 100,
      monotonicTimestamp: 9999999,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe("wallClockTimestamp");
    }
  });

  it("error.field identifies the failing field name", () => {
    const result = deserializeOverflowTemporalContext({
      _tag: "OverflowTemporalContext",
      sequenceNumber: -1,
      monotonicTimestamp: 9999999,
      wallClockTimestamp: 1707753600000,
      // lastValidSequenceNumber missing
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe("lastValidSequenceNumber");
    }
  });

  it("ok() result is frozen", () => {
    const result = deserializeOverflowTemporalContext(validOverflowRaw);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });

  it("ok() preserves lastValidSequenceNumber value", () => {
    const result = deserializeOverflowTemporalContext({
      ...validOverflowRaw,
      lastValidSequenceNumber: 12345,
    });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.lastValidSequenceNumber).toBe(12345);
    }
  });
});

describe("deserializeClockDiagnostics — additional coverage", () => {
  const validDiagRaw = {
    adapterName: "SystemClockAdapter",
    monotonicSource: "performance.now",
    highResSource: "performance.timeOrigin+now",
    platformResolutionMs: 0.001,
  };

  it("returns Err when input is not an object (null, string, array)", () => {
    expect(deserializeClockDiagnostics(null).isErr()).toBe(true);
    expect(deserializeClockDiagnostics("string").isErr()).toBe(true);
    expect(deserializeClockDiagnostics([]).isErr()).toBe(true);
  });

  it("returns Err when adapterName is missing", () => {
    const result = deserializeClockDiagnostics({
      monotonicSource: "performance.now",
      highResSource: "performance.timeOrigin+now",
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe("adapterName");
    }
  });

  it("returns Err when highResSource is invalid", () => {
    const result = deserializeClockDiagnostics({
      ...validDiagRaw,
      highResSource: "invalid-source",
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBe("highResSource");
    }
  });

  it("accepts each valid monotonicSource value", () => {
    const validSources = ["performance.now", "Date.now-clamped", "host-bridge"] as const;
    for (const source of validSources) {
      const result = deserializeClockDiagnostics({ ...validDiagRaw, monotonicSource: source });
      expect(result.isOk()).toBe(true);
    }
  });

  it("accepts each valid highResSource value", () => {
    const validSources = [
      "performance.timeOrigin+now",
      "Date.now",
      "host-bridge",
      "host-bridge-wallclock",
    ] as const;
    for (const source of validSources) {
      const result = deserializeClockDiagnostics({ ...validDiagRaw, highResSource: source });
      expect(result.isOk()).toBe(true);
    }
  });

  it("platformResolutionMs = null → result field is undefined", () => {
    const result = deserializeClockDiagnostics({ ...validDiagRaw, platformResolutionMs: null });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.platformResolutionMs).toBeUndefined();
    }
  });

  it("platformResolutionMs = undefined → result field is undefined", () => {
    const result = deserializeClockDiagnostics({ ...validDiagRaw, platformResolutionMs: undefined });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.platformResolutionMs).toBeUndefined();
    }
  });

  it("platformResolutionMs = string → result field is undefined (wrong type)", () => {
    const result = deserializeClockDiagnostics({ ...validDiagRaw, platformResolutionMs: "0.001" });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.platformResolutionMs).toBeUndefined();
    }
  });

  it("platformResolutionMs = 0.001 → result field is 0.001", () => {
    const result = deserializeClockDiagnostics({ ...validDiagRaw, platformResolutionMs: 0.001 });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.platformResolutionMs).toBe(0.001);
    }
  });

  it("cryptoFipsMode = null → result field is undefined", () => {
    const result = deserializeClockDiagnostics({ ...validDiagRaw, cryptoFipsMode: null });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.cryptoFipsMode).toBeUndefined();
    }
  });

  it("cryptoFipsMode = false → result field is false", () => {
    const result = deserializeClockDiagnostics({ ...validDiagRaw, cryptoFipsMode: false });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.cryptoFipsMode).toBe(false);
    }
  });

  it("cryptoFipsMode = string → result field is undefined (wrong type)", () => {
    const result = deserializeClockDiagnostics({ ...validDiagRaw, cryptoFipsMode: "yes" });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.cryptoFipsMode).toBeUndefined();
    }
  });

  it("ok() result is frozen", () => {
    const result = deserializeClockDiagnostics(validDiagRaw);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });
});

describe("DeserializationError", () => {
  it("has correct _tag 'DeserializationError'", () => {
    const error = createDeserializationError({
      schemaType: "TemporalContext",
      expectedVersions: [1],
      message: "test error",
    });
    expect(error._tag).toBe("DeserializationError");
  });

  it("is frozen at construction", () => {
    const error = createDeserializationError({
      schemaType: "TemporalContext",
      expectedVersions: [1],
      message: "test error",
    });
    expect(Object.isFrozen(error)).toBe(true);
  });
});

// =============================================================================
// Exact error field assertions — kill StringLiteral/ArrayDeclaration mutants
// =============================================================================

describe("deserializeTemporalContext — exact error field assertions", () => {
  it("non-object error has schemaType='TemporalContext', expectedVersions=[1], message, field=undefined", () => {
    const result = deserializeTemporalContext(null);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.schemaType).toBe("TemporalContext");
      expect(result.error.expectedVersions).toEqual([1]);
      expect(result.error.message).toBe("Expected an object");
      expect(result.error.field).toBeUndefined();
    }
  });

  it("array input has field=undefined (fails at isObject, not field check)", () => {
    const result = deserializeTemporalContext([1, 2, 3]);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.field).toBeUndefined();
      expect(result.error.schemaType).toBe("TemporalContext");
    }
  });

  it("missing sequenceNumber: field='sequenceNumber', message and schemaType correct", () => {
    const result = deserializeTemporalContext({
      monotonicTimestamp: 1000,
      wallClockTimestamp: 1707753600000,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.schemaType).toBe("TemporalContext");
      expect(result.error.expectedVersions).toEqual([1]);
      expect(result.error.field).toBe("sequenceNumber");
      expect(result.error.message).toBe("Field 'sequenceNumber' must be a number");
    }
  });

  it("missing monotonicTimestamp: field='monotonicTimestamp', message and schemaType correct", () => {
    const result = deserializeTemporalContext({
      sequenceNumber: 1,
      wallClockTimestamp: 1707753600000,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.schemaType).toBe("TemporalContext");
      expect(result.error.expectedVersions).toEqual([1]);
      expect(result.error.field).toBe("monotonicTimestamp");
      expect(result.error.message).toBe("Field 'monotonicTimestamp' must be a number");
    }
  });

  it("missing wallClockTimestamp: field='wallClockTimestamp', message and schemaType correct", () => {
    const result = deserializeTemporalContext({
      sequenceNumber: 1,
      monotonicTimestamp: 1000,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.schemaType).toBe("TemporalContext");
      expect(result.error.expectedVersions).toEqual([1]);
      expect(result.error.field).toBe("wallClockTimestamp");
      expect(result.error.message).toBe("Field 'wallClockTimestamp' must be a number");
    }
  });
});

describe("deserializeOverflowTemporalContext — exact error field assertions", () => {
  it("non-object error has schemaType='OverflowTemporalContext', expectedVersions=[1], no field", () => {
    const result = deserializeOverflowTemporalContext(null);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.schemaType).toBe("OverflowTemporalContext");
      expect(result.error.expectedVersions).toEqual([1]);
      expect(result.error.message).toBe("Expected an object");
      expect(result.error.field).toBeUndefined();
    }
  });

  it("wrong _tag: field='_tag', message correct", () => {
    const result = deserializeOverflowTemporalContext({
      _tag: "Wrong",
      sequenceNumber: -1,
      lastValidSequenceNumber: 100,
      monotonicTimestamp: 9999,
      wallClockTimestamp: 1707753600000,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.schemaType).toBe("OverflowTemporalContext");
      expect(result.error.expectedVersions).toEqual([1]);
      expect(result.error.field).toBe("_tag");
      expect(result.error.message).toBe("Field '_tag' must be 'OverflowTemporalContext'");
    }
  });

  it("sequenceNumber !== -1: field='sequenceNumber', message='Field 'sequenceNumber' must be -1'", () => {
    const result = deserializeOverflowTemporalContext({
      _tag: "OverflowTemporalContext",
      sequenceNumber: 0,
      lastValidSequenceNumber: 100,
      monotonicTimestamp: 9999,
      wallClockTimestamp: 1707753600000,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.schemaType).toBe("OverflowTemporalContext");
      expect(result.error.expectedVersions).toEqual([1]);
      expect(result.error.field).toBe("sequenceNumber");
      expect(result.error.message).toBe("Field 'sequenceNumber' must be -1");
    }
  });

  it("missing lastValidSequenceNumber: message correct", () => {
    const result = deserializeOverflowTemporalContext({
      _tag: "OverflowTemporalContext",
      sequenceNumber: -1,
      monotonicTimestamp: 9999,
      wallClockTimestamp: 1707753600000,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.schemaType).toBe("OverflowTemporalContext");
      expect(result.error.expectedVersions).toEqual([1]);
      expect(result.error.field).toBe("lastValidSequenceNumber");
      expect(result.error.message).toBe("Field 'lastValidSequenceNumber' must be a number");
    }
  });

  it("missing monotonicTimestamp (with lastValidSequenceNumber): message correct", () => {
    const result = deserializeOverflowTemporalContext({
      _tag: "OverflowTemporalContext",
      sequenceNumber: -1,
      lastValidSequenceNumber: 100,
      wallClockTimestamp: 1707753600000,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.schemaType).toBe("OverflowTemporalContext");
      expect(result.error.expectedVersions).toEqual([1]);
      expect(result.error.field).toBe("monotonicTimestamp");
      expect(result.error.message).toBe("Field 'monotonicTimestamp' must be a number");
    }
  });

  it("missing wallClockTimestamp (with all others): message correct", () => {
    const result = deserializeOverflowTemporalContext({
      _tag: "OverflowTemporalContext",
      sequenceNumber: -1,
      lastValidSequenceNumber: 100,
      monotonicTimestamp: 9999,
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.schemaType).toBe("OverflowTemporalContext");
      expect(result.error.expectedVersions).toEqual([1]);
      expect(result.error.field).toBe("wallClockTimestamp");
      expect(result.error.message).toBe("Field 'wallClockTimestamp' must be a number");
    }
  });
});

describe("deserializeClockDiagnostics — exact error field assertions", () => {
  it("non-object error has schemaType='ClockDiagnostics', no field, correct message", () => {
    const result = deserializeClockDiagnostics(null);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.schemaType).toBe("ClockDiagnostics");
      expect(result.error.expectedVersions).toEqual([1]);
      expect(result.error.message).toBe("Expected an object");
      expect(result.error.field).toBeUndefined();
    }
  });

  it("missing adapterName: schemaType='ClockDiagnostics', message correct", () => {
    const result = deserializeClockDiagnostics({
      monotonicSource: "performance.now",
      highResSource: "performance.timeOrigin+now",
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.schemaType).toBe("ClockDiagnostics");
      expect(result.error.expectedVersions).toEqual([1]);
      expect(result.error.field).toBe("adapterName");
      expect(result.error.message).toBe("Field 'adapterName' must be a string");
    }
  });

  it("invalid monotonicSource: field='monotonicSource', message contains valid values", () => {
    const result = deserializeClockDiagnostics({
      adapterName: "TestAdapter",
      monotonicSource: "bad-source",
      highResSource: "performance.timeOrigin+now",
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.schemaType).toBe("ClockDiagnostics");
      expect(result.error.expectedVersions).toEqual([1]);
      expect(result.error.field).toBe("monotonicSource");
      expect(result.error.message).toContain("monotonicSource");
    }
  });

  it("invalid highResSource: field='highResSource', message contains valid values", () => {
    const result = deserializeClockDiagnostics({
      adapterName: "TestAdapter",
      monotonicSource: "performance.now",
      highResSource: "bad-source",
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.schemaType).toBe("ClockDiagnostics");
      expect(result.error.expectedVersions).toEqual([1]);
      expect(result.error.field).toBe("highResSource");
      expect(result.error.message).toContain("highResSource");
    }
  });
});
