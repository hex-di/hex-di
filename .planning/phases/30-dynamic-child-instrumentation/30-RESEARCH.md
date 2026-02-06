# Phase 30: Dynamic Child Container Auto-Instrumentation - Research

**Researched:** 2026-02-07
**Domain:** Runtime event emission and tracing instrumentation
**Confidence:** HIGH

## Summary

Phase 30 addresses the gap from v7.0 milestone audit where `instrumentContainerTree` cannot automatically instrument dynamically created child containers. The gap has two structural causes:

1. **Runtime never emits `child-created` inspector events** - The InspectorAPI type defines `child-created` events, and `tree.ts` subscribes to them, but the runtime's LifecycleManager and container factory code never emit these events.

2. **InspectorAPI→Container reverse lookup chicken-and-egg problem** - When a `child-created` event fires, `tree.ts` calls `inspector.getChildContainers()` to get InspectorAPI instances, then calls `getContainerFromInspector(childInspector)` to map back to Container instances for hook installation. But the reverse mapping is only registered during `instrumentContainerTree`'s initial `walkTree()`, creating a catch-22: dynamic children aren't in the mapping yet, so they can't be instrumented.

The solution requires changes to both @hex-di/runtime (emit events) and @hex-di/tracing (fix reverse lookup).

**Primary recommendation:** Emit `child-created` events from LifecycleManager.registerChildContainer() in @hex-di/runtime, and ensure InspectorAPI→Container mappings are established before the event fires by having builtin-api.ts emit events after inspector creation.

## Architecture Context

### Current Implementation

**LifecycleManager (`packages/runtime/src/container/internal/lifecycle-manager.ts`):**

- Tracks child containers via `Map<number, Disposable>`
- `registerChildContainer(child)` assigns unique ID but **does NOT emit events**
- Used by all container creation paths (createChild, createChildAsync, createLazyChild)

**InspectorAPI Event System (`packages/runtime/src/inspection/builtin-api.ts`):**

- Creates event emitter with `emit(event)` method
- Event emitter exists but is never called for child-created events
- The InspectorAPI type in @hex-di/core defines `child-created` event structure

**Tree Instrumentation (`packages/tracing/src/instrumentation/tree.ts`):**

- Lines 160-176: Subscribes to `child-created` events via `inspectorToWalk.subscribe(listener)`
- Lines 168-174: On event, walks `getChildContainers()`, finds new children, instruments them
- **Problem:** Events never fire, so this code path never executes

**Reverse Lookup Mapping (`packages/tracing/src/instrumentation/utils.ts`):**

- Lines 23-41: WeakMap<InspectorAPI, HookableContainer> for reverse lookup
- `registerContainerMapping()` called during `walkTree()` initial instrumentation
- `getContainerFromInspector()` returns undefined for containers not yet registered
- **Problem:** Dynamic children aren't in the map when `child-created` fires

### Container Creation Flow

**Current Path (createChild via wrappers.ts):**

```
1. createChildContainerWrapper() creates ChildContainerImpl
2. attachBuiltinAPIs() creates InspectorAPI via createBuiltinInspectorAPI()
3. impl.onWrapperSet(wrapper) registers child via parent.registerChildContainer()
4. LifecycleManager.registerChildContainer() adds to Map
   → NO EVENT EMITTED HERE
```

**What Should Happen:**

```
1-3. Same as above
4. LifecycleManager.registerChildContainer() adds to Map
5. Container's InspectorAPI emits child-created event to parent's inspector listeners
6. tree.ts listener receives event, finds new child via getChildContainers()
7. tree.ts calls getContainerFromInspector() → NEEDS MAPPING
8. tree.ts instruments new child recursively
```

## Standard Stack

### Core Components (already present)

