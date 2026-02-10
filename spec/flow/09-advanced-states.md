# 09 - Advanced States

---

## 11. Hierarchical, Parallel & History States

### 11.1 Hierarchical (Compound) States

Compound states contain nested child states, forming a tree structure. A machine in a compound state is always in exactly one of its child states.

```
  +--------------------------------------------------+
  |  active  (type: 'compound', initial: 'idle')     |
  |                                                   |
  |   +--------+    FETCH    +---------+              |
  |   |  idle  | ----------> | loading |              |
  |   +--------+             +---------+              |
  |        ^                  |       |               |
  |        |         SUCCESS  |       | FAILURE       |
  |        |                  v       |               |
  |        |             +---------+  |               |
  |        +-- FAILURE --| success |  |               |
  |                      | (final) |  |               |
  |                      +---------+  |               |
  |                                   |               |
  |        +<-------------------------+               |
  |        |                                          |
  +--------+------------------------------------------+
       |                      |
       | CANCEL               | onDone (success is final)
       v                      v
  +-----------+        +-----------+
  | cancelled |        | completed |
  |  (final)  |        |  (final)  |
  +-----------+        +-----------+
```

Configuration:

```typescript
states: {
  active: {
    type: 'compound',
    initial: 'idle',
    states: {
      idle: { on: { FETCH: { target: 'loading' } } },
      loading: {
        on: {
          SUCCESS: { target: 'success' },
          FAILURE: { target: 'idle' },
        },
      },
      success: { type: 'final' },
    },
    on: {
      CANCEL: { target: '#root.cancelled' },
    },
    onDone: { target: 'completed' },
  },
  completed: { type: 'final' },
  cancelled: { type: 'final' },
}
```

- A compound state declares `type: 'compound'` and a nested `states` record with an `initial` child
- When the machine enters a compound state, it automatically enters the `initial` child
- Events handled in the parent's `on` apply to all children (event bubbling)
- The `onDone` transition fires when a child reaches a `final` state
- Child states can reference siblings directly (e.g., `'loading'` from `'idle'`) or use absolute `#id` references to target states outside the compound

### 11.2 State Value for Compound States

For compound states, `snapshot.stateValue` returns a nested object reflecting the active state path:

```
  Machine in state: active -> loading

  snapshot.state       // 'active'  (top-level active state)
  snapshot.stateValue  // { active: 'loading' }

  snapshot.matches('active')          // true
  snapshot.matches('active.loading')  // true
  snapshot.matches('active.idle')     // false
  snapshot.matches('completed')       // false
```

```
  +-------------------------------+
  | stateValue structure          |
  |                               |
  |  Flat state:                  |
  |    stateValue = 'idle'        |
  |                               |
  |  Single nesting:              |
  |    stateValue =               |
  |      { active: 'loading' }    |
  |                               |
  |  Deep nesting:                |
  |    stateValue =               |
  |      { active:                |
  |        { editing:             |
  |          'unsaved' } }        |
  +-------------------------------+
```

- For flat (non-compound) states, `stateValue` is a plain string (e.g., `'idle'`)
- For compound states, `stateValue` is a nested object where each key is a compound state name and the value is the active child (string or further nested object)
- `matches(descriptor)` accepts dot-separated paths (e.g., `'active.loading'`) and checks if the current state configuration includes that path
- `can(event)` checks whether an event would trigger a valid transition from the current state, including events handled by parent compound states

### 11.3 Parallel States

Parallel states contain multiple orthogonal regions that are all active simultaneously. Each region is an independent state machine.

