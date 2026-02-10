/**
 * useAsyncDerivedSuspense Hook
 *
 * Suspense-compatible variant that throws a Promise when loading
 * and throws the error when failed.
 *
 * @packageDocumentation
 */

import { usePort } from "@hex-di/react";
import type { AsyncDerivedPortDef, DeepReadonly } from "@hex-di/store";
import { useAsyncDerived } from "./use-async-derived.js";

export interface UseAsyncDerivedSuspenseResult<TResult> {
  readonly data: DeepReadonly<TResult>;
  readonly refresh: () => void;
}

/**
 * Suspense-compatible async derived hook.
 *
 * Throws a Promise when loading (triggers Suspense fallback).
 * Throws the error when failed (caught by error boundary).
 * Returns { data, refresh } when successful.
 */
export function useAsyncDerivedSuspense<TResult, E = never>(
  port: AsyncDerivedPortDef<string, TResult, E>
): UseAsyncDerivedSuspenseResult<TResult> {
  const service = usePort(port);
  const { snapshot, refresh } = useAsyncDerived(port);

  if (snapshot.status === "idle" || snapshot.status === "loading") {
    // Throw a promise to trigger Suspense
    throw new Promise<void>(resolve => {
      const unsubscribe = service.subscribe(snap => {
        if (snap.status === "success" || snap.status === "error") {
          unsubscribe();
          resolve();
        }
      });
    });
  }

  if (snapshot.status === "error") {
    throw snapshot.error;
  }

  return { data: snapshot.data, refresh };
}