| Component               | Location                                   | Purpose                                  | Status                       |
| ----------------------- | ------------------------------------------ | ---------------------------------------- | ---------------------------- |
| LifecycleManager        | @hex-di/runtime/container/internal         | Tracks child containers                  | Needs event emission         |
| EventEmitter            | @hex-di/runtime/inspection/builtin-api.ts  | Event system for inspector               | Exists but unused            |
| InspectorAPI            | @hex-di/core/inspection/inspector-types.ts | Type definition with child-created event | Already defined              |
| instrumentContainerTree | @hex-di/tracing/instrumentation/tree.ts    | Tree-wide instrumentation                | Already subscribes to events |
| WeakMap mapping         | @hex-di/tracing/instrumentation/utils.ts   | InspectorAPI→Container lookup            | Needs timing fix             |

### No New Dependencies Required

This phase requires **zero external dependencies**. All necessary infrastructure exists:

- Event system (EventEmitter pattern in builtin-api.ts)
- Event types (InspectorEvent in @hex-di/core)
- Subscription mechanism (InspectorAPI.subscribe)
- Tree walking (instrumentContainerTree already implemented)

## Architecture Patterns

### Pattern 1: Event Emission in LifecycleManager

**What:** LifecycleManager.registerChildContainer() must notify the parent container's InspectorAPI that a child was created.

**Challenge:** LifecycleManager is an internal class with no direct access to InspectorAPI. It tracks containers as `Disposable` interfaces, not full Container wrappers.

**Solution Pattern:** Pass event emitter callback to LifecycleManager or emit from caller site.

**Option A: Callback-based emission (recommended):**

```typescript
// In lifecycle-manager.ts
class LifecycleManager {
  constructor(private onChildCreated?: (childId: string, kind: "child" | "lazy") => void) {}

  registerChildContainer(child: Disposable): void {
    const id = this.childIdCounter++;
    child[CHILD_ID] = id;
    this.childContainers.set(id, child);

    // Emit event if callback provided
    if (this.onChildCreated) {
      this.onChildCreated(String(id), "child"); // Determine kind from child type
    }
  }
}
```

**Option B: Emit from wrapper creation site (cleaner):**

```typescript
// In wrappers.ts after child container creation
impl.onWrapperSet(wrapper); // Registers with parent
// After registration completes, emit event via parent's inspector
parentContainer.inspector.emit({
  type: "child-created",
  childId: childContainer.name,
  childKind: "child",
});
```

**Recommendation:** Option B is cleaner as it keeps LifecycleManager focused on lifecycle management without event concerns.

### Pattern 2: Reverse Lookup Timing Fix

**What:** InspectorAPI→Container mappings must exist before child-created events fire.

**Current Problem:**

```typescript
// In tree.ts walkTree()
instrumentOne(containerToWalk); // Instruments container
registerContainerMapping(inspector, container); // Registers mapping
inspectorToWalk.subscribe(listener); // Subscribes to events
// ^^^ But for dynamic children, this happens AFTER event fires
```

**Solution:** Register mapping during container creation, not during tree walking.

**Implementation Pattern:**

```typescript
// In builtin-api.ts createBuiltinInspectorAPI()
export function createBuiltinInspectorAPI(container: InternalAccessible): InspectorAPI {
  // ... existing code ...

  const inspector: InspectorAPI = {
    // ... existing methods ...
  };

  // Register mapping immediately on inspector creation
  // This ensures getContainerFromInspector() works for all containers
  if (isHookableContainer(container)) {
    registerContainerMapping(inspector, container);
  }

  return Object.freeze(inspector);
}
```

**Problem with this approach:** Circular dependency - @hex-di/runtime can't import from @hex-di/tracing.

**Better Solution:** Registration hook pattern:

```typescript
// In utils.ts
let onInspectorCreated: ((inspector: InspectorAPI, container: HookableContainer) => void) | null =
  null;

export function setInspectorCreatedHook(hook: typeof onInspectorCreated): void {
  onInspectorCreated = hook;
}

// In tree.ts
setInspectorCreatedHook((inspector, container) => {
  registerContainerMapping(inspector, container);
});
```

**Simplest Solution:** Just ensure tree.ts registers mappings eagerly when it encounters new inspectors from getChildContainers():

```typescript
// In tree.ts listener
const childInspectors = inspectorToWalk.getChildContainers();
for (const childInspector of childInspectors) {
  // Register mapping BEFORE trying to get container
  const childContainer = getContainerFromInspector(childInspector);
  if (!childContainer) {
    // Try to get container from inspector's wrapper
    // This requires inspector to expose a way to get its container
    // OR we need another approach
  }
}
```

