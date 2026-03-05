# STR-015: Keyboard Shortcut Store

## Overview

The Keyboard Shortcut Store acts as a central registrar for keyboard bindings. UI elements register shortcuts on mount and unregister on unmount. The app shell listens for `keydown` events, resolves the pressed key against registered bindings, and dispatches the corresponding action.

**Hook:** `useKeyboardShortcut()`

---

## State Shape

```
+----------------------+-------------------------------------------------------+
| Field                | Type                                                  |
+----------------------+-------------------------------------------------------+
| registeredShortcuts  | Record<string, ShortcutBinding>                       |
+----------------------+-------------------------------------------------------+
```

The record is keyed by a composite ID of the form `"context:key"` (e.g., `"global:/"`, `"search:Escape"`).

### ShortcutBinding

```
+-------------------+----------------------------------------------------------+
| Field             | Type                                                     |
+-------------------+----------------------------------------------------------+
| key               | string (KeyboardEvent.key value)                         |
| modifiers         | ("ctrl" | "shift" | "alt" | "meta")[]                    |
| action            | string (action identifier to dispatch)                   |
| context           | "global" | "search" | "chat" | "graph"                   |
| description       | string (human-readable, for help/accessibility)          |
+-------------------+----------------------------------------------------------+
```

---

## Selectors

| Selector              | Parameters | Description                                            |
| --------------------- | ---------- | ------------------------------------------------------ |
| `shortcutsForContext` | `context`  | Returns all bindings registered for the given context. |

---

## Registration Flow

```
Component mounts
  |
  +--> useKeyboardShortcut("global:/", { key: "/", action: "open-search", ... })
  |      |
  |      +--> dispatch REG-001 { id: "global:/", binding: {...} }
  |              --> registeredShortcuts["global:/"] = binding
  |
Component unmounts
  |
  +--> cleanup callback
         |
         +--> dispatch REG-002 { id: "global:/" }
                --> delete registeredShortcuts["global:/"]
```

### Event-to-Field Mapping

| Event   | Field               | Operation               |
| ------- | ------------------- | ----------------------- |
| REG-001 | registeredShortcuts | set (merge new binding) |
| REG-002 | registeredShortcuts | remove (delete by key)  |

---

## Default Bindings

These bindings are registered by the app shell (PG-010) on mount:

| Key      | Modifiers | Action        | Context | Description                 |
| -------- | --------- | ------------- | ------- | --------------------------- |
| `/`      | (none)    | open-search   | global  | Open search overlay         |
| `Escape` | (none)    | close-overlay | global  | Close active overlay        |
| `k`      | meta      | open-search   | global  | Open search overlay (Cmd+K) |

---

## Keydown Resolution Algorithm

When a `keydown` event fires:

```
1. Build lookup key from event:
     compositeId = context + ":" + event.key

2. Check modifier match:
     binding.modifiers.every(mod => event[mod + "Key"] === true)

3. Prevent default if match found:
     event.preventDefault()

4. Dispatch the binding's action:
     dispatch(binding.action)
```

### Context Priority

When multiple contexts could match (e.g., a `"search"` overlay is open over a `"global"` context), the most specific context wins:

1. Active overlay context (e.g., `"search"`)
2. Active view context (e.g., `"graph"`)
3. `"global"` (always active)

---

## Design Rationale

1. **Registrar pattern:** Instead of hardcoding shortcuts in a central switch statement, each component self-registers its bindings. This decouples shortcut definitions from the app shell and makes them composable.

2. **Composite key ID:** Using `"context:key"` as the record key enables O(1) lookup during keydown handling and prevents collisions between the same key in different contexts (e.g., `Escape` in `global` vs. `search`).

3. **Context scoping:** Shortcuts are scoped to contexts so that `Escape` in the search overlay closes the overlay, while `Escape` at the global level might do nothing or close a different panel. The resolution algorithm respects context priority.

4. **Cleanup on unmount:** The unregister mechanism (REG-002) prevents stale shortcuts from persisting when a component that registered them is removed from the tree. This is critical for overlay-mounted shortcuts.

5. **No persistence:** Keyboard bindings are re-registered on every app load from component mount effects. There is no need to persist them.

---

## Cross-References

- **Consumers:** PG-010-app-shell, CMP-003-search-overlay
- **Events:** REG-001 (shortcut-registered), REG-002 (shortcut-unregistered)
- **Related stores:** STR-012 (search store -- `open-search` and `close-overlay` actions)
- **Related stores:** STR-014 (router store -- context depends on active view)
