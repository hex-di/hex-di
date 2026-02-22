import { describe, it, expect } from "vitest";
import {
  serializeValue,
  serializeError,
  serializeLibraryInspectors,
  serializeResultStatistics,
  deserializeLibraryInspectors,
  deserializeResultStatistics,
} from "../../src/sandbox/worker-protocol.js";
import type {
  SerializedValue,
  SerializedError,
  SerializedLibraryInspectors,
  SerializedResultStatistics,
} from "../../src/sandbox/worker-protocol.js";
import type { LibraryInspector, ResultStatistics } from "@hex-di/core";

describe("serializeValue", () => {
  it("serializes null", () => {
    const result = serializeValue(null);
    expect(result).toEqual({ type: "null", value: "null" });
  });

  it("serializes undefined", () => {
    const result = serializeValue(undefined);
    expect(result).toEqual({ type: "undefined", value: "undefined" });
  });

  it("serializes string", () => {
    const result = serializeValue("hello");
    expect(result).toEqual({ type: "string", value: "hello" });
  });

  it("serializes number", () => {
    const result = serializeValue(42);
    expect(result).toEqual({ type: "number", value: "42" });
  });

  it("serializes boolean", () => {
    const result = serializeValue(true);
    expect(result).toEqual({ type: "boolean", value: "true" });
  });

  it("serializes symbol", () => {
    const result = serializeValue(Symbol("test"));
    expect(result).toEqual({ type: "symbol", value: "Symbol(test)" });
  });

  it("serializes function", () => {
    function myFunc() {
      return 1;
    }
    const result = serializeValue(myFunc);
    expect(result).toEqual({ type: "function", value: "[Function: myFunc]" });
  });

  it("serializes anonymous function", () => {
    const result = serializeValue(() => 1);
    expect(result.type).toBe("function");
    expect(result.value).toContain("[Function:");
  });

  it("serializes Error", () => {
    const err = new TypeError("bad input");
    const result = serializeValue(err);
    expect(result.type).toBe("error");
    expect(result.value).toBe("TypeError: bad input");
    expect(result.preview).toEqual(
      expect.objectContaining({
        name: "TypeError",
        message: "bad input",
      })
    );
  });

  it("serializes array with preview", () => {
    const result = serializeValue([1, 2, 3]);
    expect(result.type).toBe("array");
    expect(result.preview).toEqual([1, 2, 3]);
  });

  it("serializes object with preview", () => {
    const result = serializeValue({ a: 1, b: "two" });
    expect(result.type).toBe("object");
    expect(result.preview).toEqual({ a: 1, b: "two" });
  });
});

describe("serializeError", () => {
  it("serializes Error instance", () => {
    const err = new TypeError("something broke");
    err.stack = "TypeError: something broke\n    at test.ts:1:1";
    const result = serializeError(err);
    expect(result.name).toBe("TypeError");
    expect(result.message).toBe("something broke");
    expect(result.stack).toContain("TypeError: something broke");
  });

  it("serializes error-like object", () => {
    const errLike = { name: "CustomError", message: "custom failure", stack: "at line:1" };
    const result = serializeError(errLike);
    expect(result.name).toBe("CustomError");
    expect(result.message).toBe("custom failure");
    expect(result.stack).toBe("at line:1");
  });

  it("serializes non-object error as string", () => {
    const result = serializeError("string error");
    expect(result.name).toBe("Error");
    expect(result.message).toBe("string error");
    expect(result.stack).toBeUndefined();
  });

  it("serializes object without name/message gracefully", () => {
    const result = serializeError({ code: 42 });
    expect(result.name).toBe("Error");
    expect(result.message).toBe("[object Object]");
  });
});

describe("serializeLibraryInspectors", () => {
  it("serializes empty map", () => {
    const map = new Map<string, LibraryInspector>();
    const result = serializeLibraryInspectors(map);
    expect(result).toEqual([]);
  });

  it("serializes map with entries", () => {
    const map = new Map<string, LibraryInspector>([
      [
        "flow",
        {
          name: "flow",
          getSnapshot: () => ({ activities: 3 }),
        },
      ],
      [
        "store",
        {
          name: "store",
          getSnapshot: () => ({ stores: 2 }),
        },
      ],
    ]);
    const result = serializeLibraryInspectors(map);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(["flow", { name: "flow", snapshot: { activities: 3 } }]);
    expect(result[1]).toEqual(["store", { name: "store", snapshot: { stores: 2 } }]);
  });

  it("roundtrips through serialize/deserialize", () => {
    const original = new Map<string, LibraryInspector>([
      [
        "flow",
        {
          name: "flow",
          getSnapshot: () => ({ activities: 5, status: "running" }),
        },
      ],
    ]);

    const serialized = serializeLibraryInspectors(original);
    const deserialized = deserializeLibraryInspectors(serialized);

    expect(deserialized.size).toBe(1);
    const flowInspector = deserialized.get("flow");
    expect(flowInspector).toBeDefined();
    expect(flowInspector?.name).toBe("flow");
    expect(flowInspector?.getSnapshot()).toEqual({ activities: 5, status: "running" });
  });
});

