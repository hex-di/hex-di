import { describe, it, expect, vi, beforeEach } from "vitest";
import { SandboxExecutor, DEFAULT_TIMEOUT_MS } from "../../src/sandbox/executor.js";
import type { WorkerToMainMessage } from "../../src/sandbox/worker-protocol.js";

// =============================================================================
// Mock Worker
// =============================================================================

/**
 * Create a mock Worker that behaves like a real Web Worker.
 * The `handler` receives messages sent to the worker and can post back.
 *
 * The mock worker automatically sends a "worker-ready" message after
 * creation, simulating the real worker's async initialization completing.
 * This matches the protocol: the executor waits for "worker-ready"
 * before sending the "execute" command.
 */
function createMockWorkerFactory(
  handler: (msg: unknown, postBack: (data: WorkerToMainMessage) => void) => void,
  options?: { readonly skipReady?: boolean }
): () => Worker {
  return () => {
    const messageListeners: Array<(event: MessageEvent) => void> = [];
    const errorListeners: Array<(event: ErrorEvent) => void> = [];

    function postBack(data: WorkerToMainMessage): void {
      // Simulate async message delivery
      setTimeout(() => {
        for (const listener of messageListeners) {
          listener(new MessageEvent("message", { data }));
        }
      }, 0);
    }

    const worker: Worker = {
      postMessage(msg: unknown) {
        // Simulate the worker processing the message asynchronously
        setTimeout(() => handler(msg, postBack), 0);
      },
      terminate: vi.fn(),
      addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
        if (type === "message" && typeof listener === "function") {
          messageListeners.push(listener as (event: MessageEvent) => void);
        }
        if (type === "error" && typeof listener === "function") {
          errorListeners.push(listener as (event: ErrorEvent) => void);
        }
      },
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
      onmessage: null,
      onmessageerror: null,
      onerror: null,
    };

    // Simulate the worker signaling readiness after async init completes.
    // The real worker sends "worker-ready" after setupModuleRegistry() resolves
    // and the message handler is registered.
    if (options?.skipReady !== true) {
      setTimeout(() => {
        for (const listener of messageListeners) {
          listener(new MessageEvent("message", { data: { type: "worker-ready" } }));
        }
      }, 0);
    }

    return worker;
  };
}

