import type { GuardEvent, GuardEventSink } from "@hex-di/guard";

/**
 * In-memory guard event sink for testing.
 * Records all emitted events for assertion.
 */
export interface MemoryGuardEventSink extends GuardEventSink {
  readonly events: readonly GuardEvent[];
  clear(): void;
  getByKind<K extends GuardEvent["kind"]>(kind: K): readonly Extract<GuardEvent, { kind: K }>[];
}

/**
 * Creates an in-memory guard event sink for testing.
 */
export function createMemoryGuardEventSink(): MemoryGuardEventSink {
  const _events: GuardEvent[] = [];

  return {
    emit(event: GuardEvent): void {
      _events.push(event);
    },
    get events(): readonly GuardEvent[] {
      return _events;
    },
    clear(): void {
      _events.length = 0;
    },
    getByKind<K extends GuardEvent["kind"]>(kind: K): readonly Extract<GuardEvent, { kind: K }>[] {
      return _events.filter((e): e is Extract<GuardEvent, { kind: K }> => e.kind === kind);
    },
  };
}
