# Specification: Flow React Integration

## Goal

Expand `@hex-di/flow-react` with hooks for event subscription, activity monitoring, Suspense integration, and scoped flow instances, building on the existing `useMachine`, `useSelector`, and `useSend` hooks.

## User Stories

- As a React developer, I want to subscribe to specific machine events so that I can trigger side-effects (toasts, analytics, navigation) without re-rendering on every state change.
- As a React developer, I want to monitor activity status from React so that I can show progress indicators and handle activity-specific loading/error states.

## Specific Requirements

**FlowProvider enhancement**

- Current `FlowProvider` only provides a `FlowCollector` via context; extend it to also accept a `port` prop and optional `input` prop
- When `port` and `input` are provided, the provider creates a `MachineRunner` from the container-resolved `FlowAdapter` and ties its lifecycle to mount/unmount
- Runner must be disposed on unmount via `runner.dispose()` in a cleanup effect. `dispose()` returns `ResultAsync<void, DisposeError>`; the cleanup effect should handle potential `Err` (e.g., log cleanup failures)
- Children should be able to access the runner through existing hooks (`useMachine`, `useSelector`, `useSend`) without needing to pass the port explicitly when inside a `FlowProvider`

**useFlow() hook**

- Primary hook that returns `{ snapshot, send, matches, can, status }` for a given `FlowPort`
- `snapshot` is the full `MachineSnapshot<TState, TContext>` from `useSyncExternalStore`
- `send` delegates to `flowService.sendAndExecute()` with a stable callback reference. `sendAndExecute()` returns `ResultAsync<void, TransitionError | EffectExecutionError>`; the hook should handle `Err` results (e.g., route to an error boundary or log)
- `matches(state)` returns `boolean` for state matching, supporting dot-notation for nested/hierarchical states
- `can(event)` returns `boolean` indicating whether the event would trigger a valid transition from the current state
- `status` is derived from the snapshot: `'active'` when machine is running, `'done'` when in a final state, `'error'` when in an error state
- Must use `useSyncExternalStore` for React 18 concurrent mode safety, following the same pattern as existing `useMachine`

**useMachineSelector() hook**

- Derived state hook with referential equality optimization, similar to existing `useSelector` but accepting the full snapshot instead of separate `(state, context)` args
- Selector function receives `MachineSnapshot<TState, TContext>` and returns `TSelected`
- Uses `useRef` to cache the last selected value and `shallowEqual` (already implemented) as the default equality function
- Custom `EqualityFn<TSelected>` can be passed as a third argument
- Only triggers re-render when the selected value changes according to the equality function

**useFlowEvent() hook**

- Subscribe to specific machine events by event type string
- Callback fires only when the machine processes an event matching the given type
- Implementation should subscribe to the `FlowService` and filter transitions by event type
- Callback must be stable (stored in a ref) to avoid re-subscribing on every render
- Cleanup unsubscribes on unmount
- Must not cause re-renders in the subscribing component

**useActivity() hook**

- Returns `{ status, events }` for a named activity within a flow
- `status` is the `ActivityStatus` from the runner's `getActivityStatus()` method
- `events` is the list of events emitted by that activity (filtered from snapshot activities)
- Subscribes via `useSyncExternalStore` and derives activity data from the snapshot's `activities` array
- Uses shallow equality on the derived `{ status, events }` object to minimize re-renders

**Suspense integration**

- `FlowProvider` should support React Suspense for async machine initialization
- When the `FlowAdapter` factory is async (e.g., loading initial context from an API), the provider throws a promise to trigger Suspense
- Follow the same pattern as `HexDiAsyncContainerProvider` from `@hex-di/react`
- Resolved machine runner is cached so the promise is only thrown once

**Scoped flows**

- Each `ScopeProvider` from `@hex-di/react` creates an isolated container scope
- `FlowProvider` nested inside a `ScopeProvider` resolves the `FlowService` from that scope, giving each scope its own machine instance
- No additional code needed in `@hex-di/flow-react` since `usePort` already resolves from the nearest scope context
- Document this pattern as a first-class use case

**Render optimization strategy**

- All hooks must use `useSyncExternalStore` for concurrent mode safety and tearing prevention
- `useSelector`/`useMachineSelector` use cached refs with equality checks for referential stability
- `useSend` and `useFlowEvent` do not subscribe to state changes and never cause re-renders on transitions
- `useActivity` uses selector-based derivation so only activity-related changes trigger re-renders

## Existing Code to Leverage

**`libs/flow/react/src/hooks/use-machine.ts`**

- Existing `useMachine` hook demonstrates the pattern: resolve via `usePort`, subscribe via `useSyncExternalStore`, return memoized result
- `useFlow` should follow the same structure but add `matches`, `can`, and `status` fields
- Type helpers `ExtractState`, `ExtractEvent`, `ExtractContext` should be extracted into a shared types file

**`libs/flow/react/src/hooks/use-selector.ts`**

- Existing `useSelector` with `useRef`-based caching and `shallowEqual` default
- `useMachineSelector` should reuse this pattern but accept the full snapshot instead of `(state, context)`
- `EqualityFn` type is already exported and reusable

**`libs/flow/react/src/context/flow-provider.tsx`**

- Current `FlowProvider` wraps a `FlowCollectorContext` only
- Extend to optionally accept `port` and `input` props for runner lifecycle management
- `useFlowCollector` hook already exists for accessing the collector

**`integrations/react/src/providers/` (HexDiAsyncContainerProvider, ReactiveScopeProvider)**

- `HexDiAsyncContainerProvider` demonstrates the Suspense integration pattern with promise throwing and caching
- `ReactiveScopeProvider` demonstrates external lifecycle management tied to React component lifecycle
- Both patterns directly inform how `FlowProvider` should handle async initialization and scope-bound disposal

**`libs/flow/core/src/integration/types.ts` (FlowService interface)**

- `FlowService` is the primary interface hooks interact with: `snapshot()`, `subscribe()`, `sendAndExecute()`, `getActivityStatus()`
- All new hooks must work against this interface, not `MachineRunner` directly

## Out of Scope

- Server-side rendering (SSR) support for flow machines
- React Server Components integration
- DevTools panel UI component
- Machine visualization/graph rendering in React
- Automatic error boundary integration for machine errors
- React Native specific adaptations
- Hot module replacement (HMR) for machine definitions
- Machine persistence/rehydration across page reloads
- Cross-tab machine synchronization
- Animation integration (e.g., Framer Motion state-driven animations)
