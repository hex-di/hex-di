/**
 * Tests for unified adapter validation, edge cases, and async detection.
 *
 * Covers assertValidAdapterConfig() error paths, async factory detection,
 * class-based adapter injection, and all validation error codes.
 */

import { describe, it, expect, vi } from "vitest";
import { port, createAdapter } from "../src/index.js";
import { ResultAsync } from "@hex-di/result";

// =============================================================================
// Test Ports
// =============================================================================

interface Logger {
  log(msg: string): void;
}

interface Database {
  query(sql: string): unknown[];
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });

// =============================================================================
// Validation Error: Missing provides (HEX010)
// =============================================================================

describe("createAdapter validation - missing provides", () => {
  it("throws HEX010 when provides is null", () => {
    expect(() => {
      createAdapter({
        provides: null as any,
        factory: () => ({ log: vi.fn() }),
      });
    }).toThrow(/HEX010/);
  });

  it("throws HEX010 when provides is undefined", () => {
    expect(() => {
      createAdapter({
        provides: undefined as any,
        factory: () => ({ log: vi.fn() }),
      });
    }).toThrow(/HEX010/);
  });
});

// =============================================================================
// Validation Error: Invalid provides (HEX011)
// =============================================================================

describe("createAdapter validation - invalid provides", () => {
  it("throws HEX011 when provides is a string (not a Port)", () => {
    expect(() => {
      createAdapter({
        provides: "Logger" as any,
        factory: () => ({ log: vi.fn() }),
      });
    }).toThrow(/HEX011/);
  });

  it("throws HEX011 when provides is a number", () => {
    expect(() => {
      createAdapter({
        provides: 42 as any,
        factory: () => ({ log: vi.fn() }),
      });
    }).toThrow(/HEX011/);
  });

  it("throws HEX011 when provides is an object without __portName", () => {
    expect(() => {
      createAdapter({
        provides: { name: "Logger" } as any,
        factory: () => ({ log: vi.fn() }),
      });
    }).toThrow(/HEX011/);
  });
});

// =============================================================================
// Validation Error: Invalid requires type (HEX012)
// =============================================================================

describe("createAdapter validation - invalid requires type", () => {
  it("throws HEX012 when requires is not an array (object)", () => {
    expect(() => {
      createAdapter({
        provides: LoggerPort,
        requires: {} as any,
        factory: () => ({ log: vi.fn() }),
      });
    }).toThrow(/HEX012/);
  });

  it("throws HEX012 when requires is a string", () => {
    expect(() => {
      createAdapter({
        provides: LoggerPort,
        requires: "Logger" as any,
        factory: () => ({ log: vi.fn() }),
      });
    }).toThrow(/HEX012/);
  });
});

// =============================================================================
// Validation Error: Invalid requires element (HEX013)
// =============================================================================

describe("createAdapter validation - invalid requires element", () => {
  it("throws HEX013 when requires contains a non-port object", () => {
    expect(() => {
      createAdapter({
        provides: LoggerPort,
        requires: [{ notAPort: true }] as any,
        factory: () => ({ log: vi.fn() }),
      });
    }).toThrow(/HEX013/);
  });

  it("throws HEX013 when requires contains null", () => {
    expect(() => {
      createAdapter({
        provides: LoggerPort,
        requires: [null] as any,
        factory: () => ({ log: vi.fn() }),
      });
    }).toThrow(/HEX013/);
  });

  it("throws HEX013 with correct index for invalid element", () => {
    expect(() => {
      createAdapter({
        provides: LoggerPort,
        requires: [DatabasePort, "invalid"] as any,
        factory: () => ({ log: vi.fn() }),
      });
    }).toThrow(/requires\[1\]/);
  });
});

// =============================================================================
// Validation Error: Invalid lifetime type (HEX014)
// =============================================================================

describe("createAdapter validation - invalid lifetime type", () => {
  it("throws HEX014 when lifetime is a number", () => {
    expect(() => {
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: 42 as any,
        factory: () => ({ log: vi.fn() }),
      });
    }).toThrow(/HEX014/);
  });

  it("throws HEX014 when lifetime is a boolean", () => {
    expect(() => {
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: true as any,
        factory: () => ({ log: vi.fn() }),
      });
    }).toThrow(/HEX014/);
  });
});

// =============================================================================
// Validation Error: Invalid lifetime value (HEX015)
// =============================================================================

describe("createAdapter validation - invalid lifetime value", () => {
  it("throws HEX015 when lifetime is an invalid string", () => {
    expect(() => {
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "request" as any,
        factory: () => ({ log: vi.fn() }),
      });
    }).toThrow(/HEX015/);
  });

  it("throws HEX015 when lifetime is an empty string", () => {
    expect(() => {
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "" as any,
        factory: () => ({ log: vi.fn() }),
      });
    }).toThrow(/HEX015/);
  });
});

// =============================================================================
// Validation Error: Invalid factory (HEX016)
// =============================================================================

describe("createAdapter validation - invalid factory", () => {
  it("throws HEX016 when factory is a string", () => {
    expect(() => {
      createAdapter({
        provides: LoggerPort,
        factory: "not a function" as any,
      });
    }).toThrow(/HEX016/);
  });

  it("throws HEX016 when factory is a number", () => {
    expect(() => {
      createAdapter({
        provides: LoggerPort,
        factory: 42 as any,
      });
    }).toThrow(/HEX016/);
  });

  it("throws when factory is null (validation catches it)", () => {
    expect(() => {
      createAdapter({
        provides: LoggerPort,
        factory: null as any,
      });
    }).toThrow();
  });
});