describe("SandboxExecutor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("valid code executes and returns success", async () => {
    const factory = createMockWorkerFactory((msg, postBack) => {
      const message = msg as { type: string };
      if (message.type === "execute") {
        postBack({ type: "execution-complete", success: true });
      }
    });

    const executor = new SandboxExecutor("worker.js", factory);
    const resultPromise = executor.execute("console.log('hello');");
    await vi.advanceTimersByTimeAsync(10);

    const result = await resultPromise;
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("throwing code returns runtime error with message and stack", async () => {
    const factory = createMockWorkerFactory((msg, postBack) => {
      const message = msg as { type: string };
      if (message.type === "execute") {
        postBack({
          type: "execution-error",
          error: {
            name: "ReferenceError",
            message: "x is not defined",
            stack: "ReferenceError: x is not defined\n    at main.js:1:1",
          },
        });
      }
    });

    const executor = new SandboxExecutor("worker.js", factory);
    const resultPromise = executor.execute("x.foo()");
    await vi.advanceTimersByTimeAsync(10);

    const result = await resultPromise;
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    if (result.error && "name" in result.error) {
      expect(result.error.name).toBe("ReferenceError");
      expect(result.error.message).toBe("x is not defined");
      expect(result.error.stack).toContain("x is not defined");
    }
  });

  it("infinite loop terminated after timeout", async () => {
    // Worker sends ready but never responds to execute -- simulates infinite loop
    const factory = createMockWorkerFactory(() => {
      // Never responds to execute
    });

    const executor = new SandboxExecutor("worker.js", factory);
    const resultPromise = executor.execute("while(true){}", undefined, 100);

    // Advance past the timeout
    await vi.advanceTimersByTimeAsync(150);

    const result = await resultPromise;
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    if (result.error && "type" in result.error) {
      expect(result.error.type).toBe("timeout");
      expect(result.error.message).toContain("timed out");
    }
  });

  it("timeout when worker never sends ready signal", async () => {
    // Worker never sends worker-ready, so executor never sends execute.
    // This should trigger the timeout.
    const factory = createMockWorkerFactory(
      () => {
        // Handler is never called because execute is never sent
      },
      { skipReady: true }
    );

    const executor = new SandboxExecutor("worker.js", factory);
    const resultPromise = executor.execute("console.log('hi')", undefined, 100);

    // Advance past the timeout
    await vi.advanceTimersByTimeAsync(150);

    const result = await resultPromise;
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    if (result.error && "type" in result.error) {
      expect(result.error.type).toBe("timeout");
    }
  });

  it("console.log in sandbox appears as console entry", async () => {
    const factory = createMockWorkerFactory((msg, postBack) => {
      const message = msg as { type: string };
      if (message.type === "execute") {
        postBack({
          type: "console",
          level: "log",
          args: [{ type: "string", value: "hello world" }],
          timestamp: Date.now(),
        });
        postBack({ type: "execution-complete", success: true });
      }
    });

    const executor = new SandboxExecutor("worker.js", factory);
    const resultPromise = executor.execute('console.log("hello world");');
    await vi.advanceTimersByTimeAsync(10);

    const result = await resultPromise;
    expect(result.success).toBe(true);
    expect(result.consoleEntries).toHaveLength(1);
    expect(result.consoleEntries[0].type).toBe("log");
    if (result.consoleEntries[0].type === "log") {
      expect(result.consoleEntries[0].level).toBe("log");
      expect(result.consoleEntries[0].args[0].value).toBe("hello world");
    }
  });

  it("second execution does not see state from first", async () => {
    let executionCount = 0;
    const terminateFns: Array<ReturnType<typeof vi.fn>> = [];

    const factory = () => {
      executionCount++;
      const currentExecution = executionCount;
      const messageListeners: Array<(event: MessageEvent) => void> = [];
      const terminateFn = vi.fn();
      terminateFns.push(terminateFn);

      const worker: Worker = {
        postMessage(msg: unknown) {
          const message = msg as { type: string };
          if (message.type === "execute") {
            setTimeout(() => {
              for (const listener of messageListeners) {
                listener(
                  new MessageEvent("message", {
                    data: {
                      type: "console",
                      level: "log",
                      args: [{ type: "number", value: String(currentExecution) }],
                      timestamp: Date.now(),
                    },
                  })
                );
              }
              setTimeout(() => {
                for (const listener of messageListeners) {
                  listener(
                    new MessageEvent("message", {
                      data: { type: "execution-complete", success: true },
                    })
                  );
                }
              }, 0);
            }, 0);
          }
        },
        terminate: terminateFn,
        addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
          if (type === "message" && typeof listener === "function") {
            messageListeners.push(listener as (event: MessageEvent) => void);
          }
        },
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(() => true),
        onmessage: null,
        onmessageerror: null,
        onerror: null,
      };

      // Simulate worker-ready after creation
      setTimeout(() => {
        for (const listener of messageListeners) {
          listener(new MessageEvent("message", { data: { type: "worker-ready" } }));
        }
      }, 0);

      return worker;
    };

    const executor = new SandboxExecutor("worker.js", factory);

    // First execution
    const result1Promise = executor.execute("code1");
    await vi.advanceTimersByTimeAsync(10);
    const result1 = await result1Promise;
    expect(result1.consoleEntries[0]).toBeDefined();
    if (result1.consoleEntries[0].type === "log") {
      expect(result1.consoleEntries[0].args[0].value).toBe("1");
    }

    // Second execution - previous worker should be terminated
    const result2Promise = executor.execute("code2");
    await vi.advanceTimersByTimeAsync(10);
    const result2 = await result2Promise;

    // The first worker should have been terminated before the second one started
    expect(terminateFns[0]).toHaveBeenCalled();
    // Second execution has its own state
    expect(result2.consoleEntries[0]).toBeDefined();
    if (result2.consoleEntries[0].type === "log") {
      expect(result2.consoleEntries[0].args[0].value).toBe("2");
    }
  });

  it("terminate() kills running worker immediately", async () => {
    const terminateFn = vi.fn();
    const factory = () => {
      const worker: Worker = {
        postMessage: vi.fn(),
        terminate: terminateFn,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(() => true),
        onmessage: null,
        onmessageerror: null,
        onerror: null,
      };
      return worker;
    };

    const executor = new SandboxExecutor("worker.js", factory);
    // Start but don't await execution
    void executor.execute("while(true){}");
    await vi.advanceTimersByTimeAsync(0);

    expect(executor.isRunning).toBe(true);
    executor.terminate();
    expect(terminateFn).toHaveBeenCalled();
    expect(executor.isRunning).toBe(false);
  });

  it("does not send execute before worker-ready", async () => {
    const postMessageCalls: unknown[] = [];

    const factory = () => {
      const messageListeners: Array<(event: MessageEvent) => void> = [];

      const worker: Worker = {
        postMessage(msg: unknown) {
          postMessageCalls.push(msg);
          // The executor should NOT call postMessage until worker-ready
        },
        terminate: vi.fn(),
        addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
          if (type === "message" && typeof listener === "function") {
            messageListeners.push(listener as (event: MessageEvent) => void);
          }
        },
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(() => true),
        onmessage: null,
        onmessageerror: null,
        onerror: null,
      };

      // We do NOT send worker-ready. The executor should not call postMessage
      // on the worker (since it waits for ready).

      return worker;
    };

    const executor = new SandboxExecutor("worker.js", factory);
    void executor.execute("some code", undefined, 200);

    // Give some time for any erroneous postMessage to fire
    await vi.advanceTimersByTimeAsync(50);

    // The executor should NOT have posted any messages since worker-ready was never sent
    expect(postMessageCalls).toHaveLength(0);

    // Cleanup - advance past timeout to resolve the promise
    await vi.advanceTimersByTimeAsync(200);
  });
});

describe("DEFAULT_TIMEOUT_MS", () => {
  it("is 5000ms", () => {
    expect(DEFAULT_TIMEOUT_MS).toBe(5000);
  });
});
