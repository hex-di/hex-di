import type { GuardSpanSink, GuardSpanHandle, GuardSpanAttributes } from "@hex-di/guard";

export interface RecordedSpan {
  readonly name: string;
  readonly attributes: Partial<GuardSpanAttributes>;
  readonly ended: boolean;
  readonly error?: string;
}

export interface MemoryGuardSpanSink extends GuardSpanSink {
  readonly spans: readonly RecordedSpan[];
  clear(): void;
}

interface MutableSpanRecord {
  name: string;
  attributes: Partial<GuardSpanAttributes>;
  ended: boolean;
  error?: string;
}

export function createMemoryGuardSpanSink(): MemoryGuardSpanSink {
  const _spans: MutableSpanRecord[] = [];

  return {
    startSpan(name: string, attributes: Partial<GuardSpanAttributes>): GuardSpanHandle {
      const span: MutableSpanRecord = { name, attributes: { ...attributes }, ended: false };
      _spans.push(span);
      return {
        end(): void {
          span.ended = true;
        },
        setError(message: string): void {
          span.error = message;
        },
        setAttribute(_key: string, _value: string | number | boolean): void {},
      };
    },
    get spans(): readonly RecordedSpan[] {
      return _spans;
    },
    clear(): void {
      _spans.length = 0;
    },
  };
}