```
  +-----------------------------------------------------------+
  |  active  (type: 'parallel')                               |
  |                                                            |
  |  +---------------------------+  +------------------------+ |
  |  |  upload                   |  |  validation            | |
  |  |  (initial: 'idle')       |  |  (initial: 'pending')  | |
  |  |                           |  |                        | |
  |  |  +------+  START  +----+ |  |  +-------+  CHECK +-+  | |
  |  |  | idle |-------->|    | |  |  |pending|------->| |  | |
  |  |  +------+         |    | |  |  +-------+        | |  | |
  |  |                   |uplg| |  |     ^              |v|  | |
  |  |           DONE    |    | |  |     |  RECHECK     |a|  | |
  |  |    +------+<------+    | |  |     +------------- |l|  | |
  |  |    | done |        +----+ |  |                   |i|  | |
  |  |    |(final)|              |  |        +-------+  |d|  | |
  |  |    +------+               |  |        |invalid|<-+-+  | |
  |  |                           |  |        +-------+       | |
  |  +---------------------------+  |                        | |
  |                                  |        +-------+      | |
  |                                  |        | valid |<--+  | |
  |                                  |        |(final)|   |  | |
  |                                  |        +-------+   |  | |
  |                                  |           CHECK ---+  | |
  |                                  +------------------------+ |
  |                                                            |
  |  onDone (all regions final) --> 'completed'                |
  +-----------------------------------------------------------+

  +------------+
  | completed  |
  |  (final)   |
  +------------+
```

Configuration:

```typescript
states: {
  active: {
    type: 'parallel',
    states: {
      upload: {
        initial: 'idle',
        states: {
          idle: { on: { START: { target: 'uploading' } } },
          uploading: { on: { DONE: { target: 'done' } } },
          done: { type: 'final' },
        },
      },
      validation: {
        initial: 'pending',
        states: {
          pending: { on: { CHECK: { target: 'valid' } } },
          valid: { type: 'final' },
          invalid: { on: { RECHECK: { target: 'pending' } } },
        },
      },
    },
    onDone: { target: 'completed' },
  },
  completed: { type: 'final' },
}
```

- A parallel state declares `type: 'parallel'` with a `states` record where each child is a region
- Each region has its own `initial` state and transitions independently
- Events are delivered to ALL regions simultaneously; each region decides whether to transition
- The `onDone` transition fires only when ALL regions have reached a `final` state
- Regions do not share context -- they operate on the same machine-level context but transitions in one region do not block transitions in another

### 11.4 State Value for Parallel States

For parallel states, `stateValue` reflects the active state of every region simultaneously:

```
  Machine in state: active (parallel)
    upload region: 'uploading'
    validation region: 'valid'

  snapshot.stateValue  // { active: { upload: 'uploading', validation: 'valid' } }

  snapshot.matches('active')                      // true
  snapshot.matches('active.upload.uploading')      // true
  snapshot.matches('active.validation.valid')      // true
  snapshot.matches('active.upload.idle')            // false
```

```
  +-------------------------------------------+
  | Parallel stateValue structure              |
  |                                            |
  |  stateValue = {                            |
  |    active: {                               |
  |      upload: 'uploading',    <-- region 1  |
  |      validation: 'valid'     <-- region 2  |
  |    }                                       |
  |  }                                         |
  |                                            |
  |  Every region key is present               |
  |  Each region value is its active child     |
  +-------------------------------------------+
```

- The stateValue object contains an entry for every region under the parallel state
- Each region entry contains the active child state name (or a further nested object for compound-within-parallel)
- `matches()` with a path like `'active.upload.uploading'` drills through: parallel state -> region name -> region child state

### 11.5 History States

History states remember which child state was last active within a compound state, enabling "return to where you left off" semantics.

```
  +---------------------------------------------------+
  |  active  (type: 'compound', initial: 'step1')     |
  |                                                    |
  |  +-------+       +-------+       +-------+        |
  |  | step1 |--NEXT-| step2 |--NEXT-| step3 |        |
  |  +-------+       +-------+       +-------+        |
  |                       ^           (final)          |
  |                       |                            |
  |  +------+             |                            |
  |  | hist |             |                            |
  |  | type: 'history'    |                            |
  |  | history: 'shallow' |                            |
  |  +------+             |                            |
  |      ^  |             |                            |
  |      |  +---restores--+                            |
  |      |                                             |
  +------+---------------------------------------------+
         |
         |  RESUME (transitions to 'active.hist')
         |
  +----------+
  |  paused  |
  |          |---PAUSE (from active)
  +----------+

  Scenario:
    1. Machine in active.step1
    2. NEXT --> active.step2
    3. PAUSE --> paused           (history remembers 'step2')
    4. RESUME --> active.hist --> active.step2  (restored!)
```

