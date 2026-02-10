/**
 * Cross-platform utility functions for DataDog bridge.
 *
 * Provides safe access to console API without depending on DOM or Node.js types.
 * Uses the same pattern as @hex-di/tracing-otel for environment independence.
 *
 * @packageDocumentation
 */

/**
 * Subset of Console API used for error logging.
 */
export interface ConsoleLike {
  error(message: string, ...args: unknown[]): void;
}

function isConsoleLike(value: unknown): value is ConsoleLike {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === "object" &&
    "error" in value &&
    typeof value.error === "function"
  );
}

/**
 * Get the platform console API if available.
 *
 * @returns ConsoleLike or undefined if unavailable
 */
export function getConsole(): ConsoleLike | undefined {
  if (typeof globalThis === "undefined" || !("console" in globalThis)) {
    return undefined;
  }

  const g: Record<string, unknown> = globalThis;
  const cons: unknown = g.console;

  if (isConsoleLike(cons)) {
    return cons;
  }

  return undefined;
}

/**
 * Log an error message to console if available.
 *
 * @param message - Error message
 * @param args - Additional arguments
 */
export function logError(message: string, ...args: unknown[]): void {
  const cons = getConsole();
  if (cons) {
    cons.error(message, ...args);
  }
}

/**
 * DataDog span kind strings.
 *
 * DataDog uses specific string conventions for span types:
 * - "web" for server-side HTTP spans
 * - "http" for client-side HTTP spans
 * - "custom" for internal spans
 * - "worker" for producer/consumer spans
 */
type DataDogSpanKind = "web" | "http" | "custom" | "worker";

/**
 * Map HexDI span kind to DataDog span type convention.
 *
 * DataDog does not use OpenTelemetry span kinds directly.
 * Instead, it uses its own convention of span types:
 * - server -> "web" (incoming HTTP requests)
 * - client -> "http" (outgoing HTTP requests)
 * - internal -> "custom" (internal operations)
 * - producer -> "worker" (async message producer)
 * - consumer -> "worker" (async message consumer)
 *
 * @param kind - HexDI span kind string
 * @returns DataDog-compatible span type string
 */
export function mapSpanKindToDataDog(
  kind: "internal" | "server" | "client" | "producer" | "consumer"
): DataDogSpanKind {
  const kindMap: Record<typeof kind, DataDogSpanKind> = {
    server: "web",
    client: "http",
    internal: "custom",
    producer: "worker",
    consumer: "worker",
  };

  return kindMap[kind];
}
