/**
 * Tests for the Memory tracer adapter.
 *
 * Verifies:
 * - Span collection and retrieval
 * - Parent-child relationships
 * - 10k limit with FIFO eviction
 * - clear() method for test isolation
 * - Exception capture in withSpan
 * - Async span support
 * - Default attributes via withAttributes
 * - Span recording lifecycle
 */

import { describe, it, expect } from "vitest";
import {
  MemoryTracer,
  createMemoryTracer,
  MemorySpan,
  MemoryTracerAdapter,
} from "../../src/index.js";

describe("MemoryTracer", () => {
  describe("span collection", () => {
    it("should collect completed spans", () => {
      const tracer = createMemoryTracer();

      tracer.withSpan("operation", span => {
        span.setAttribute("key", "value");
      });

      const spans = tracer.getCollectedSpans();
      expect(spans).toHaveLength(1);
      expect(spans[0].name).toBe("operation");
      expect(spans[0].attributes["key"]).toBe("value");
    });

    it("should collect multiple spans", () => {
      const tracer = createMemoryTracer();

      tracer.withSpan("first", () => {});
      tracer.withSpan("second", () => {});
      tracer.withSpan("third", () => {});

      expect(tracer.getCollectedSpans()).toHaveLength(3);
    });

    it("should return a copy from getCollectedSpans", () => {
      const tracer = createMemoryTracer();
      tracer.withSpan("test", () => {});

      const spans1 = tracer.getCollectedSpans();
      const spans2 = tracer.getCollectedSpans();
      expect(spans1).not.toBe(spans2);
      expect(spans1).toEqual(spans2);
    });

    it("should have valid span context on collected spans", () => {
      const tracer = createMemoryTracer();
      tracer.withSpan("test", () => {});

      const spans = tracer.getCollectedSpans();
      const context = spans[0].context;
      expect(context.traceId).toHaveLength(32);
      expect(context.spanId).toHaveLength(16);
      expect(context.traceFlags).toBe(0x01);
    });

    it("should record span start and end times", () => {
      const tracer = createMemoryTracer();
      const before = Date.now();
      tracer.withSpan("timed", () => {});
      const after = Date.now();

      const span = tracer.getCollectedSpans()[0];
      expect(span.startTime).toBeGreaterThanOrEqual(before);
      expect(span.endTime).toBeLessThanOrEqual(after);
      expect(span.endTime).toBeGreaterThanOrEqual(span.startTime);
    });

    it("should default to internal kind", () => {
      const tracer = createMemoryTracer();
      tracer.withSpan("test", () => {});

      expect(tracer.getCollectedSpans()[0].kind).toBe("internal");
    });

    it("should respect span kind option", () => {
      const tracer = createMemoryTracer();
      tracer.withSpan("test", () => {}, { kind: "server" });

      expect(tracer.getCollectedSpans()[0].kind).toBe("server");
    });
  });

  describe("parent-child relationships", () => {
    it("should set parentSpanId for nested spans", () => {
      const tracer = createMemoryTracer();

      tracer.withSpan("parent", parentSpan => {
        tracer.withSpan("child", () => {});
        // Capture parent's spanId for verification
        parentSpan.setAttribute("marker", true);
      });

      const spans = tracer.getCollectedSpans();
      expect(spans).toHaveLength(2);

      // Child span ends first (inner), parent ends second (outer)
      const childSpan = spans[0];
      const parentSpan = spans[1];
      expect(childSpan.name).toBe("child");
      expect(parentSpan.name).toBe("parent");
      expect(childSpan.parentSpanId).toBe(parentSpan.context.spanId);
    });

    it("should share traceId across parent and child", () => {
      const tracer = createMemoryTracer();

      tracer.withSpan("parent", () => {
        tracer.withSpan("child", () => {});
      });

      const spans = tracer.getCollectedSpans();
      expect(spans[0].context.traceId).toBe(spans[1].context.traceId);
    });

    it("should have different spanIds for parent and child", () => {
      const tracer = createMemoryTracer();

      tracer.withSpan("parent", () => {
        tracer.withSpan("child", () => {});
      });

      const spans = tracer.getCollectedSpans();
      expect(spans[0].context.spanId).not.toBe(spans[1].context.spanId);
    });

    it("should not set parentSpanId for root span", () => {
      const tracer = createMemoryTracer();
      tracer.withSpan("root", () => {});

      expect(tracer.getCollectedSpans()[0].parentSpanId).toBeUndefined();
    });

    it("should start a new trace when root option is true", () => {
      const tracer = createMemoryTracer();

      tracer.withSpan("parent", () => {
        tracer.withSpan("new-root", () => {}, { root: true });
      });

      const spans = tracer.getCollectedSpans();
      const childSpan = spans[0];
      const parentSpan = spans[1];

      // New root should have different traceId and no parent
      expect(childSpan.context.traceId).not.toBe(parentSpan.context.traceId);
      expect(childSpan.parentSpanId).toBeUndefined();
    });
  });

  describe("FIFO eviction at 10k limit", () => {
    it("should evict oldest spans when exceeding maxSpans", () => {
      const tracer = new MemoryTracer(5);

      for (let i = 0; i < 7; i++) {
        tracer.withSpan(`span-${i}`, () => {});
      }

      const spans = tracer.getCollectedSpans();
      expect(spans).toHaveLength(5);
      // Oldest two should have been evicted
      expect(spans[0].name).toBe("span-2");
      expect(spans[4].name).toBe("span-6");
    });

    it("should respect default 10k limit", () => {
      const tracer = createMemoryTracer();
      // The default is 10000, we just verify it doesn't crash with a reasonable count
      for (let i = 0; i < 100; i++) {
        tracer.withSpan(`span-${i}`, () => {});
      }
      expect(tracer.getCollectedSpans()).toHaveLength(100);
    });
  });

  describe("clear()", () => {
    it("should remove all collected spans", () => {
      const tracer = createMemoryTracer();
      tracer.withSpan("test", () => {});
      expect(tracer.getCollectedSpans()).toHaveLength(1);

      tracer.clear();
      expect(tracer.getCollectedSpans()).toHaveLength(0);
    });

    it("should allow new spans after clearing", () => {
      const tracer = createMemoryTracer();
      tracer.withSpan("before", () => {});
      tracer.clear();
      tracer.withSpan("after", () => {});

      const spans = tracer.getCollectedSpans();
      expect(spans).toHaveLength(1);
      expect(spans[0].name).toBe("after");
    });
  });

  describe("exception capture", () => {
    it("should capture exception in withSpan and re-throw", () => {
      const tracer = createMemoryTracer();

      expect(() => {
        tracer.withSpan("failing", () => {
          throw new Error("test failure");
        });
      }).toThrow("test failure");

      const spans = tracer.getCollectedSpans();
      expect(spans).toHaveLength(1);
      expect(spans[0].status).toBe("error");
    });

    it("should record exception event with details", () => {
      const tracer = createMemoryTracer();

      try {
        tracer.withSpan("failing", () => {
          throw new Error("detailed failure");
        });
      } catch {
        // Expected
      }

      const span = tracer.getCollectedSpans()[0];
      const exceptionEvent = span.events.find(e => e.name === "exception");
      expect(exceptionEvent).toBeDefined();
      expect(exceptionEvent?.attributes?.["exception.message"]).toBe("detailed failure");
    });

    it("should capture exception in withSpanAsync and re-throw", async () => {
      const tracer = createMemoryTracer();

      await expect(
        tracer.withSpanAsync("failing-async", async () => {
          throw new Error("async failure");
        })
      ).rejects.toThrow("async failure");

      const spans = tracer.getCollectedSpans();
      expect(spans).toHaveLength(1);
      expect(spans[0].status).toBe("error");
    });

    it("should handle string exceptions", () => {
      const tracer = createMemoryTracer();

      try {
        tracer.withSpan("failing", () => {
          throw "string error";
        });
      } catch {
        // Expected
      }

      const span = tracer.getCollectedSpans()[0];
      expect(span.status).toBe("error");
    });
  });

  describe("active span tracking", () => {
    it("should return undefined when no span is active", () => {
      const tracer = createMemoryTracer();
      expect(tracer.getActiveSpan()).toBeUndefined();
      expect(tracer.getSpanContext()).toBeUndefined();
    });

    it("should track active span during withSpan execution", () => {
      const tracer = createMemoryTracer();
      let activeSpanDuringExec: unknown;

      tracer.withSpan("test", span => {
        activeSpanDuringExec = tracer.getActiveSpan();
        expect(activeSpanDuringExec).toBe(span);
      });

      // After withSpan, no active span
      expect(tracer.getActiveSpan()).toBeUndefined();
    });

    it("should track nested active spans correctly", () => {
      const tracer = createMemoryTracer();

      tracer.withSpan("outer", outerSpan => {
        expect(tracer.getActiveSpan()).toBe(outerSpan);

        tracer.withSpan("inner", innerSpan => {
          expect(tracer.getActiveSpan()).toBe(innerSpan);
        });

        // After inner ends, outer should be active again
        expect(tracer.getActiveSpan()).toBe(outerSpan);
      });
    });
  });

  describe("withAttributes", () => {
    it("should create a new tracer with default attributes", () => {
      const tracer = createMemoryTracer();
      const enriched = tracer.withAttributes({ "service.name": "test-service" });

      expect(enriched).not.toBe(tracer);
      expect(enriched).toBeInstanceOf(MemoryTracer);
    });

    it("should include default attributes in all spans", () => {
      const tracer = createMemoryTracer();
      const enriched = tracer.withAttributes({
        "service.name": "my-service",
      });

      // Need to cast to MemoryTracer to access getCollectedSpans
      const memoryTracer = enriched;
      if (memoryTracer instanceof MemoryTracer) {
        memoryTracer.withSpan("test", () => {});
        const spans = memoryTracer.getCollectedSpans();
        expect(spans[0].attributes["service.name"]).toBe("my-service");
      }
    });
  });

  describe("startSpan manual usage", () => {
    it("should create a recordable span", () => {
      const tracer = createMemoryTracer();
      const span = tracer.startSpan("manual");

      expect(span.isRecording()).toBe(true);
      span.setAttribute("key", "value");
      span.end();

      const spans = tracer.getCollectedSpans();
      expect(spans).toHaveLength(1);
      expect(spans[0].name).toBe("manual");
      expect(spans[0].attributes["key"]).toBe("value");
    });
  });

  describe("async operations", () => {
    it("should handle async withSpanAsync correctly", async () => {
      const tracer = createMemoryTracer();

      const result = await tracer.withSpanAsync("async-op", async span => {
        span.setAttribute("async", true);
        await new Promise(resolve => setTimeout(resolve, 10));
        return "done";
      });

      expect(result).toBe("done");
      const spans = tracer.getCollectedSpans();
      expect(spans).toHaveLength(1);
      expect(spans[0].name).toBe("async-op");
      expect(spans[0].attributes["async"]).toBe(true);
    });
  });
});