Configuration:

```typescript
states: {
  active: {
    type: 'compound',
    initial: 'step1',
    states: {
      hist: { type: 'history', history: 'shallow' },
      step1: { on: { NEXT: { target: 'step2' } } },
      step2: { on: { NEXT: { target: 'step3' } } },
      step3: { type: 'final' },
    },
    on: {
      PAUSE: { target: '#root.paused' },
    },
  },
  paused: {
    on: {
      RESUME: { target: 'active.hist' },
    },
  },
}
```

- **Shallow history** (`history: 'shallow'`) -- remembers only the immediate child state of the compound parent
- **Deep history** (`history: 'deep'`) -- remembers the full nested state path (for compound states within compound states)
- History pseudo-states are not real states -- the machine never "rests" in a history state; it immediately resolves to the remembered state
- If no history has been recorded (first entry), the compound state's `initial` is used as the fallback
- History is tracked per compound state instance, not globally

### 11.6 Event Bubbling

Events propagate from the deepest active child state upward to parent states:

```
  Event: CANCEL

  +-----------------------------------------------+
  |  root                                          |
  |  on: { RESET: ... }                           |
  |                                                |
  |  +-------------------------------------------+ |
  |  |  active  (compound)                        | |
  |  |  on: { CANCEL: { target: '#root.error' } }| |
  |  |                                            | |
  |  |  +------+    +----------+                  | |
  |  |  | idle |    | loading  |  <-- current     | |
  |  |  +------+    | on: {}   |                  | |
  |  |              +----------+                  | |
  |  |                  |                         | |
  |  +------------------+-------------------------+ |
  |                     |                           |
  +---------------------+---------------------------+
                        |
                        v
  Event lookup order:
    1. loading.on['CANCEL']   --> not found
    2. active.on['CANCEL']    --> FOUND! transition to #root.error
    3. (root.on would be next if not found in active)
```

- When an event is received, the interpreter first checks the deepest active state's `on` map
- If no transition is found, the event propagates to the parent compound state's `on` map
- This continues up the state hierarchy until a handler is found or the root is reached
- The first matching transition (with a passing guard) is taken; propagation stops
- Events handled at a parent level apply to ALL descendant states (common cancel/reset patterns)

### 11.7 State ID References

The `#id` syntax provides absolute targeting for transitions that need to cross hierarchy boundaries:

```
  +---------------------------------------------------+
  |  #root                                             |
  |                                                    |
  |  +----------------------------+                    |
  |  |  #root.active              |   +-----------+    |
  |  |                            |   | #root.err |    |
  |  |  +--------+  +----------+ |   |  error     |    |
  |  |  | .idle  |  | .loading | |   +-----------+    |
  |  |  +--------+  +----------+ |                    |
  |  +----------------------------+                    |
  |                                                    |
  |  Transition from loading:                          |
  |    FAIL: { target: '#root.error' }                 |
  |                                                    |
  |  Without #id (relative):                           |
  |    SUCCESS: { target: 'idle' }                     |
  |    (targets sibling within same compound)          |
  +---------------------------------------------------+
```

