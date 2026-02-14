import { describe, it, expect, vi } from "vitest";
import { SandboxManager } from "../../src/sandbox/sandbox-manager.js";
import type { SandboxState, CompileFn, Executor } from "../../src/sandbox/sandbox-manager.js";
import type { CompilationResult, WorkerToMainMessage } from "../../src/sandbox/worker-protocol.js";
import type { ExecutionResult, WorkerMessageHandler } from "../../src/sandbox/executor.js";

// =============================================================================
// Mock Factories
// =============================================================================

function createSuccessCompiler(code = "console.log('compiled');"): CompileFn {
  return vi.fn(async () => ({
    success: true,
    errors: [],
    code,
  }));
}

function createFailCompiler(): CompileFn {
  return vi.fn(async () => ({
    success: false,
    errors: [{ file: "main.ts", line: 1, column: 0, message: "Syntax error" }],
    code: undefined,
  }));
}

function createSuccessExecutor(): Executor {
  return {
    execute: vi.fn(async (_code: string, onMessage?: WorkerMessageHandler) => {
      // Simulate sending an inspector data message
      if (onMessage) {
        const inspectorMsg: WorkerToMainMessage = {
          type: "inspector-data",
          snapshot: {
            kind: "root",
            phase: "initialized",
            isInitialized: true,
            asyncAdaptersTotal: 0,
            asyncAdaptersInitialized: 0,
            singletons: [],
            scopes: {
              id: "root",
              status: "active",
              resolvedCount: 0,
              totalCount: 0,
              children: [],
              resolvedPorts: [],
            },
            isDisposed: false,
            containerName: "Test",
          },
          scopeTree: {
            id: "root",
            status: "active",
            resolvedCount: 0,
            totalCount: 0,
            children: [],
            resolvedPorts: [],
          },
          graphData: { adapters: [], containerName: "Test", kind: "root", parentName: null },
          unifiedSnapshot: {
            timestamp: Date.now(),
            container: {
              kind: "root",
              phase: "initialized",
              isInitialized: true,
              asyncAdaptersTotal: 0,
              asyncAdaptersInitialized: 0,
              singletons: [],
              scopes: {
                id: "root",
                status: "active",
                resolvedCount: 0,
                totalCount: 0,
                children: [],
                resolvedPorts: [],
              },
              isDisposed: false,
              containerName: "Test",
            },
            libraries: {},
            registeredLibraries: [],
          },
          adapterInfo: [],
          libraryInspectors: [],
          resultStatistics: [],
        };
        onMessage(inspectorMsg);
      }
      return {
        success: true,
        consoleEntries: [
          {
            type: "log" as const,
            level: "log" as const,
            args: [{ type: "string" as const, value: "hello" }],
            timestamp: Date.now(),
          },
        ],
        hasInspector: true,
      };
    }),
    terminate: vi.fn(),
  };
}

function createErrorExecutor(): Executor {
  return {
    execute: vi.fn(async () => ({
      success: false,
      consoleEntries: [],
      error: {
        name: "ReferenceError",
        message: "x is not defined",
        stack: "at main.js:1",
      },
      hasInspector: false,
    })),
    terminate: vi.fn(),
  };
}

