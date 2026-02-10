/**
 * SagaBoundary Component
 *
 * React error boundary specialized for saga failures.
 * Catches unhandled saga errors during rendering and provides
 * retry and reset capabilities through a fallback UI.
 *
 * @packageDocumentation
 */

import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import type { SagaError } from "@hex-di/saga";

// =============================================================================
// Types
// =============================================================================

export interface SagaBoundaryFallbackProps {
  readonly error: SagaError<unknown>;
  readonly executionId: string | undefined;
  readonly compensated: boolean;
  readonly reset: () => void;
  readonly retry: () => void;
}

export interface SagaBoundaryProps {
  readonly children: ReactNode;
  readonly fallback: (props: SagaBoundaryFallbackProps) => ReactNode;
  readonly onError?: (error: SagaError<unknown>, executionId: string | undefined) => void;
}

interface SagaBoundaryState {
  readonly sagaError: SagaError<unknown> | null;
}

// =============================================================================
// Type Guard
// =============================================================================

function isSagaError(error: unknown): error is SagaError<unknown> {
  if (typeof error !== "object" || error === null) return false;
  if (!("_tag" in error)) return false;
  const tag = error._tag;
  return (
    tag === "StepFailed" ||
    tag === "CompensationFailed" ||
    tag === "Timeout" ||
    tag === "Cancelled" ||
    tag === "ValidationFailed" ||
    tag === "PortNotFound" ||
    tag === "PersistenceFailed"
  );
}

function deriveCompensated(error: SagaError<unknown>): boolean {
  if (error._tag === "StepFailed") return true;
  if (error._tag === "CompensationFailed") return false;
  return error.compensatedSteps.length > 0;
}

// =============================================================================
// SagaBoundary Component
// =============================================================================

/**
 * Error boundary specialized for saga failures.
 *
 * Catches saga errors thrown during rendering (e.g., from .expect() calls)
 * and renders a fallback UI with error details and recovery actions.
 */
export class SagaBoundary extends Component<SagaBoundaryProps, SagaBoundaryState> {
  constructor(props: SagaBoundaryProps) {
    super(props);
    this.state = { sagaError: null };
  }

  static getDerivedStateFromError(error: unknown): Partial<SagaBoundaryState> | null {
    if (isSagaError(error)) {
      return { sagaError: error };
    }
    // Re-throw non-saga errors to be handled by parent boundaries
    throw error;
  }

  componentDidCatch(error: unknown, _info: ErrorInfo): void {
    if (isSagaError(error)) {
      this.props.onError?.(error, error.executionId);
    }
  }

  render(): ReactNode {
    const { sagaError } = this.state;
    const { children, fallback } = this.props;

    if (sagaError !== null) {
      return fallback({
        error: sagaError,
        executionId: sagaError.executionId,
        compensated: deriveCompensated(sagaError),
        reset: () => this.setState({ sagaError: null }),
        retry: () => this.setState({ sagaError: null }),
      });
    }

    return children;
  }
}