describe("serializeResultStatistics", () => {
  it("serializes empty map", () => {
    const map = new Map<string, ResultStatistics>();
    const result = serializeResultStatistics(map);
    expect(result).toEqual([]);
  });

  it("serializes map with entries", () => {
    const stats: ResultStatistics = {
      portName: "MyPort",
      totalCalls: 10,
      okCount: 8,
      errCount: 2,
      errorRate: 0.2,
      errorsByCode: new Map([["E001", 2]]),
    };
    const map = new Map<string, ResultStatistics>([["MyPort", stats]]);
    const result = serializeResultStatistics(map);
    expect(result).toHaveLength(1);
    expect(result[0][0]).toBe("MyPort");
    expect(result[0][1].portName).toBe("MyPort");
    expect(result[0][1].totalCalls).toBe(10);
  });

  it("roundtrips through serialize/deserialize", () => {
    const stats: ResultStatistics = {
      portName: "TestPort",
      totalCalls: 5,
      okCount: 4,
      errCount: 1,
      errorRate: 0.2,
      errorsByCode: new Map([["ERR_FACTORY", 1]]),
    };
    const original = new Map<string, ResultStatistics>([["TestPort", stats]]);

    const serialized = serializeResultStatistics(original);
    const deserialized = deserializeResultStatistics(serialized);

    expect(deserialized.size).toBe(1);
    const testStats = deserialized.get("TestPort");
    expect(testStats).toBeDefined();
    expect(testStats?.portName).toBe("TestPort");
    expect(testStats?.totalCalls).toBe(5);
    expect(testStats?.okCount).toBe(4);
    expect(testStats?.errCount).toBe(1);
  });

  it("roundtrips errorsByCode Map through serialize/deserialize", () => {
    const stats: ResultStatistics = {
      portName: "Port",
      totalCalls: 10,
      okCount: 7,
      errCount: 3,
      errorRate: 0.3,
      errorsByCode: new Map([
        ["FACTORY_FAILED", 2],
        ["TIMEOUT", 1],
      ]),
    };
    const original = new Map<string, ResultStatistics>([["Port", stats]]);

    const serialized = serializeResultStatistics(original);
    const deserialized = deserializeResultStatistics(serialized);

    const roundtripped = deserialized.get("Port");
    expect(roundtripped).toBeDefined();
    expect(roundtripped!.errorsByCode).toBeInstanceOf(Map);
    expect(roundtripped!.errorsByCode.size).toBe(2);
    expect(roundtripped!.errorsByCode.get("FACTORY_FAILED")).toBe(2);
    expect(roundtripped!.errorsByCode.get("TIMEOUT")).toBe(1);
  });

  it("serializeResultStatistics converts errorsByCode Map to array", () => {
    const stats: ResultStatistics = {
      portName: "Port",
      totalCalls: 1,
      okCount: 0,
      errCount: 1,
      errorRate: 1,
      errorsByCode: new Map([["E1", 1]]),
    };
    const original = new Map<string, ResultStatistics>([["Port", stats]]);

    const serialized = serializeResultStatistics(original);
    // After serialization, errorsByCode should be an array (for structured clone)
    const raw = serialized[0][1].errorsByCode;
    expect(Array.isArray(raw)).toBe(true);
  });
});

describe("deserializeLibraryInspectors", () => {
  it("returns a ReadonlyMap", () => {
    const data: SerializedLibraryInspectors = [["test", { name: "test", snapshot: { count: 1 } }]];
    const result = deserializeLibraryInspectors(data);
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(1);
  });

  it("creates functional LibraryInspector objects", () => {
    const data: SerializedLibraryInspectors = [
      ["flow", { name: "flow", snapshot: { running: true } }],
    ];
    const result = deserializeLibraryInspectors(data);
    const inspector = result.get("flow");
    expect(inspector?.name).toBe("flow");
    expect(inspector?.getSnapshot()).toEqual({ running: true });
  });
});

describe("deserializeResultStatistics", () => {
  it("returns a ReadonlyMap", () => {
    const stats: ResultStatistics = {
      portName: "A",
      totalCalls: 1,
      okCount: 1,
      errCount: 0,
      errorRate: 0,
      errorsByCode: new Map(),
    };
    const data: SerializedResultStatistics = [["A", stats]];
    const result = deserializeResultStatistics(data);
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(1);
    expect(result.get("A")?.portName).toBe("A");
  });

  it("reconstructs errorsByCode from array format", () => {
    // Simulate what arrives after structured clone: errorsByCode is a plain array
    const data: SerializedResultStatistics = [
      [
        "Port",
        {
          portName: "Port",
          totalCalls: 3,
          okCount: 1,
          errCount: 2,
          errorRate: 0.67,
          errorsByCode: [
            ["ERR_1", 1],
            ["ERR_2", 1],
          ] as unknown as ReadonlyMap<string, number>,
        },
      ],
    ];
    const result = deserializeResultStatistics(data);
    const stats = result.get("Port");
    expect(stats).toBeDefined();
    expect(stats!.errorsByCode).toBeInstanceOf(Map);
    expect(stats!.errorsByCode.get("ERR_1")).toBe(1);
    expect(stats!.errorsByCode.get("ERR_2")).toBe(1);
  });
});
