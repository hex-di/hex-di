/**
 * Component tests for real-time update handling.
 *
 * Spec: 11-interactions.md (11.14)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { RealTimeUpdateHandler } from "../../../src/panels/result/real-time.js";

// ── Fixtures ───────────────────────────────────────────────────────────────

interface EventEmitter {
  emit(event: { readonly type: string }): void;
  subscribe(listener: (event: { readonly type: string }) => void): () => void;
}

function createEventEmitter(): EventEmitter {
  const listeners: Array<(event: { readonly type: string }) => void> = [];
  return {
    emit(event) {
      for (const l of listeners) l(event);
    },
    subscribe(listener) {
      listeners.push(listener);
      return () => {
        const idx = listeners.indexOf(listener);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    },
  };
}

function setupEnv(): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

afterEach(() => {
  cleanup();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("RealTimeUpdateHandler", () => {
  beforeEach(() => {
    setupEnv();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("new execution updates execution selector dropdown", () => {
    const emitter = createEventEmitter();
    const onUpdate = vi.fn();
    render(<RealTimeUpdateHandler subscribe={emitter.subscribe} onExecutionAdded={onUpdate} />);

    act(() => {
      emitter.emit({ type: "execution-added" });
    });

    expect(onUpdate).toHaveBeenCalled();
  });

  it("new chain registered updates chain selector", () => {
    const emitter = createEventEmitter();
    const onUpdate = vi.fn();
    render(<RealTimeUpdateHandler subscribe={emitter.subscribe} onChainRegistered={onUpdate} />);

    act(() => {
      emitter.emit({ type: "chain-registered" });
    });

    expect(onUpdate).toHaveBeenCalled();
  });

  it("statistics update refreshes status bar (debounced at 200ms)", () => {
    const emitter = createEventEmitter();
    const onUpdate = vi.fn();
    render(
      <RealTimeUpdateHandler
        subscribe={emitter.subscribe}
        onStatisticsUpdated={onUpdate}
        statusBarDebounceMs={200}
      />
    );

    act(() => {
      emitter.emit({ type: "statistics-updated" });
    });

    expect(onUpdate).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onUpdate).toHaveBeenCalled();
  });

  it("aggregate statistics debounced at 500ms", () => {
    const emitter = createEventEmitter();
    const onUpdate = vi.fn();
    render(
      <RealTimeUpdateHandler
        subscribe={emitter.subscribe}
        onAggregateUpdated={onUpdate}
        aggregateDebounceMs={500}
      />
    );

    act(() => {
      emitter.emit({ type: "statistics-updated" });
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onUpdate).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onUpdate).toHaveBeenCalled();
  });

  it("Sankey diagram debounced at 1000ms", () => {
    const emitter = createEventEmitter();
    const onUpdate = vi.fn();
    render(
      <RealTimeUpdateHandler
        subscribe={emitter.subscribe}
        onSankeyUpdated={onUpdate}
        sankeyDebounceMs={1000}
      />
    );

    act(() => {
      emitter.emit({ type: "statistics-updated" });
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onUpdate).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onUpdate).toHaveBeenCalled();
  });

  it("connection lost shows 'Disconnected' indicator", () => {
    const emitter = createEventEmitter();
    render(<RealTimeUpdateHandler subscribe={emitter.subscribe} />);

    act(() => {
      emitter.emit({ type: "connection-lost" });
    });

    expect(screen.getByTestId("disconnected-indicator")).toBeDefined();
  });

  it("connection restored removes 'Disconnected' indicator and updates data", () => {
    const emitter = createEventEmitter();
    const onReconnected = vi.fn();
    render(<RealTimeUpdateHandler subscribe={emitter.subscribe} onReconnected={onReconnected} />);

    act(() => {
      emitter.emit({ type: "connection-lost" });
    });
    expect(screen.getByTestId("disconnected-indicator")).toBeDefined();

    act(() => {
      emitter.emit({ type: "connection-restored" });
    });
    expect(screen.queryByTestId("disconnected-indicator")).toBeNull();
    expect(onReconnected).toHaveBeenCalled();
  });

  it("stale data remains interactive when disconnected", () => {
    const emitter = createEventEmitter();
    render(<RealTimeUpdateHandler subscribe={emitter.subscribe} />);

    act(() => {
      emitter.emit({ type: "connection-lost" });
    });

    const container = screen.getByTestId("real-time-handler");
    expect(container.dataset["interactive"]).toBe("true");
  });

  it("`prefers-reduced-motion` disables all update animations", () => {
    // Override matchMedia to return reduced motion
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    const emitter = createEventEmitter();
    render(<RealTimeUpdateHandler subscribe={emitter.subscribe} />);

    const container = screen.getByTestId("real-time-handler");
    expect(container.dataset["reducedMotion"]).toBe("true");
  });
});
