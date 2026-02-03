/**
 * Diagnostic test to reveal internal type system state during forward reference validation.
 *
 * This test uses debug types to inspect what's happening inside the type system
 * when a forward reference occurs (singleton requires unregistered scoped port,
 * then scoped port is added).
 *
 * @packageDocumentation
 */

import { describe, it } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import type {
  DebugDepGraph,
  DebugFindDependentsOf,
  DebugReverseCaptive,
} from "../src/validation/types/captive/detection.js";

describe("Forward Reference Diagnostic", () => {
  const ScopedPort = port<{ getData(): string }>()({ name: "ScopedService" });
  const SingletonPort = port<{ process(): void }>()({ name: "SingletonService" });

  const CaptiveSingletonAdapter = createAdapter({
    provides: SingletonPort,
    requires: [ScopedPort] as const,
    lifetime: "singleton",
    factory: () => ({ process: () => {} }),
  });

  const ScopedAdapter = createAdapter({
    provides: ScopedPort,
    requires: [] as const,
    lifetime: "scoped",
    factory: () => ({ getData: () => "data" }),
  });

  it("reveals TDepGraph state after forward reference", () => {
    // Step 1: Add singleton that requires unregistered scoped port
    const step1 = GraphBuilder.create().provide(CaptiveSingletonAdapter);

    // Extract internal types from builder
    type Step1Internal = typeof step1;

    // Debug: What does the dependency graph look like?
    type Step1Graph = Step1Internal extends { _depGraph: infer G } ? G : never;
    type DebugGraph = DebugDepGraph<Step1Graph>;

    // Debug: Who needs ScopedPort?
    type WhoNeedsScopedPort = DebugFindDependentsOf<Step1Graph, "ScopedService">;

    // Step 2: Now add the scoped adapter
    const step2 = step1.provide(ScopedAdapter);

    // Extract types from step2
    type Step2Internal = typeof step2;

    // Debug: What does reverse captive check show?
    type ReverseCheck = Step2Internal extends { _depGraph: infer G }
      ? Step2Internal extends { _lifetimeMap: infer L }
        ? DebugReverseCaptive<G, L, "ScopedService", 2>
        : never
      : never;

    // Debug: What is step2's type?
    type Step2Type = typeof step2;
    type IsError = Step2Type extends `ERROR${string}` ? true : false;

    // Log types for inspection (visible in IDE hover and test output)
    type _GraphState = DebugGraph;
    type _Dependents = WhoNeedsScopedPort;
    type _ReverseDebug = ReverseCheck;
    type _IsErrorType = IsError;

    // These type aliases allow developers to hover over them in IDE
    // to see the actual resolved types and understand what's happening
    // internally during reverse captive validation.

    // Use the types to prevent unused type errors
    const _graphStateCheck: _GraphState = {} as _GraphState;
    const _dependentsCheck: _Dependents = "" as _Dependents;
    const _reverseDebugCheck: _ReverseDebug = {} as _ReverseDebug;
    const _isErrorCheck: _IsErrorType = true as _IsErrorType;

    // Prevent unused variable warnings
    void _graphStateCheck;
    void _dependentsCheck;
    void _reverseDebugCheck;
    void _isErrorCheck;
  });

  it("shows how reverse captive detection works step by step", () => {
    // This test documents the internal flow using debug types

    // 1. Start with empty graph
    const empty = GraphBuilder.create();
    type EmptyGraph = typeof empty extends { _depGraph: infer G } ? G : never;
    type EmptyMap = typeof empty extends { _lifetimeMap: infer M } ? M : never;

    // 2. Add singleton that requires ScopedService (forward ref)
    const withSingleton = empty.provide(CaptiveSingletonAdapter);
    type GraphAfterSingleton = typeof withSingleton extends { _depGraph: infer G } ? G : never;
    type MapAfterSingleton = typeof withSingleton extends { _lifetimeMap: infer M } ? M : never;

    // Debug: Dependency graph should show SingletonService -> ScopedService
    type GraphState = DebugDepGraph<GraphAfterSingleton>;

    // Debug: Who depends on ScopedService? Should be "SingletonService"
    type DependentsOfScoped = DebugFindDependentsOf<GraphAfterSingleton, "ScopedService">;

    // 3. Now add scoped adapter - this triggers reverse captive check
    type ReverseCaptiveDebug = DebugReverseCaptive<
      GraphAfterSingleton,
      MapAfterSingleton,
      "ScopedService",
      2 // scoped level
    >;

    // The debug output should show:
    // - dependents: "SingletonService" (who requires ScopedService)
    // - hasLifetime: false (ScopedService not yet in map)
    // - result: "SingletonService" (captive dependency detected)

    // Use types to prevent unused errors
    const _emptyGraph: EmptyGraph = {} as EmptyGraph;
    const _emptyMap: EmptyMap = {} as EmptyMap;
    const _graphState: GraphState = {} as GraphState;
    const _dependents: DependentsOfScoped = "" as DependentsOfScoped;
    const _reverseDebug: ReverseCaptiveDebug = {} as ReverseCaptiveDebug;

    void _emptyGraph;
    void _emptyMap;
    void _graphState;
    void _dependents;
    void _reverseDebug;
  });
});