**Recommended Solution:** Have InspectorAPI expose the container it wraps:

```typescript
// In builtin-api.ts
export function createBuiltinInspectorAPI(
  container: InternalAccessible & HookableContainer
): InspectorAPI {
  const inspector: InspectorAPI = {
    // ... existing methods ...
    __getContainer(): HookableContainer {
      return container;
    },
  };
  return inspector;
}
```

Then tree.ts can access container directly without WeakMap lookup.

### Pattern 3: Event Timing Guarantee

**What:** Ensure child-created events fire after child is fully constructed and inspector is attached.

**Critical Timing:**

```
1. ChildContainerImpl created
2. Wrapper created with all methods
3. attachBuiltinAPIs() creates inspector and attaches to wrapper
4. impl.onWrapperSet(wrapper) registers with parent
5. ← EMIT EVENT HERE (after steps 1-4 complete)
```

**Implementation Location:**
The safest place to emit is in the wrapper creation functions after all setup completes:

```typescript
// In wrappers.ts createChildContainerWrapper()
const childContainer: ChildContainerInternals = {
  // ... all properties ...
};

// Attach inspector before returning
attachBuiltinAPIs(childContainer, impl);

// Set wrapper reference (triggers parent registration)
impl.setWrapper(childContainer);

// NOW emit event - child is fully constructed
// Access parent container's inspector to emit
const parentContainer = /* get parent reference */;
emitChildCreatedEvent(parentContainer.inspector, {
  type: 'child-created',
  childId: childName,
  childKind: 'child'
});

return Object.freeze(childContainer);
```

## Don't Hand-Roll

| Problem               | Don't Build         | Use Instead                            | Why                                                   |
| --------------------- | ------------------- | -------------------------------------- | ----------------------------------------------------- |
| Event emission system | Custom event bus    | EventEmitter pattern in builtin-api.ts | Already exists, tested, follows InspectorAPI contract |
| Inspector access      | New inspection APIs | Existing InspectorAPI                  | Type-safe, well-tested, documented                    |
| Container tracking    | New registry        | LifecycleManager                       | Already tracks children, just needs event emission    |
| Reverse mapping       | Multiple WeakMaps   | Single WeakMap in utils.ts             | Prevents memory leaks, simple, already exists         |

**Key insight:** This phase is about wiring existing components, not building new systems. The event type, subscription mechanism, and tracking infrastructure all exist. We just need to call `emit()` at the right time and ensure mappings exist.

## Common Pitfalls

### Pitfall 1: Circular Dependencies Between Packages

**What goes wrong:** @hex-di/runtime importing from @hex-di/tracing creates circular dependency (tracing depends on runtime).

**Why it happens:** Trying to call `registerContainerMapping()` from runtime code.

**How to avoid:**

- Keep @hex-di/runtime agnostic to tracing concerns
- Use callback patterns or hooks if cross-package communication needed
- Alternatively, expose container reference from InspectorAPI so tracing can access it

**Warning signs:** Import errors, build failures, TypeScript "cannot find module" for @hex-di/tracing in runtime package

### Pitfall 2: Event Timing Race Conditions

**What goes wrong:** Child-created event fires before inspector is attached to child wrapper, causing getChildContainers() to return incomplete data.

**Why it happens:** Emitting too early in construction sequence.

**How to avoid:**

- Emit AFTER attachBuiltinAPIs() completes
- Emit AFTER impl.setWrapper() completes
- Emit as the last step before freezing and returning wrapper
- Test with assertions: "child.inspector should be defined when event fires"

**Warning signs:** Tests failing with "cannot read property 'inspector' of undefined", getChildContainers() returning empty array when children exist

### Pitfall 3: Mapping Registration Chicken-and-Egg

**What goes wrong:** getContainerFromInspector(childInspector) returns undefined because mapping wasn't registered yet.

**Why it happens:** tree.ts walkTree() registers mappings during initial traversal, but dynamic children don't go through that code path.

