/**
 * Worker Entry Point
 *
 * This file runs inside the Web Worker context. It:
 * 1. Pre-imports all @hex-di/* packages and registers them globally
 * 2. Intercepts console calls to forward them to the main thread
 * 3. Listens for execute messages and runs user code
 * 4. Extracts InspectorAPI data after execution
 *
 * In Vite dev mode, the bare specifier imports are resolved by Vite's
 * transform pipeline. In production, this file is bundled with all
 * hex-di packages included.
 *
 * @packageDocumentation
 */

import type { MainToWorkerMessage, WorkerToMainMessage } from "./worker-protocol.js";
import { serializeValue, serializeError } from "./worker-protocol.js";
import {
  extractInspectorData,
  setLastCreatedInspector,
  clearLastCreatedInspector,
} from "./container-bridge.js";
import { proxyWrapService } from "./result-proxy.js";
import { createInstrumentedResultModule } from "./traced-result.js";
import type { ResultModule } from "./traced-result.js";

// =============================================================================
// Hex-DI Module Registry
// =============================================================================

/**
 * Import all @hex-di packages and register them on globalThis so
 * compiled user code (with rewritten imports) can access them.
 *
 * The compiler's rewriteExternalImports() transforms:
 *   import { Port } from "@hex-di/core"
 * into:
 *   const { Port } = globalThis.__hexModules["@hex-di/core"]
 */
async function setupModuleRegistry(): Promise<void> {
  const [
    hexDiCore,
    hexDiGraph,
    hexDiRuntime,
    hexDiResult,
    hexDiFlow,
    hexDiStore,
    hexDiQuery,
    hexDiSaga,
    hexDiTracing,
    hexDiLogger,
  ] = await Promise.all([
    import("@hex-di/core"),
    import("@hex-di/graph"),
    import("@hex-di/runtime"),
    import("@hex-di/result"),
    import("@hex-di/flow"),
    import("@hex-di/store"),
    import("@hex-di/query"),
    import("@hex-di/saga"),
    import("@hex-di/tracing"),
    import("@hex-di/logger"),
  ]);

  // Wrap createContainer to automatically capture inspector for visualization panels
  // and proxy-wrap resolved services for method-level Result tracking.
  //
  // The container returned by createContainer is Object.freeze'd, so we cannot
  // use a Proxy (the `get` invariant prevents returning a different value for
  // non-configurable, non-writable properties). Instead, we create a thin
  // wrapper that delegates everything and overrides `resolve`.
  const originalCreateContainer = hexDiRuntime.createContainer;
  const instrumentedRuntime = {
    ...hexDiRuntime,
    createContainer(...args: Parameters<typeof originalCreateContainer>) {
      const container = originalCreateContainer(...args);
      if (container.inspector) {
        setLastCreatedInspector(container.inspector);
      }

      const originalResolve = container.resolve.bind(container);
      const instrumentedResolve = (p: { readonly __portName: string }) => {
        const service = originalResolve(p as Parameters<typeof container.resolve>[0]);
        return proxyWrapService(service, p.__portName, () => container.inspector);
      };

      // Return a wrapper that prototypally delegates to the real container
      // but has its own `resolve` property. We must use the property-descriptor
      // form of Object.create because the frozen prototype makes `resolve`
      // non-writable, so a plain assignment / Object.assign would throw.
      return Object.create(container, {
        resolve: { value: instrumentedResolve, enumerable: true, configurable: true },
      });
    },
  };

  // Instrument @hex-di/result to capture chain operations for the Railway panel.
  // When a terminal method (match, unwrapOr, etc.) is called, the instrumented
  // module emits result-chain-registered and result-chain-executed messages
  // to the main thread.
  const instrumentedResult = createInstrumentedResultModule(
    hexDiResult as unknown as ResultModule,
    (descriptor, execution) => {
      const registerMsg: WorkerToMainMessage = {
        type: "result-chain-registered",
        chain: descriptor,
      };
      self.postMessage(registerMsg);

      const executeMsg: WorkerToMainMessage = {
        type: "result-chain-executed",
        execution,
      };
      self.postMessage(executeMsg);
    }
  );

  const modules: Record<string, unknown> = {
    "@hex-di/core": hexDiCore,
    "@hex-di/graph": hexDiGraph,
    "@hex-di/runtime": instrumentedRuntime,
    "@hex-di/result": instrumentedResult,
    "@hex-di/flow": hexDiFlow,
    "@hex-di/store": hexDiStore,
    "@hex-di/query": hexDiQuery,
    "@hex-di/saga": hexDiSaga,
    "@hex-di/tracing": hexDiTracing,
    "@hex-di/logger": hexDiLogger,
  };

  Object.defineProperty(globalThis, "__hexModules", {
    value: modules,
    writable: false,
    configurable: false,
  });
}

// =============================================================================
// Type for Worker global scope
// =============================================================================

declare const self: DedicatedWorkerGlobalScope;

// =============================================================================
// Console Interception
// =============================================================================

const originalConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
};

function interceptConsole(): void {
  const levels = ["log", "warn", "error", "info", "debug"] as const;
  for (const level of levels) {
    console[level] = (...args: unknown[]) => {
      originalConsole[level](...args);
      const message: WorkerToMainMessage = {
        type: "console",
        level,
        args: args.map(serializeValue),
        timestamp: Date.now(),
      };
      self.postMessage(message);
    };
  }
}

// =============================================================================
// User Code Execution
// =============================================================================

async function executeUserCode(code: string): Promise<void> {
  clearLastCreatedInspector();
  try {
    // Create a Blob URL for the compiled code
    const blob = new Blob([code], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);

    try {
      const userModule = await import(/* @vite-ignore */ url);

      // After execution, try to extract InspectorAPI data
      extractInspectorData(userModule, msg => self.postMessage(msg));

      const completeMessage: WorkerToMainMessage = {
        type: "execution-complete",
        success: true,
      };
      self.postMessage(completeMessage);
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (error: unknown) {
    const errorMessage: WorkerToMainMessage = {
      type: "execution-error",
      error: serializeError(error),
    };
    self.postMessage(errorMessage);
  }
}

// =============================================================================
// Message Handler
// =============================================================================

function handleMessage(event: MessageEvent<MainToWorkerMessage>): void {
  const message = event.data;

  switch (message.type) {
    case "execute":
      void executeUserCode(message.code);
      break;

    case "terminate":
      self.close();
      break;

    default:
      // Pull requests for inspector data would be handled here
      break;
  }
}

// =============================================================================
// Initialization
// =============================================================================

interceptConsole();

// Set up the module registry, then start listening for messages.
// Messages received before setup completes are queued by the browser.
void setupModuleRegistry().then(() => {
  self.addEventListener("message", handleMessage);

  // Signal readiness — the executor waits for this before sending code
  const readyMessage: WorkerToMainMessage = { type: "worker-ready" };
  self.postMessage(readyMessage);
});
