/**
 * Type inference utilities for query and mutation ports.
 *
 * Uses property-based inference via `config` and `__portName` rather than
 * full structural matching against QueryPort/MutationPort to avoid
 * variance issues with phantom branded types from DirectedPort.
 *
 * @packageDocumentation
 */
// @ts-nocheck

import type { InferenceError } from "@hex-di/core";
import type { QueryPortConfig, AnyQueryPort } from "../ports/query-port.js";
import type { MutationPortConfig } from "../ports/mutation-port.js";

// =============================================================================
// Structural shape matchers (avoid phantom brand variance)
// =============================================================================

// =============================================================================
// Query Port Inference
// =============================================================================

/**
 * Extract the data type from a QueryPort.
 * Infers from the config property to avoid phantom brand variance.
 */
export type InferQueryData<T> = T extends {
  readonly config: QueryPortConfig<
    infer TData,
    unknown,
    unknown,
    string,
    ReadonlyArray<AnyQueryPort>
  >;
}
  ? TData
  : InferenceError<
      "InferQueryData",
      "Expected a QueryPort type. Use InferQueryData<typeof YourPort>.",
      T
    >;

/** Extract the params type from a QueryPort */
export type InferQueryParams<T> = T extends {
  readonly config: QueryPortConfig<
    unknown,
    infer TParams,
    unknown,
    string,
    ReadonlyArray<AnyQueryPort>
  >;
}
  ? TParams
  : InferenceError<
      "InferQueryParams",
      "Expected a QueryPort type. Use InferQueryParams<typeof YourPort>.",
      T
    >;

/** Extract the error type from a QueryPort */
export type InferQueryError<T> = T extends {
  readonly config: QueryPortConfig<
    unknown,
    unknown,
    infer TError,
    string,
    ReadonlyArray<AnyQueryPort>
  >;
}
  ? TError
  : InferenceError<
      "InferQueryError",
      "Expected a QueryPort type. Use InferQueryError<typeof YourPort>.",
      T
    >;

/** Extract the name literal type from a QueryPort */
export type InferQueryName<T> = T extends { readonly __portName: infer TName extends string }
  ? TName
  : InferenceError<
      "InferQueryName",
      "Expected a QueryPort type. Use InferQueryName<typeof YourPort>.",
      T
    >;

/** Extract the dependsOn tuple from a QueryPort */
export type InferQueryDependsOn<T> = T extends {
  readonly config: { readonly dependsOn?: infer TDeps };
}
  ? TDeps extends ReadonlyArray<AnyQueryPort>
    ? TDeps
    : []
  : InferenceError<
      "InferQueryDependsOn",
      "Expected a QueryPort type. Use InferQueryDependsOn<typeof YourPort>.",
      T
    >;

/** Extract dependency port names as a union */
export type InferQueryDependencyNames<T> = T extends {
  readonly config: { readonly dependsOn?: infer TDeps };
}
  ? TDeps extends ReadonlyArray<{ readonly __portName: infer TName extends string }>
    ? TName
    : never
  : InferenceError<"InferQueryDependencyNames", "Expected a QueryPort type.", T>;

/** Extract all types from a QueryPort at once */
export type InferQueryTypes<T> = T extends {
  readonly __portName: infer TName extends string;
  readonly config: QueryPortConfig<
    infer TData,
    infer TParams,
    infer TError,
    string,
    infer TDependsOn
  >;
}
  ? TDependsOn extends ReadonlyArray<AnyQueryPort>
    ? {
        readonly name: TName;
        readonly data: TData;
        readonly params: TParams;
        readonly error: TError;
        readonly dependsOn: TDependsOn;
      }
    : InferenceError<"InferQueryTypes", "Failed to infer dependsOn.", T>
  : InferenceError<
      "InferQueryTypes",
      "Expected a QueryPort type. Use InferQueryTypes<typeof YourPort>.",
      T
    >;

/** True if query port has non-void params */
export type HasParams<T> = [InferQueryParams<T>] extends [void] ? false : true;

// =============================================================================
// Mutation Port Inference
// =============================================================================

/** Extract the data (return) type from a MutationPort */
export type InferMutationData<T> = T extends {
  readonly config: MutationPortConfig<infer TData, unknown, unknown, unknown, string>;
}
  ? TData
  : InferenceError<
      "InferMutationData",
      "Expected a MutationPort type. Use InferMutationData<typeof YourPort>.",
      T
    >;

/** Extract the input type from a MutationPort */
export type InferMutationInput<T> = T extends {
  readonly config: MutationPortConfig<unknown, infer TInput, unknown, unknown, string>;
}
  ? TInput
  : InferenceError<
      "InferMutationInput",
      "Expected a MutationPort type. Use InferMutationInput<typeof YourPort>.",
      T
    >;

/** Extract the error type from a MutationPort */
export type InferMutationError<T> = T extends {
  readonly config: MutationPortConfig<unknown, unknown, infer TError, unknown, string>;
}
  ? TError
  : InferenceError<
      "InferMutationError",
      "Expected a MutationPort type. Use InferMutationError<typeof YourPort>.",
      T
    >;

/** Extract the context type from a MutationPort */
export type InferMutationContext<T> = T extends {
  readonly config: MutationPortConfig<unknown, unknown, unknown, infer TContext, string>;
}
  ? TContext
  : InferenceError<
      "InferMutationContext",
      "Expected a MutationPort type. Use InferMutationContext<typeof YourPort>.",
      T
    >;

/** Extract the name literal type from a MutationPort */
export type InferMutationName<T> = T extends { readonly __portName: infer TName extends string }
  ? TName
  : InferenceError<
      "InferMutationName",
      "Expected a MutationPort type. Use InferMutationName<typeof YourPort>.",
      T
    >;

/** Extract all types from a MutationPort at once */
export type InferMutationTypes<T> = T extends {
  readonly __portName: infer TName extends string;
  readonly config: MutationPortConfig<
    infer TData,
    infer TInput,
    infer TError,
    infer TContext,
    string
  >;
}
  ? {
      readonly name: TName;
      readonly data: TData;
      readonly input: TInput;
      readonly error: TError;
      readonly context: TContext;
    }
  : InferenceError<
      "InferMutationTypes",
      "Expected a MutationPort type. Use InferMutationTypes<typeof YourPort>.",
      T
    >;

// =============================================================================
// Mutation Effect Inference
// =============================================================================

/** Extract the list of invalidated port names from a MutationPort */
export type InferInvalidatedPorts<T> = T extends {
  readonly config: { readonly effects: { readonly invalidates: infer TPorts } };
}
  ? TPorts extends ReadonlyArray<{ readonly __portName: infer TName extends string }>
    ? TName
    : never
  : never;

/** Extract the list of removed port names from a MutationPort */
export type InferRemovedPorts<T> = T extends {
  readonly config: { readonly effects: { readonly removes: infer TPorts } };
}
  ? TPorts extends ReadonlyArray<{ readonly __portName: infer TName extends string }>
    ? TName
    : never
  : never;