**How to avoid:**

- Register mappings at inspector creation time, OR
- Expose container reference directly from InspectorAPI, OR
- Register mapping in event listener before calling getContainerFromInspector()

**Warning signs:** Dynamic children not instrumented, tree.ts listener logs "child container not found", undefined reference errors

### Pitfall 4: Missing Event Emission for All Creation Paths

**What goes wrong:** Events emitted for createChild() but not createChildAsync() or createLazyChild().

**Why it happens:** Adding emission code to only one wrapper function.

**How to avoid:**

- Emit from shared code path (LifecycleManager.registerChildContainer or impl.onWrapperSet)
- OR emit from all three wrapper functions (createChildContainerWrapper, createChildContainerAsyncInternal, createLazyChildContainerInternal)
- Add integration test covering all three creation methods

**Warning signs:** Some tests pass, others fail; async/lazy children not instrumented

## Code Examples

### Example 1: Emit Event from Wrapper Creation

```typescript
// In wrappers.ts createChildContainerWrapper()
export function createChildContainerWrapper<...>(
  impl: ChildContainerImpl<TProvides, TExtends, TAsyncPorts>,
  childName: string,
  parentName: string,
  parentInspector?: InspectorAPI  // Pass parent inspector
): Container<...> {
  const childContainer: ChildContainerInternals = {
    // ... all properties ...
  };

  // Attach inspector to child
  attachBuiltinAPIs(childContainer, impl);

  // Set wrapper reference (registers with parent lifecycle manager)
  impl.setWrapper(childContainer);

  // Emit child-created event via parent inspector
  // IMPORTANT: Emit AFTER child is fully constructed
  if (parentInspector && 'emit' in parentInspector) {
    // Cast to access internal emit method
    (parentInspector as any).emit({
      type: 'child-created',
      childId: childName,
      childKind: 'child'
    });
  }

  return Object.freeze(childContainer);
}
```

### Example 2: Access Container from InspectorAPI

```typescript
// In builtin-api.ts - add internal container reference
export function createBuiltinInspectorAPI(container: InternalAccessible): InspectorAPI {
  // ... existing setup ...

  const inspector: InspectorAPI & { __container?: unknown } = {
    // ... existing methods ...

    // Internal: access wrapped container for instrumentation
    __container: container,
  };

  return Object.freeze(inspector);
}

// In tree.ts - access container directly
function walkTree(containerToWalk: HookableContainer, inspectorToWalk: InspectorAPI): void {
  // ... existing code ...

  const listener: InspectorListener = event => {
    if (event.type === "child-created") {
      const childInspectors = inspectorToWalk.getChildContainers();

      for (const childInspector of childInspectors) {
        // Get container from inspector's internal reference
        const childContainer = (childInspector as any).__container as HookableContainer;

        if (childContainer && !cleanups.has(childContainer)) {
          // Register mapping for reverse lookup
          registerContainerMapping(childInspector, childContainer);
          // Recursively walk and instrument
          walkTree(childContainer, childInspector);
        }
      }
    }
  };

  // ... rest of walkTree ...
}
```

### Example 3: Test for Dynamic Child Instrumentation

```typescript
// New test in tree-instrumentation.test.ts
it("should auto-instrument dynamically created child containers", async () => {
  const RootPort = port<string>()({ name: "Root" });
  const ChildPort = port<string>()({ name: "Child" });

  const rootAdapter = createAdapter({
    provides: RootPort,
    requires: [],
    lifetime: "transient",
    factory: () => "root",
  });

  const childAdapter = createAdapter({
    provides: ChildPort,
    requires: [],
    lifetime: "transient",
    factory: () => "child",
  });

  const rootGraph = GraphBuilder.create().provide(rootAdapter).build();
  const childGraph = GraphBuilder.create().provide(childAdapter).buildFragment();

  const root = createContainer({ graph: rootGraph, name: "Root" });
  containers.push(root);

  // Instrument tree BEFORE creating child
  const cleanup = instrumentContainerTree(root, root.inspector, tracer);

  // Create child AFTER instrumentation
  const child = root.createChild(childGraph, { name: "Child" });
  containers.push(child);

  // Child should be auto-instrumented
  child.resolve(ChildPort);

  const spans = tracer.getCollectedSpans();
  expect(spans.some(s => s.name === "resolve:Child")).toBe(true);

  cleanup();
});
```