// =============================================================================
// Validation Error: Duplicate requires (HEX017)
// =============================================================================

describe("createAdapter validation - duplicate requires", () => {
  it("throws HEX017 when requires has duplicate ports", () => {
    expect(() => {
      createAdapter({
        provides: port<Logger>()({ name: "Service" }),
        requires: [LoggerPort, LoggerPort] as any,
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
    }).toThrow(/HEX017/);
  });

  it("error message includes duplicated port name", () => {
    expect(() => {
      createAdapter({
        provides: port<Logger>()({ name: "Service" }),
        requires: [LoggerPort, LoggerPort] as any,
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
    }).toThrow(/Logger/);
  });
});

// =============================================================================
// Validation Error: Self-dependency (HEX006)
// =============================================================================

describe("createAdapter validation - self-dependency", () => {
  it("throws HEX006 when adapter requires its own port", () => {
    expect(() => {
      createAdapter({
        provides: LoggerPort,
        requires: [LoggerPort] as any,
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      });
    }).toThrow(/HEX006/);
  });
});

// =============================================================================
// Validation Error: Invalid finalizer (HEX018)
// =============================================================================

describe("createAdapter validation - invalid finalizer", () => {
  it("throws when finalizer is a string", () => {
    expect(() => {
      createAdapter({
        provides: LoggerPort,
        factory: () => ({ log: vi.fn() }),
        finalizer: "not a function" as any,
      });
    }).toThrow(/HEX018/);
  });

  it("throws when finalizer is a number", () => {
    expect(() => {
      createAdapter({
        provides: LoggerPort,
        factory: () => ({ log: vi.fn() }),
        finalizer: 42 as any,
      });
    }).toThrow(/HEX018/);
  });
});

// =============================================================================
// Mutual Exclusion: factory + class (HEX020)
// =============================================================================

describe("createAdapter - mutual exclusion", () => {
  it("throws HEX020 when both factory and class are provided", () => {
    class ConsoleLogger implements Logger {
      log() {}
    }
    expect(() => {
      createAdapter({
        provides: LoggerPort,
        factory: () => ({ log: vi.fn() }),
        class: ConsoleLogger,
      } as any);
    }).toThrow(/HEX020/);
  });

  it("throws HEX019 when neither factory nor class is provided", () => {
    expect(() => {
      createAdapter({
        provides: LoggerPort,
      } as any);
    }).toThrow(/HEX019/);
  });
});

// =============================================================================
// Async factory detection
// =============================================================================

describe("createAdapter - async factory detection", () => {
  it("ResultAsync-returning factory is detected as sync at runtime", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () => ResultAsync.ok({ log: vi.fn() }),
    });
    // ResultAsync-returning factories are sync at runtime (no async keyword)
    expect(adapter.factoryKind).toBe("sync");
  });

  it("ResultAsync-returning factory compiles only with singleton lifetime", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () => ResultAsync.ok({ log: vi.fn() }),
    });
    // factoryKind is "sync" at runtime (no async keyword)
    expect(adapter.factoryKind).toBe("sync");
    // Default lifetime is singleton
    expect(adapter.lifetime).toBe("singleton");
  });

  it("sync factory returns 'sync' factoryKind", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: vi.fn() }),
    });
    expect(adapter.factoryKind).toBe("sync");
  });
});

// =============================================================================
// Adapter object immutability
// =============================================================================

describe("createAdapter - adapter object", () => {
  it("adapter is frozen (Object.isFrozen)", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: vi.fn() }),
    });
    expect(Object.isFrozen(adapter)).toBe(true);
  });

  it("adapter with finalizer is frozen", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: vi.fn() }),
      finalizer: vi.fn(),
    });
    expect(Object.isFrozen(adapter)).toBe(true);
  });

  it("adapter without finalizer does not have finalizer property", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: vi.fn() }),
    });
    expect("finalizer" in adapter).toBe(false);
  });
});

// =============================================================================
// Class-based adapter: constructor injection order
// =============================================================================

describe("createAdapter - class variant constructor injection", () => {
  it("extracts services in port order for constructor injection", () => {
    interface ServiceA {
      a(): string;
    }
    interface ServiceB {
      b(): string;
    }
    const PortA = port<ServiceA>()({ name: "A" });
    const PortB = port<ServiceB>()({ name: "B" });
    const OutputPort = port<{ result(): string }>()({ name: "Output" });

    class OutputImpl {
      constructor(
        public svcA: ServiceA,
        public svcB: ServiceB
      ) {}
      result() {
        return `${this.svcA.a()}-${this.svcB.b()}`;
      }
    }

    const adapter = createAdapter({
      provides: OutputPort,
      requires: [PortA, PortB],
      lifetime: "transient",
      class: OutputImpl,
    });

    const mockA = { a: () => "hello" };
    const mockB = { b: () => "world" };
    const instance = adapter.factory({ A: mockA, B: mockB }) as OutputImpl;

    expect(instance.svcA).toBe(mockA);
    expect(instance.svcB).toBe(mockB);
    expect(instance.result()).toBe("hello-world");
  });
});
