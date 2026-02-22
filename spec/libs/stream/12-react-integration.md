# 12 - React Integration

## 64. useStream

Subscribes to a stream port and returns the full observer state. Auto-subscribes on mount and unsubscribes on unmount.

### Signature

```typescript
function useStream<T, E>(
  port: StreamPort<T, E, string>,
  options?: UseStreamOptions<T, E>
): StreamState<T, E>;

interface UseStreamOptions<T, E> {
  /** Whether the subscription is active. Default: true. */
  readonly enabled?: boolean;

  /** Called on each value emission. */
  readonly onNext?: (value: T) => void;

  /** Called on each recoverable error. */
  readonly onError?: (error: E) => void;

  /** Called on completion. */
  readonly onComplete?: () => void;

  /** Called on terminal error. */
  readonly onTerminate?: (error: unknown) => void;
}
```

### StreamState

```typescript
interface StreamState<T, E> {
  /** The latest emitted value, or undefined if no value has been emitted yet. */
  readonly value: T | undefined;

  /** The latest recoverable error, or undefined. Cleared on next value. */
  readonly error: E | undefined;

  /** True if the stream has completed. */
  readonly isCompleted: boolean;

  /** True if the stream has terminated with a fatal error. */
  readonly isTerminated: boolean;

  /** True if the stream is still active (neither completed nor terminated). */
  readonly isActive: boolean;

  /** The terminal error, if the stream has terminated. */
  readonly terminateError: unknown | undefined;

  /** Number of values received since subscription. */
  readonly valueCount: number;
}
```

### Example

```typescript
function PriceTicker() {
  const { value, error, isActive } = useStream(PriceTickerPort);

  if (!isActive) return <div>Stream ended</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!value) return <div>Waiting for data...</div>;

  return <div>Price: ${value.price}</div>;
}
```

### Lifecycle

```
Component mounts
  │
  ├── Resolve StreamProducer from Container
  ├── Call producer() to create Stream
  ├── Call stream.subscribe(observer)
  │     │
  │     ├── next(value) → setState({ value })
  │     ├── error(err) → setState({ error })
  │     ├── complete() → setState({ isCompleted: true })
  │     └── terminate(err) → setState({ isTerminated: true, terminateError })
  │
  └── Component unmounts
        │
        └── subscription.unsubscribe()
```

### Implementation Notes

- Uses `useSyncExternalStore` internally for tear-free reads
- The stream producer is resolved from the nearest `ContainerProvider` context
- Re-subscribes when the port reference changes (referential equality check)
- When `enabled` transitions from `true` to `false`, the subscription is unsubscribed

## 65. useStreamValue

Convenience hook that returns only the latest value (or a default). Simpler API for common use cases where error handling is not needed.

### Signature

```typescript
function useStreamValue<T, E>(port: StreamPort<T, E, string>): T | undefined;

function useStreamValue<T, E>(port: StreamPort<T, E, string>, defaultValue: T): T;
```

### Example

```typescript
function CurrentPrice() {
  const price = useStreamValue(PriceTickerPort, 0);
  return <span>${price.toFixed(2)}</span>;
}
```

## 66. useSubject

Returns the subject instance for both subscription and pushing. The subject is resolved from the container.

### Signature

```typescript
function useSubject<T, E>(port: SubjectPort<T, E, string>): SubjectHandle<T, E>;

interface SubjectHandle<T, E> {
  /** The latest value from the subject (BehaviorSubject: always defined). */
  readonly value: T | undefined;

  /** Push a value to all subscribers. */
  readonly next: (value: T) => void;

  /** Push a recoverable error to all subscribers. */
  readonly error: (error: E) => void;

  /** True if the subject is closed. */
  readonly closed: boolean;

  /** The underlying subject (for advanced use cases). */
  readonly subject: Subject<T, E>;
}
```

### Example

```typescript
function ThemeToggle() {
  const { value: theme, next: setTheme } = useSubject(ThemePort);

  return (
    <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
      Current: {theme}
    </button>
  );
}
```

### Example: Event Bus

```typescript
function EventLogger() {
  const { value: lastEvent } = useSubject(EventBusPort);

  return <pre>{JSON.stringify(lastEvent, null, 2)}</pre>;
}

function EventEmitter() {
  const { next: emit } = useSubject(EventBusPort);

  return (
    <button onClick={() => emit({ type: "click", timestamp: Date.now() })}>
      Emit Event
    </button>
  );
}
```

## 67. StreamProvider

Provider component that makes stream-specific configuration available to descendant components. Wraps the existing `ContainerProvider` pattern.

### Signature

```typescript
interface StreamProviderProps {
  readonly children: React.ReactNode;

  /** Optional: override default stream configuration for this subtree. */
  readonly config?: StreamProviderConfig;
}

interface StreamProviderConfig {
  /** Default buffer configuration for streams in this subtree. */
  readonly defaultBuffer?: BufferConfig;

  /** Default scheduler for time-dependent operators. */
  readonly scheduler?: Scheduler;
}

function StreamProvider(props: StreamProviderProps): React.ReactElement;
```

### Usage

```typescript
function App() {
  return (
    <ContainerProvider container={container}>
      <StreamProvider config={{ defaultBuffer: { capacity: 512, strategy: "drop-oldest" } }}>
        <Dashboard />
      </StreamProvider>
    </ContainerProvider>
  );
}
```

## 68. createStreamHooks

Factory that generates typed hooks bound to a specific container context. Follows the `createTypedHooks` pattern from `@hex-di/react`.

### Signature

```typescript
function createStreamHooks(): {
  useStream: typeof useStream;
  useStreamValue: typeof useStreamValue;
  useSubject: typeof useSubject;
};
```

### Usage

```typescript
// hooks.ts -- export typed hooks for your app
import { createStreamHooks } from "@hex-di/stream-react";

export const { useStream, useStreamValue, useSubject } = createStreamHooks();
```

```typescript
// component.tsx
import { useStreamValue } from "./hooks";

function PriceDisplay() {
  const price = useStreamValue(PriceTickerPort);
  return <div>{price}</div>;
}
```

### Integration with @hex-di/react

The stream hooks resolve the container from the `ContainerProvider` context established by `@hex-di/react`. No additional provider is needed for basic usage:

```typescript
// Standard HexDI React setup
import { ContainerProvider } from "@hex-di/react";

function App() {
  return (
    <ContainerProvider container={container}>
      <PriceDisplay /> {/* useStreamValue works here */}
    </ContainerProvider>
  );
}
```

The optional `StreamProvider` is only needed when overriding stream-specific configuration (buffer defaults, scheduler).

---

_Previous: [11 - Introspection](./11-introspection.md)_

_Next: [13 - Testing](./13-testing.md)_
