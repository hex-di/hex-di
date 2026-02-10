/**
 * Context stability tests for provider components.
 *
 * Verifies that provider components produce stable context values
 * so that parent re-renders do not cascade to context consumers.
 */

import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import React, { useState, useContext } from "react";
import {
  HexDiContainerProvider,
  HexDiScopeProvider,
  HexDiAutoScopeProvider,
} from "../src/providers/index.js";
import { ResolverContext } from "../src/context/resolver-context.jsx";

// =============================================================================
// Test Fixtures — lightweight mocks matching the ResolverLike interface
// =============================================================================

const INTERNAL_ACCESS = Symbol.for("hex-di/internal-access");

function createMockScope(): any {
  return {
    resolve: vi.fn().mockReturnValue({ name: "scoped-test-service" }),
    resolveAsync: vi.fn().mockResolvedValue({ name: "scoped-test-service" }),
    createScope: vi.fn().mockImplementation(() => createMockScope()),
    dispose: vi.fn().mockResolvedValue(undefined),
    has: vi.fn().mockReturnValue(true),
    isDisposed: false,
    subscribe: vi.fn().mockReturnValue(() => {}),
    getDisposalState: vi.fn().mockReturnValue("active"),
    [INTERNAL_ACCESS]: () => ({
      id: "mock-scope",
      disposed: false,
      scopedMemo: { size: 0, entries: [] },
      childScopes: [],
    }),
  };
}

function createMockContainer(): any {
  const mockScope = createMockScope();
  return {
    resolve: vi.fn().mockReturnValue({ name: "test-service" }),
    resolveAsync: vi.fn().mockResolvedValue({ name: "test-service" }),
    createScope: vi.fn().mockReturnValue(mockScope),
    createChild: vi.fn(),
    dispose: vi.fn().mockResolvedValue(undefined),
    has: vi.fn().mockReturnValue(true),
    initialize: vi.fn().mockResolvedValue(undefined),
    isInitialized: false,
    isDisposed: false,
    [INTERNAL_ACCESS]: () => ({
      containerId: "mock-container",
      disposed: false,
      singletonMemo: new Map(),
    }),
  };
}

// =============================================================================
// Tests
// =============================================================================

afterEach(() => {
  cleanup();
});

describe("ContainerProvider context stability", () => {
  it("parent re-render does not produce new resolver context value", () => {
    const container = createMockContainer();
    const resolverValues: unknown[] = [];

    function ResolverCapture(): React.ReactElement {
      const ctx = useContext(ResolverContext);
      resolverValues.push(ctx);
      return <div data-testid="capture">captured</div>;
    }

    function Parent(): React.ReactElement {
      const [tick, setTick] = useState(0);
      return (
        <HexDiContainerProvider container={container}>
          <ResolverCapture />
          <button data-testid="rerender" onClick={() => setTick(t => t + 1)}>
            Tick {tick}
          </button>
        </HexDiContainerProvider>
      );
    }

    render(<Parent />);

    // Trigger multiple parent re-renders
    act(() => {
      fireEvent.click(screen.getByTestId("rerender"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("rerender"));
    });

    // All captured resolver context values should be the same object reference
    expect(resolverValues.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < resolverValues.length; i++) {
      expect(resolverValues[i]).toBe(resolverValues[0]);
    }
  });

  it("consumer render count stays stable across parent re-renders", () => {
    const container = createMockContainer();
    const renderCountRef = { current: 0 };

    // Memoize the consumer so it only re-renders when props or context change.
    // Without memoized context values, React.memo wouldn't help because
    // context changes would still trigger re-renders.
    const Consumer = React.memo(function Consumer(): React.ReactElement {
      renderCountRef.current++;
      const ctx = useContext(ResolverContext);
      return <div data-testid="consumer">{ctx ? "has-resolver" : "none"}</div>;
    });

    function Parent(): React.ReactElement {
      const [tick, setTick] = useState(0);
      return (
        <HexDiContainerProvider container={container}>
          <Consumer />
          <button data-testid="rerender" onClick={() => setTick(t => t + 1)}>
            Tick {tick}
          </button>
        </HexDiContainerProvider>
      );
    }

    render(<Parent />);
    const afterFirstRender = renderCountRef.current;

    act(() => {
      fireEvent.click(screen.getByTestId("rerender"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("rerender"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("rerender"));
    });

    // Consumer should not re-render when parent state changes,
    // because context value is memoized and Consumer is memoized.
    expect(renderCountRef.current).toBe(afterFirstRender);
  });
});

describe("ScopeProvider context stability", () => {
  it("parent re-render does not produce new resolver context value", () => {
    const container = createMockContainer();
    const scope = createMockScope();
    const resolverValues: unknown[] = [];

    function ResolverCapture(): React.ReactElement {
      const ctx = useContext(ResolverContext);
      resolverValues.push(ctx);
      return <div data-testid="capture">captured</div>;
    }

    function Parent(): React.ReactElement {
      const [tick, setTick] = useState(0);
      return (
        <HexDiContainerProvider container={container}>
          <HexDiScopeProvider scope={scope}>
            <ResolverCapture />
          </HexDiScopeProvider>
          <button data-testid="rerender" onClick={() => setTick(t => t + 1)}>
            Tick {tick}
          </button>
        </HexDiContainerProvider>
      );
    }

    render(<Parent />);

    act(() => {
      fireEvent.click(screen.getByTestId("rerender"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("rerender"));
    });

    expect(resolverValues.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < resolverValues.length; i++) {
      expect(resolverValues[i]).toBe(resolverValues[0]);
    }
  });
});

describe("AutoScopeProvider context stability", () => {
  it("parent re-render does not produce new resolver context value", () => {
    const container = createMockContainer();
    const scope = createMockScope();
    (container.createScope as ReturnType<typeof vi.fn>).mockReturnValue(scope);

    const resolverValues: unknown[] = [];

    function ResolverCapture(): React.ReactElement {
      const ctx = useContext(ResolverContext);
      resolverValues.push(ctx);
      return <div data-testid="capture">captured</div>;
    }

    function Parent(): React.ReactElement {
      const [tick, setTick] = useState(0);
      return (
        <HexDiContainerProvider container={container}>
          <HexDiAutoScopeProvider>
            <ResolverCapture />
          </HexDiAutoScopeProvider>
          <button data-testid="rerender" onClick={() => setTick(t => t + 1)}>
            Tick {tick}
          </button>
        </HexDiContainerProvider>
      );
    }

    render(<Parent />);

    act(() => {
      fireEvent.click(screen.getByTestId("rerender"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("rerender"));
    });

    expect(resolverValues.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < resolverValues.length; i++) {
      expect(resolverValues[i]).toBe(resolverValues[0]);
    }
  });
});