## State of the Art

This phase implements a **standard observer pattern** for component lifecycle events. The pattern is used throughout JavaScript ecosystems:

- React: componentDidMount, useEffect cleanup
- Node.js: EventEmitter for stream/process events
- DOM: addEventListener for element lifecycle
- Vue: lifecycle hooks (created, mounted, unmounted)

HexDI already uses this pattern for scope lifecycle events (disposing/disposed in `scope/lifecycle-events.ts`). Phase 30 extends the same pattern to container lifecycle.

**Key Precedent:** The scope lifecycle event system (`packages/runtime/src/scope/lifecycle-events.ts`) provides the exact pattern to follow:

- EventEmitter with listeners Set
- emit() method calls all listeners in try/catch
- subscribe() returns unsubscribe function
- Events emitted at precise lifecycle moments (disposing, disposed)

## Open Questions

None - all technical approaches are well-understood and precedented in the codebase.

## Implementation Approach

Based on the research, the cleanest implementation:

### Plan 30-01: Emit child-created Events from Runtime

**Changes to @hex-di/runtime:**

1. **Expose emit() in InspectorAPI type** (optional - can use type assertion)
   - Add internal `__emit(event: InspectorEvent): void` method to InspectorAPI
   - OR cast to `any` to access existing private emit method

2. **Emit events in wrapper creation functions**
   - Modify `createChildContainerWrapper()` to emit after construction
   - Modify async/lazy equivalents to emit after construction
   - Pass parent inspector reference to wrapper creation functions

3. **Add container reference to InspectorAPI**
   - Modify `createBuiltinInspectorAPI()` to store `__container` reference
   - Enables tree.ts to access container without WeakMap chicken-and-egg

### Plan 30-02: Wire tree.ts Listener to Events and Fix Reverse Lookup

**Changes to @hex-di/tracing:**

1. **Access container from inspector directly**
   - Modify `walkTree()` listener to use `inspector.__container`
   - Remove dependency on `getContainerFromInspector()` for new children
   - Keep `registerContainerMapping()` for backward compatibility

2. **Add comprehensive tests**
   - Test dynamic child creation AFTER tree instrumentation
   - Test createChild, createChildAsync, createLazyChild paths
   - Test nested dynamic children (grandchildren)
   - Test cleanup removes hooks from dynamically created children

## Sources

### Primary (HIGH confidence)

- **Codebase Analysis:**
  - `packages/runtime/src/container/internal/lifecycle-manager.ts` - No event emission found
  - `packages/runtime/src/inspection/builtin-api.ts` - EventEmitter exists but unused
  - `packages/tracing/src/instrumentation/tree.ts` - Subscribes to events that never fire
  - `packages/tracing/src/instrumentation/utils.ts` - WeakMap mapping exists
  - `packages/core/src/inspection/inspector-types.ts` - child-created event type defined
  - `.planning/v7.0-MILESTONE-AUDIT.md` - Gap documented with root causes
  - `.planning/STATE.md` - Phase 24 gap: "dynamic child auto-instrumentation requires runtime to emit child-created events"

- **Test Analysis:**
  - `packages/tracing/tests/integration/instrumentation/tree-instrumentation.test.ts` - Tests only static hierarchy, not dynamic creation

- **Prior Decisions (STATE.md):**
  - "Subscribe to 'child-created' events on all inspectors for live updates (24-02)"
  - "WeakMap<InspectorAPI, Container> for MVP reverse lookup"
  - "Register mappings during walkTree for all instrumented containers (24-02)"

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All components exist, no external dependencies
- Architecture: HIGH - Observer pattern well-understood, precedent in scope events
- Pitfalls: HIGH - Circular dependency, timing races, and chicken-and-egg issues clearly identified

**Research date:** 2026-02-07
**Valid until:** Indefinite (internal implementation, stable requirements)
