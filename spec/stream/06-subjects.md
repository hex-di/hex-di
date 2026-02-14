# 06 - Subjects

## 32. Subject

A hot stream that is also a `StreamSink`. Calling `subject.next(value)` pushes to all current subscribers. Late subscribers receive only future values.

### Interface

```typescript
interface Subject<T, E = never> extends Stream<T, E>, StreamSink<T, E> {
  /** Read-only view of this subject as a Stream (hides the sink methods). */
  asStream(): Stream<T, E>;

  /** Current number of active subscribers. */
  readonly subscriberCount: number;

  /** True after complete() or terminate() has been called. */
  readonly closed: boolean;
}
```

> **Note on `signal` inheritance:** `Subject` extends `StreamSink`, which includes `signal: AbortSignal`. On a Subject, `signal` is aborted when the subject is closed (via `complete()` or `terminate()`). This is intentional -- producers holding a Subject reference can listen for closure. Consumers should use `asStream()` to obtain a view without sink methods. The `signal` property is **not** exposed on the `Stream` interface returned by `asStream()`.

### Behavior

- `next(value)` pushes to all current subscribers synchronously
- `error(err)` pushes a recoverable error to all subscribers; the subject remains open
- `complete()` signals completion to all subscribers; the subject becomes closed
- `terminate(err)` signals terminal failure to all subscribers; the subject becomes closed
- After `closed` is true, `next`/`error` are no-ops; new subscribers receive only the terminal signal
- `asStream()` returns a read-only view that hides `next`, `error`, `complete`, `terminate`

### Example

```typescript
const subject = createSubject<number>();

const sub1 = subject.subscribe({ next: v => console.log("A:", v) });
subject.next(1); // A: 1

const sub2 = subject.subscribe({ next: v => console.log("B:", v) });
subject.next(2); // A: 2, B: 2

sub1.unsubscribe();
subject.next(3); // B: 3

subject.complete(); // B completes

// Late subscriber -- subject is closed
subject.subscribe({ complete: () => console.log("Late: completed") });
// Late: completed (receives terminal signal immediately)
```

## 33. BehaviorSubject

Like `Subject` but requires an initial value at construction. New subscribers immediately receive the current value synchronously before any future values.

### Interface

```typescript
interface BehaviorSubject<T, E = never> extends Subject<T, E> {
  /** The current value. Updated synchronously on each next() call. */
  readonly value: T;
}
```

### Behavior

- Requires an initial value at construction
- New subscribers receive the current value immediately (synchronously, before returning from `subscribe()`)
- `value` property always reflects the most recently emitted value
- After `complete()`, late subscribers receive the last value then `complete()`
- After `terminate()`, late subscribers receive only `terminate()`

### Example

```typescript
const theme = createBehaviorSubject<"light" | "dark">("light");

console.log(theme.value); // "light"

theme.subscribe({ next: v => console.log("Sub:", v) });
// Sub: light (immediate current value)

theme.next("dark");
// Sub: dark
console.log(theme.value); // "dark"
```

## 34. ReplaySubject

Like `Subject` but buffers the last `N` values. New subscribers receive the buffered values synchronously before any future values.

### Interface

```typescript
interface ReplaySubject<T, E = never> extends Subject<T, E> {
  /** The configured buffer size. */
  readonly bufferSize: number;
}
```

### Behavior

- Buffers the last `bufferSize` values in a ring buffer (O(1) push/evict)
- New subscribers receive all buffered values synchronously before future values
- Default `bufferSize` is 1
- After `complete()`, late subscribers receive buffered values then `complete()`
- After `terminate()`, late subscribers receive only `terminate()`

### Example

```typescript
const replay = createReplaySubject<number>(3);

replay.next(1);
replay.next(2);
replay.next(3);
replay.next(4); // Buffer: [2, 3, 4] (1 evicted)

replay.subscribe({ next: v => console.log("Late:", v) });
// Late: 2
// Late: 3
// Late: 4 (buffered values replayed synchronously)
```

## 35. Subject Factories

All subject factories return frozen, immutable subject instances:

```typescript
/** Creates a basic Subject with no initial value or buffering. */
function createSubject<T, E = never>(): Subject<T, E>;

/** Creates a BehaviorSubject with the given initial value. */
function createBehaviorSubject<T, E = never>(initialValue: T): BehaviorSubject<T, E>;

/** Creates a ReplaySubject that buffers the last N values. Default bufferSize: 1. */
function createReplaySubject<T, E = never>(bufferSize?: number): ReplaySubject<T, E>;
```

### Immutability

Subject instances are frozen via `Object.freeze()` after creation. The subject's methods are bound closures on the frozen object; internal state (subscriber set, buffer, closed flag) is encapsulated in the closure scope and not directly accessible.

```typescript
const subject = createSubject<number>();
Object.isFrozen(subject); // true

// Methods work via closures over internal state
subject.next(42); // Works -- mutates internal state, not the frozen object
```

## 36. Multicast Semantics

### Subscriber Lifecycle

```
Subject                 Subscriber A              Subscriber B
  │                         │                         │
  ├── next(1) ──────────────┤ (A receives 1)          │
  │                         │                         │
  │   B subscribes ─────────┼─────────────────────────┤
  │                         │                         │
  ├── next(2) ──────────────┤ (A receives 2) ────────┤ (B receives 2)
  │                         │                         │
  │   A unsubscribes ───────┤                         │
  │                         │                         │
  ├── next(3) ──────────────┼──── (A does not) ──────┤ (B receives 3)
  │                         │                         │
  ├── complete() ───────────┼─────────────────────────┤ (B completes)
  │                         │                         │
  ▼                         ▼                         ▼
```

### BehaviorSubject Lifecycle

```
BehaviorSubject("init")    Subscriber A              Subscriber B
  │                         │                         │
  │   A subscribes ─────────┤ (A receives "init")     │
  │                         │                         │
  ├── next("dark") ─────────┤ (A receives "dark")     │
  │                         │                         │
  │   B subscribes ─────────┼─────────────────────────┤ (B receives "dark")
  │                         │                         │
  ├── next("light") ────────┤ (A receives "light") ──┤ (B receives "light")
  │                         │                         │
  ▼                         ▼                         ▼
```

### ReplaySubject Lifecycle (bufferSize=2)

```
ReplaySubject(2)           Subscriber A              Subscriber B
  │                         │                         │
  ├── next(1) ──────────────┤ (no subscribers)        │
  ├── next(2) ──────────────┤ (no subscribers)        │
  ├── next(3) ──────────────┤ (no subscribers)        │
  │                         │  buffer: [2, 3]         │
  │                         │                         │
  │   A subscribes ─────────┤ (A receives 2, 3)       │
  │                         │                         │
  ├── next(4) ──────────────┤ (A receives 4) ────────│
  │                         │  buffer: [3, 4]         │
  │                         │                         │
  │   B subscribes ─────────┼─────────────────────────┤ (B receives 3, 4)
  │                         │                         │
  ▼                         ▼                         ▼
```

---

_Previous: [05 - Stream Creation](./05-stream-creation.md)_

_Next: [07 - Operators](./07-operators.md)_