function createTimeoutExecutor(): Executor {
  return {
    execute: vi.fn(async () => ({
      success: false,
      consoleEntries: [],
      error: {
        type: "timeout" as const,
        message: "Execution timed out after 5000ms",
      },
      hasInspector: false,
    })),
    terminate: vi.fn(),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("SandboxManager", () => {
  it("starts in idle state", () => {
    const manager = new SandboxManager(createSuccessCompiler(), createSuccessExecutor());
    expect(manager.state).toEqual({ phase: "idle" });
  });

  it("transitions through compiling -> executing -> complete on success", async () => {
    const compiler = createSuccessCompiler();
    const executor = createSuccessExecutor();
    const manager = new SandboxManager(compiler, executor);

    const stateHistory: SandboxState[] = [];
    manager.subscribe(state => stateHistory.push({ ...state }));

    const result = await manager.execute(new Map([["main.ts", "console.log(1);"]]), "main.ts");

    expect(result.success).toBe(true);
    expect(result.compilationMs).toBeGreaterThanOrEqual(0);
    expect(result.executionMs).toBeGreaterThanOrEqual(0);
    expect(result.consoleEntries.length).toBeGreaterThanOrEqual(1);

    // Check state transitions
    expect(stateHistory[0].phase).toBe("compiling");
    expect(stateHistory[1].phase).toBe("executing");
    expect(stateHistory[2].phase).toBe("complete");
  });

  it("transitions to error on compilation failure", async () => {
    const compiler = createFailCompiler();
    const executor = createSuccessExecutor();
    const manager = new SandboxManager(compiler, executor);

    const stateHistory: SandboxState[] = [];
    manager.subscribe(state => stateHistory.push({ ...state }));

    const result = await manager.execute(new Map([["main.ts", "broken"]]));

    expect(result.success).toBe(false);
    expect(result.consoleEntries.some(e => e.type === "compilation-error")).toBe(true);

    // Executor should NOT have been called
    expect(executor.execute).not.toHaveBeenCalled();

    // State: compiling -> error
    expect(stateHistory[0].phase).toBe("compiling");
    expect(stateHistory[1].phase).toBe("error");
    if (stateHistory[1].phase === "error") {
      expect(stateHistory[1].error.type).toBe("compilation");
    }
  });

  it("transitions to error on runtime error", async () => {
    const compiler = createSuccessCompiler();
    const executor = createErrorExecutor();
    const manager = new SandboxManager(compiler, executor);

    const stateHistory: SandboxState[] = [];
    manager.subscribe(state => stateHistory.push({ ...state }));

    const result = await manager.execute(new Map([["main.ts", "x.foo();"]]));

    expect(result.success).toBe(false);
    expect(result.consoleEntries.some(e => e.type === "runtime-error")).toBe(true);

    // State: compiling -> executing -> error
    expect(stateHistory[0].phase).toBe("compiling");
    expect(stateHistory[1].phase).toBe("executing");
    expect(stateHistory[2].phase).toBe("error");
    if (stateHistory[2].phase === "error") {
      expect(stateHistory[2].error.type).toBe("runtime");
    }
  });

  it("transitions to error on timeout", async () => {
    const compiler = createSuccessCompiler();
    const executor = createTimeoutExecutor();
    const manager = new SandboxManager(compiler, executor);

    const result = await manager.execute(new Map([["main.ts", "while(true){}"]]));

    expect(result.success).toBe(false);
    expect(result.consoleEntries.some(e => e.type === "timeout")).toBe(true);
    expect(manager.state.phase).toBe("error");
    if (manager.state.phase === "error") {
      expect(manager.state.error.type).toBe("timeout");
    }
  });

  it("resets bridge on new execution", async () => {
    const compiler = createSuccessCompiler();
    const executor = createSuccessExecutor();
    const manager = new SandboxManager(compiler, executor);

    await manager.execute(new Map([["main.ts", "code"]]));

    // Bridge should have received inspector data
    expect(manager.bridge.getSnapshot()).toBeDefined();

    // Execute again - bridge should be reset before new data arrives
    const resetSpy = vi.spyOn(manager.bridge, "reset");
    await manager.execute(new Map([["main.ts", "code2"]]));
    expect(resetSpy).toHaveBeenCalled();
  });

  it("forwards worker messages to bridge", async () => {
    const compiler = createSuccessCompiler();
    const executor = createSuccessExecutor();
    const manager = new SandboxManager(compiler, executor);

    await manager.execute(new Map([["main.ts", "code"]]));

    // The executor sends inspector-data, which the bridge should receive
    expect(manager.bridge.getSnapshot()).toBeDefined();
    expect(manager.bridge.getSnapshot()?.kind).toBe("root");
  });

  it("terminate cancels running execution", () => {
    const compiler = createSuccessCompiler();
    const executor = createSuccessExecutor();
    const manager = new SandboxManager(compiler, executor);

    manager.terminate();
    expect(executor.terminate).toHaveBeenCalled();
  });

  it("subscribe returns unsubscribe function", async () => {
    const compiler = createSuccessCompiler();
    const executor = createSuccessExecutor();
    const manager = new SandboxManager(compiler, executor);

    const listener = vi.fn();
    const unsubscribe = manager.subscribe(listener);

    await manager.execute(new Map([["main.ts", "code"]]));
    expect(listener).toHaveBeenCalled();

    const callCount = listener.mock.calls.length;
    unsubscribe();

    await manager.execute(new Map([["main.ts", "code2"]]));
    expect(listener.mock.calls.length).toBe(callCount);
  });

  it("handles compiler throwing an exception", async () => {
    const compiler: CompileFn = vi.fn(async () => {
      throw new Error("WASM initialization failed");
    });
    const executor = createSuccessExecutor();
    const manager = new SandboxManager(compiler, executor);

    const result = await manager.execute(new Map([["main.ts", "code"]]));

    expect(result.success).toBe(false);
    expect(manager.state.phase).toBe("error");
    if (manager.state.phase === "error") {
      expect(manager.state.error.type).toBe("crash");
    }
  });

  it("default entry point is main.ts", async () => {
    const compiler = createSuccessCompiler();
    const executor = createSuccessExecutor();
    const manager = new SandboxManager(compiler, executor);

    await manager.execute(new Map([["main.ts", "code"]]));

    expect(compiler).toHaveBeenCalledWith(expect.anything(), "main.ts");
  });

  it("bridge has correct displayName and sourceType", () => {
    const manager = new SandboxManager(createSuccessCompiler(), createSuccessExecutor());
    expect(manager.bridge.displayName).toBe("Playground Sandbox");
    expect(manager.bridge.sourceType).toBe("local");
  });
});