- **Relative targets** (plain string like `'loading'`) -- resolve within the same compound state; target must be a sibling
- **Absolute targets** (`#id.path` like `'#root.error'`) -- resolve from the identified ancestor; the `#id` references a state's declared ID, and the path navigates from there
- The root machine implicitly has ID `#root` (or the machine's `id` property)
- Compound states can declare explicit IDs for targeting: `{ id: 'wizard', type: 'compound', ... }`
- ID references enable transitions that "break out" of a compound state to a completely different part of the tree

### 11.8 onDone Transitions

The `onDone` property on compound and parallel states defines what happens when the state "completes":

```
  Compound state completion:
  +--------------------------------+
  |  wizard  (compound)            |
  |                                |
  |  step1 --> step2 --> step3     |
  |                      (final)   |
  |                         |      |
  |  onDone: 'review' <----+      |
  +--------------------------------+
       |
       v
  +---------+
  | review  |
  +---------+

  Parallel state completion:
  +--------------------------------+
  |  processing  (parallel)        |
  |                                |
  |  [upload]    [validation]      |
  |   ...done    ...done           |
  |      |            |            |
  |      +-----+------+           |
  |            |                   |
  |  ALL final? --> onDone         |
  +--------------------------------+
       |
       v
  +---------+
  | results |
  +---------+
```

- **Compound `onDone`** -- triggered when any child reaches a `final` state; the compound state itself then transitions to the `onDone` target
- **Parallel `onDone`** -- triggered only when ALL regions have reached a `final` state simultaneously
- The `onDone` transition can include guards, actions, and effects just like regular transitions
- `onDone` is a special internal event (`xstate.done.state.<id>`) -- it is not dispatched via `send()` but generated internally by the interpreter when a final state is entered
- If a compound state has no `onDone`, reaching a final child state simply means the machine stays in that final child; events still bubble to the parent's `on` handlers

### 11.9 Type Safety for Nested States

The type system must validate nested state references at compile time:

```
  defineMachine({
    id: 'app',
    initial: 'active',
    states: {
      active: {
        type: 'compound',
        initial: 'idle',
        states: {
          idle: { on: { GO: { target: 'running' } } },    // OK: sibling
          running: { on: { STOP: { target: 'idle' } } },  // OK: sibling
        },
        on: {
          QUIT: { target: 'done' },           // OK: parent-level sibling
          BAD:  { target: 'nonexistent' },     // ERROR: not a valid state
        },
      },
      done: { type: 'final' },
    },
  });

  Type-level validation requirements:
  +-----------------------------------------------------+
  | 1. Child targets must be siblings within             |
  |    the same compound state                           |
  | 2. Parent-level on targets must be siblings          |
  |    of the compound state itself                      |
  | 3. #id references must resolve to existing states    |
  | 4. 'final' states cannot have outgoing transitions   |
  | 5. 'history' states cannot be transition targets     |
  |    (only history pseudo-state references like         |
  |    'compound.hist' are valid)                        |
  | 6. Parallel regions cannot be targeted directly      |
  |    (only their children can)                         |
  | 7. snapshot.matches() accepts only valid dot-paths   |
  +-----------------------------------------------------+
```

- The `StateNode` type must be extended to support `type`, `initial`, nested `states`, and `onDone` properties
- Child state names form a separate namespace scoped to their parent compound state -- they do not conflict with top-level state names
- The `InferMachineState` utility should produce a union of all reachable state paths (e.g., `'active' | 'active.idle' | 'active.running' | 'done'`) for compound machines
- The `matches()` method parameter type should be constrained to valid dot-paths derived from the state hierarchy
- `stateValue` return type should be inferred as the correct nested object structure based on the machine's state tree configuration
- Type errors for invalid targets should produce clear messages indicating which state name is invalid and what the valid options are

### 11.10 Implementation Phases

Advanced state features are implemented incrementally to manage complexity. Phase A is required for the initial release; Phases B and C are deferred.

| Feature                | Phase | Version | Priority |
| ---------------------- | ----- | ------- | -------- |
| Compound states        | A     | v0.1.0  | REQUIRED |
| Event bubbling         | A     | v0.1.0  | REQUIRED |
| onDone (compound)      | A     | v0.1.0  | REQUIRED |
| `#id` state references | A     | v0.1.0  | REQUIRED |
| stateValue (compound)  | A     | v0.1.0  | REQUIRED |
| matches() dot-paths    | A     | v0.1.0  | REQUIRED |
| Parallel states        | B     | v0.2.0  | DEFERRED |
| Multi-region delivery  | B     | v0.2.0  | DEFERRED |
| onDone (parallel ALL)  | B     | v0.2.0  | DEFERRED |
| History (shallow)      | C     | v0.2.0  | DEFERRED |
| History (deep)         | C     | v0.2.0  | DEFERRED |

- Phase A provides the foundation: compound states with event bubbling, completion detection, and cross-hierarchy targeting cover the majority of real-world hierarchical state machine use cases
- Phases B and C are deferred because parallel regions and history states add significant interpreter complexity and are needed less frequently in typical DI-integrated flows
- All type-level validation (section 11.9) is implemented alongside each phase's features

### 11.11 Interpreter Algorithm for Compound States

The flat `transition()` algorithm from spec 08 Section 10.2 is extended to support the compound state hierarchy. The following algorithms define the Phase A behavior.

**Active State Path Computation:**

The active state path is the ordered list of states from the root to the deepest active child:

```
computeActiveStatePath(machine, currentStateValue):
  path = [root]
  node = machine.states[root]
  value = currentStateValue

  while node.type === 'compound':
    childName = (typeof value === 'string') ? value : Object.keys(value)[0]
    path.push(childName)
    node = node.states[childName]
    value = (typeof value === 'string') ? childName : value[childName]

  return path   // e.g., ['root', 'active', 'loading']
```

- For flat states, the path is a single element: `[currentState]`
- For nested compound states, the path descends through each compound's active child

**Event Bubbling Algorithm:**

When an event is received, the interpreter walks the active state path from deepest child to root, finding the first matching transition:

```
bubbleEvent(activeStatePath, event, machine):
  // Walk from deepest to root
  for i = activeStatePath.length - 1 downto 0:
    stateNode = resolveStateNode(machine, activeStatePath[0..i])
    transitions = stateNode.on[event.type]

    if transitions is defined:
      // Normalize to array and evaluate guards in definition order
      for each candidate in normalizeTransitions(transitions):
        if candidate.guard is undefined OR candidate.guard(context, event):
          return { matched: true, stateNode, candidate, depth: i }

  return { matched: false }
```

- The first matching transition (with a passing guard) at the deepest level wins
- If no child handles the event, it bubbles to the parent's `on` map
- Bubbling stops at the root; if no match is found anywhere, the event is ignored (`transitioned: false`)

**StateValue Computation Algorithm:**

`stateValue` is computed from the active state path as a nested object:

```
computeStateValue(activeStatePath):
  if activeStatePath.length === 1:
    return activeStatePath[0]     // flat state: 'idle'

  // Build nested object from root to leaf
  result = activeStatePath[activeStatePath.length - 1]
  for i = activeStatePath.length - 2 downto 0:
    result = { [activeStatePath[i]]: result }

  return result   // e.g., { active: { editing: 'unsaved' } }
```

**Exit/Entry Effect Ordering for Compound Transitions:**

Effect ordering depends on the relationship between source and target states within the compound hierarchy:

1. **Sibling transition within a compound state** (e.g., `active.idle` → `active.loading`):
   - Exit effects: `idle.exit` only (parent `active` is NOT exited)
   - Transition effects: `transition.effects`
   - Entry effects: `loading.entry` only (parent `active` is NOT re-entered)

2. **Breaking out of a compound state** (e.g., `active.loading` → `#root.error`):
   - Exit effects: `loading.exit` then `active.exit` (bottom-up, deepest child first)
   - Transition effects: `transition.effects`
   - Entry effects: `error.entry`

3. **Entering a compound state from outside** (e.g., `error` → `active`):
   - Exit effects: `error.exit`
   - Transition effects: `transition.effects`
   - Entry effects: `active.entry` then `active.initial.entry` (top-down, parent first then initial child)

4. **Self-transition on a compound state** (e.g., `active` → `active`):
   - Exit effects: deepest child exit, then parent exit (bottom-up)
   - Transition effects: `transition.effects`
   - Entry effects: parent entry, then initial child entry (top-down, resets to initial)

The general rule: exit effects fire bottom-up from the deepest active child to the least common ancestor (exclusive); entry effects fire top-down from the least common ancestor (exclusive) to the deepest target child. This is consistent with the Statecharts formalism and the existing flat algorithm from spec 08 Section 10.2 (which is the degenerate case where the path has length 1).