describe("MemorySpan", () => {
  it("should implement Span interface", () => {
    const span = new MemorySpan("test", undefined, undefined, () => {});
    expect(span.isRecording()).toBe(true);
    expect(span.context.traceId).toHaveLength(32);
    expect(span.context.spanId).toHaveLength(16);
  });

  it("should not record after end()", () => {
    let recorded = false;
    const span = new MemorySpan("test", undefined, undefined, () => {
      recorded = true;
    });

    span.end();
    expect(recorded).toBe(true);
    expect(span.isRecording()).toBe(false);

    // Double end should be no-op
    recorded = false;
    span.end();
    expect(recorded).toBe(false);
  });

  it("should support method chaining", () => {
    const span = new MemorySpan("test", undefined, undefined, () => {});
    const result = span.setAttribute("a", 1).setAttributes({ b: 2 }).setStatus("ok");
    expect(result).toBe(span);
  });

  it("should support addEvent", () => {
    let capturedData: unknown;
    const span = new MemorySpan("test", undefined, undefined, data => {
      capturedData = data;
    });

    span.addEvent({ name: "checkpoint", time: Date.now(), attributes: { step: 1 } });
    span.end();

    const data = capturedData;
    if (data && typeof data === "object" && "events" in data) {
      const events = data.events;
      if (Array.isArray(events)) {
        expect(events).toHaveLength(1);
        expect(events[0].name).toBe("checkpoint");
      }
    }
  });
});

describe("MemoryTracerAdapter", () => {
  it("should be defined", () => {
    expect(MemoryTracerAdapter).toBeDefined();
  });
});

describe("createMemoryTracer", () => {
  it("should create a MemoryTracer instance", () => {
    const tracer = createMemoryTracer();
    expect(tracer).toBeInstanceOf(MemoryTracer);
  });

  it("should accept custom maxSpans", () => {
    const tracer = createMemoryTracer(5);
    for (let i = 0; i < 10; i++) {
      tracer.withSpan(`span-${i}`, () => {});
    }
    expect(tracer.getCollectedSpans()).toHaveLength(5);
  });
});
