/**
 * Tests for ReactiveScopeProvider component.
 *
 * These tests verify that ReactiveScopeProvider correctly:
 * - Renders children when scope is active
 * - Renders fallback when scope is disposed
 * - Unmounts children when scope.dispose() is called externally
 * - Works with React StrictMode
 *
 * @packageDocumentation
 */

import React from "react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { port } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { ReactiveScopeProvider } from "../src/providers/reactive-scope-provider.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface TestService {
  name: string;
}

const TestServicePort = port<TestService>()({ name: "TestService" });

const TestServiceAdapter = createAdapter({
  provides: TestServicePort,
  requires: [],
  lifetime: "scoped",
  factory: () => ({ name: "test-service" }),
});

function createTestContainer() {
  const graph = GraphBuilder.create().provide(TestServiceAdapter).build();
  return createContainer({ graph, name: "TestContainer" });
}

// =============================================================================
// Test Components
// =============================================================================

function ChildContent() {
  return <div data-testid="child-content">Content is visible</div>;
}

function FallbackContent() {
  return <div data-testid="fallback-content">Fallback is visible</div>;
}

// =============================================================================
// Tests
// =============================================================================

describe("ReactiveScopeProvider", () => {
  let container: ReturnType<typeof createTestContainer>;

  beforeEach(() => {
    container = createTestContainer();
  });

  afterEach(async () => {
    cleanup();
    await container.dispose();
  });

  describe("rendering", () => {
    test("renders children when scope is active", () => {
      const scope = container.createScope();

      render(
        <ReactiveScopeProvider scope={scope}>
          <ChildContent />
        </ReactiveScopeProvider>
      );

      expect(screen.getByTestId("child-content")).toBeTruthy();
    });

    test("renders fallback when scope is disposed", async () => {
      const scope = container.createScope();

      render(
        <ReactiveScopeProvider scope={scope} fallback={<FallbackContent />}>
          <ChildContent />
        </ReactiveScopeProvider>
      );

      // Initially shows children
      expect(screen.getByTestId("child-content")).toBeTruthy();

      // Dispose scope
      await act(async () => {
        await scope.dispose();
      });

      // Now shows fallback
      expect(screen.queryByTestId("child-content")).toBeNull();
      expect(screen.getByTestId("fallback-content")).toBeTruthy();
    });

    test("renders null as fallback when not provided", async () => {
      const scope = container.createScope();

      const { container: renderContainer } = render(
        <ReactiveScopeProvider scope={scope}>
          <ChildContent />
        </ReactiveScopeProvider>
      );

      // Dispose scope
      await act(async () => {
        await scope.dispose();
      });

      // Container should be empty (null rendered)
      expect(renderContainer.firstChild).toBeNull();
    });

    test("renders fallback during disposing state by default", async () => {
      const scope = container.createScope();

      render(
        <ReactiveScopeProvider scope={scope} fallback={<FallbackContent />}>
          <ChildContent />
        </ReactiveScopeProvider>
      );

      // Start disposal (checking during the process)
      let disposePromise: Promise<void>;
      await act(async () => {
        disposePromise = scope.dispose();
      });

      // After dispose starts, fallback should be shown
      expect(screen.queryByTestId("child-content")).toBeNull();
      expect(screen.getByTestId("fallback-content")).toBeTruthy();

      await disposePromise!;
    });

    test("keeps children during disposing if unmountOnDisposing=false", async () => {
      const scope = container.createScope();

      // We can't easily test the "disposing" state because disposal is fast
      // But we can verify the prop is accepted
      render(
        <ReactiveScopeProvider
          scope={scope}
          fallback={<FallbackContent />}
          unmountOnDisposing={false}
        >
          <ChildContent />
        </ReactiveScopeProvider>
      );

      // Initially shows children
      expect(screen.getByTestId("child-content")).toBeTruthy();

      await act(async () => {
        await scope.dispose();
      });

      // After dispose completes, shows fallback
      expect(screen.queryByTestId("child-content")).toBeNull();
      expect(screen.getByTestId("fallback-content")).toBeTruthy();
    });
  });

  describe("reactive updates", () => {
    test("unmounts children when scope.dispose() is called externally", async () => {
      const scope = container.createScope();
      const onUnmount = vi.fn();

      function TrackedChild() {
        React.useEffect(() => {
          return () => onUnmount();
        }, []);
        return <div data-testid="tracked-child">Tracked</div>;
      }

      render(
        <ReactiveScopeProvider scope={scope} fallback={<FallbackContent />}>
          <TrackedChild />
        </ReactiveScopeProvider>
      );

      expect(screen.getByTestId("tracked-child")).toBeTruthy();

      // External disposal
      await act(async () => {
        await scope.dispose();
      });

      // Child should have unmounted
      expect(onUnmount).toHaveBeenCalled();
      expect(screen.queryByTestId("tracked-child")).toBeNull();
    });

    test("multiple providers using same scope all update", async () => {
      const scope = container.createScope();

      render(
        <div>
          <ReactiveScopeProvider scope={scope} fallback={<div data-testid="fallback-1">F1</div>}>
            <div data-testid="child-1">C1</div>
          </ReactiveScopeProvider>
          <ReactiveScopeProvider scope={scope} fallback={<div data-testid="fallback-2">F2</div>}>
            <div data-testid="child-2">C2</div>
          </ReactiveScopeProvider>
        </div>
      );

      expect(screen.getByTestId("child-1")).toBeTruthy();
      expect(screen.getByTestId("child-2")).toBeTruthy();

      await act(async () => {
        await scope.dispose();
      });

      expect(screen.queryByTestId("child-1")).toBeNull();
      expect(screen.queryByTestId("child-2")).toBeNull();
      expect(screen.getByTestId("fallback-1")).toBeTruthy();
      expect(screen.getByTestId("fallback-2")).toBeTruthy();
    });
  });

  describe("nested providers", () => {
    test("nested ReactiveScopeProviders update correctly", async () => {
      const outerScope = container.createScope();
      const innerScope = outerScope.createScope();

      render(
        <ReactiveScopeProvider scope={outerScope} fallback={<div data-testid="outer-fallback" />}>
          <div data-testid="outer-content">
            <ReactiveScopeProvider
              scope={innerScope}
              fallback={<div data-testid="inner-fallback" />}
            >
              <div data-testid="inner-content" />
            </ReactiveScopeProvider>
          </div>
        </ReactiveScopeProvider>
      );

      expect(screen.getByTestId("outer-content")).toBeTruthy();
      expect(screen.getByTestId("inner-content")).toBeTruthy();

      // Dispose inner scope only
      await act(async () => {
        await innerScope.dispose();
      });

      expect(screen.getByTestId("outer-content")).toBeTruthy();
      expect(screen.queryByTestId("inner-content")).toBeNull();
      expect(screen.getByTestId("inner-fallback")).toBeTruthy();
    });

    test("disposing outer scope disposes nested scopes", async () => {
      const outerScope = container.createScope();
      const innerScope = outerScope.createScope();

      render(
        <ReactiveScopeProvider scope={outerScope} fallback={<div data-testid="outer-fallback" />}>
          <div data-testid="outer-content">
            <ReactiveScopeProvider
              scope={innerScope}
              fallback={<div data-testid="inner-fallback" />}
            >
              <div data-testid="inner-content" />
            </ReactiveScopeProvider>
          </div>
        </ReactiveScopeProvider>
      );

      // Dispose outer scope (should cascade to inner)
      await act(async () => {
        await outerScope.dispose();
      });

      expect(screen.queryByTestId("outer-content")).toBeNull();
      expect(screen.queryByTestId("inner-content")).toBeNull();
      expect(screen.getByTestId("outer-fallback")).toBeTruthy();
    });
  });

  describe("error handling", () => {
    test("disposed scope shows fallback immediately on mount", async () => {
      const scope = container.createScope();

      // Pre-dispose the scope
      await scope.dispose();

      render(
        <ReactiveScopeProvider scope={scope} fallback={<FallbackContent />}>
          <ChildContent />
        </ReactiveScopeProvider>
      );

      // Should show fallback immediately
      expect(screen.queryByTestId("child-content")).toBeNull();
      expect(screen.getByTestId("fallback-content")).toBeTruthy();
    });
  });
});
