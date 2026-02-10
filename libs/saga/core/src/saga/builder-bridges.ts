/**
 * Saga Builder Bridge Functions
 *
 * Overloaded functions that bridge the type gap between typed builder API
 * and type-erased internal SagaBuilderState. Follows the same pattern as
 * step/builder-bridges.ts and packages/core/src/ports/directed.ts:99-108.
 *
 * For callback-typed parameters that can't use overloads (due to function
 * parameter contravariance), uses "push" bridges that accept a typed
 * callback wrapped in a container object, then extract it into the target
 * slot. This avoids casts while respecting TypeScript's type system.
 *
 * @packageDocumentation
 */

import type { AnyStepDefinition, StepContext } from "../step/types.js";
import type {
  SagaDefinition,
  AnySagaDefinition,
  SagaNode,
  SagaOptions,
  AccumulatedResults,
} from "./types.js";

// =============================================================================
// Internal State Type (mirrors builder.ts)
// =============================================================================

interface SagaBuilderState<TName extends string> {
  readonly name: TName;
  readonly nodes: SagaNode[];
  readonly steps: AnyStepDefinition[];
  outputMapper: unknown;
  sagaOptions: SagaOptions;
}

// =============================================================================
// Step Widening
// =============================================================================

/**
 * Widens a specific step type to AnyStepDefinition.
 * All StepDefinition variants are structurally compatible with AnyStepDefinition
 * because the runtime fields use `unknown` types.
 */
export function widenStep<S extends AnyStepDefinition>(step: S): AnyStepDefinition;
export function widenStep(step: AnyStepDefinition): AnyStepDefinition {
  return step;
}

// =============================================================================
// Node Push Functions
//
// These functions push nodes directly to the state's nodes array.
// By accepting the state and pushing internally, the overloaded public
// signatures can accept typed callbacks while the implementation works
// with the type-erased SagaNode structure.
// =============================================================================

/**
 * Pushes a branch node onto the state's nodes array.
 *
 * Uses a type parameter for the selector to accept any callback shape.
 * The SagaNode.selector field type is `(ctx: StepContext<unknown, unknown>) => string`,
 * and at runtime the typed selector receives the same context object,
 * so the assignment is safe. The overload bridges the type boundary.
 */
export function pushBranchNode<
  TInput,
  TSteps extends readonly AnyStepDefinition[],
  TKey extends string,
>(
  state: SagaBuilderState<string>,
  selector: (ctx: StepContext<TInput, AccumulatedResults<TSteps>>) => TKey,
  branches: Record<string, readonly AnyStepDefinition[]>
): void;
export function pushBranchNode<TName extends string>(
  state: SagaBuilderState<TName>,
  selector: unknown,
  branches: Record<string, readonly AnyStepDefinition[]>
): void {
  state.nodes.push({
    _type: "branch",
    selector,
    branches,
  });
}

/**
 * Pushes a subSaga node onto the state's nodes array.
 */
export function pushSubSagaNode<
  TInput,
  TSteps extends readonly AnyStepDefinition[],
  TSaga extends AnySagaDefinition,
>(
  state: SagaBuilderState<string>,
  saga: TSaga,
  inputMapper: (ctx: StepContext<TInput, AccumulatedResults<TSteps>>) => unknown
): void;
export function pushSubSagaNode<TName extends string>(
  state: SagaBuilderState<TName>,
  saga: AnySagaDefinition,
  inputMapper: unknown
): void {
  state.nodes.push({
    _type: "subSaga",
    saga,
    inputMapper,
  });
}

/**
 * Sets the output mapper on the saga builder state.
 */
export function setOutputMapper<TSteps extends readonly AnyStepDefinition[], TOutput>(
  state: SagaBuilderState<string>,
  mapper: (results: AccumulatedResults<TSteps>) => TOutput
): void;
export function setOutputMapper<TName extends string>(
  state: SagaBuilderState<TName>,
  mapper: unknown
): void {
  state.outputMapper = mapper;
}

// =============================================================================
// Branches Widening
// =============================================================================

/**
 * Widens typed branch records to type-erased form.
 */
export function widenBranches<TKey extends string>(
  branches: Record<TKey, readonly AnyStepDefinition[]>
): Record<string, readonly AnyStepDefinition[]>;
export function widenBranches(
  branches: Record<string, readonly AnyStepDefinition[]>
): Record<string, readonly AnyStepDefinition[]> {
  return branches;
}

// =============================================================================
// Build Output Bridge
// =============================================================================

/**
 * Constructs a frozen SagaDefinition with the full generic type signature.
 * The implementation uses type-erased state fields directly.
 */
export function buildSagaDefinition<
  TName extends string,
  TInput,
  TOutput,
  TSteps extends readonly AnyStepDefinition[],
  TErrors,
>(state: SagaBuilderState<TName>): SagaDefinition<TName, TInput, TOutput, TSteps, TErrors>;
export function buildSagaDefinition<TName extends string>(state: SagaBuilderState<TName>): object {
  return Object.freeze({
    name: state.name,
    steps: [...state.steps],
    outputMapper: state.outputMapper,
    options: Object.freeze({ ...state.sagaOptions }),
    _nodes: Object.freeze([...state.nodes]),
  });
}

// =============================================================================
// Steps Array Widening
// =============================================================================

/**
 * Spreads a typed tuple of steps into an AnyStepDefinition array.
 */
export function widenStepsArray<PSteps extends readonly AnyStepDefinition[]>(
  steps: PSteps
): AnyStepDefinition[];
export function widenStepsArray(steps: readonly AnyStepDefinition[]): AnyStepDefinition[] {
  return [...steps];
}

/**
 * Extracts all branch steps from typed branches into an iterable of AnyStepDefinition.
 */
export function extractBranchSteps<TKey extends string>(
  branches: Record<TKey, readonly AnyStepDefinition[]>
): Iterable<AnyStepDefinition>;
export function extractBranchSteps(
  branches: Record<string, readonly AnyStepDefinition[]>
): Iterable<AnyStepDefinition> {
  const result: AnyStepDefinition[] = [];
  for (const branchSteps of Object.values(branches)) {
    for (const s of branchSteps) {
      result.push(s);
    }
  }
  return result;
}
