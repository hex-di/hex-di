# Huly — Plugin System

**Source:** https://github.com/hcengineering/platform/tree/main/packages/platform, https://github.com/hcengineering/platform/tree/main/plugins
**Captured:** 2026-02-28

---

## Platform Resource Identifiers (PRI)

The foundation of Huly's plugin system is the **Platform Resource Identifier (PRI)** — a structured string that uniquely identifies any resource in the platform:

```
plugin:category.name
```

### PRI Structure

| Component  | Description                         | Example                                  |
| ---------- | ----------------------------------- | ---------------------------------------- |
| `plugin`   | Plugin that owns the resource       | `tracker`, `core`, `chunter`             |
| `category` | Resource category within the plugin | `class`, `string`, `action`, `component` |
| `name`     | Specific resource name              | `Issue`, `CreateIssue`, `IssuePresenter` |

### PRI Examples

```typescript
"core:class.Doc"; // The Doc class in core plugin
"tracker:class.Issue"; // The Issue class in tracker plugin
"chunter:component.Chat"; // The Chat UI component in chunter plugin
"hr:string.Department"; // The "Department" i18n string in HR plugin
"tracker:action.CreateIssue"; // The CreateIssue action in tracker plugin
```

### PRI Type System

```typescript
// PRI is a branded string type
type Resource<T> = string & { __resource: T };

// Strongly-typed references to specific resource kinds
type Ref<T extends Doc> = Resource<T>; // Document reference
type IntlString = Resource<string>; // Internationalized string
type Asset = Resource<string>; // Static asset (icon, image)
type AnyComponent = Resource<ComponentType>; // Svelte component
```

---

## Plugin Factory

Plugins are defined using the `plugin()` factory, which creates a typed resource map:

```typescript
// packages/platform/src/platform.ts
export function plugin<N extends string, T extends PluginDescriptor>(
  id: N,
  descriptor: T
): Plugin<T> & { id: N };

// Usage — defining the tracker plugin's resources
const tracker = plugin("tracker" as Plugin, {
  class: {
    Issue: "" as Ref<Class<Issue>>,
    IssueStatus: "" as Ref<Class<IssueStatus>>,
    Project: "" as Ref<Class<Project>>,
    Sprint: "" as Ref<Class<Sprint>>,
  },
  component: {
    Issues: "" as AnyComponent,
    IssuePresenter: "" as AnyComponent,
    CreateIssue: "" as AnyComponent,
  },
  action: {
    CreateIssue: "" as Ref<Action>,
    DeleteIssue: "" as Ref<Action>,
  },
  string: {
    Issue: "" as IntlString,
    Project: "" as IntlString,
  },
});
```

The `plugin()` factory:

1. Registers the plugin ID with the platform
2. Returns a typed object where each property is a PRI string
3. Enables compile-time type checking of resource references across plugins

---

## Lazy Loading — `addLocation()` / `getResource()`

Huly uses **lazy loading** for plugin resources. Plugins are not loaded at startup — they are resolved on demand:

### `addLocation()` — Register a Plugin's Loading Entry Point

```typescript
// Register where to find the tracker plugin's resources
addLocation(tracker.id, () => import("@hcengineering/tracker-resources"));
```

### `getResource()` — Resolve a Resource on Demand

```typescript
// Resolves the PRI and returns the actual resource (component, function, etc.)
const IssuePresenter = await getResource(tracker.component.IssuePresenter);
// Returns the actual Svelte component
```

### Resolution Flow

```
getResource('tracker:component.IssuePresenter')
     │
     ▼
Platform checks if 'tracker' plugin is loaded
     │
     ├── Yes → Return cached resource
     │
     └── No → Call registered location factory
              │
              ▼
         import('@hcengineering/tracker-resources')
              │
              ▼
         Plugin module exports resources
              │
              ▼
         Cache and return the resource
```

---

## Three-Part Plugin Pattern

Each Huly plugin follows a **three-part pattern**:

```
┌─────────────────────────────────────────────────────────┐
│                      Plugin "tracker"                     │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Core        │  │   Assets      │  │  Resources    │  │
│  │  (types +     │  │  (i18n +      │  │  (components  │  │
│  │   PRI map)    │  │   icons)      │  │   + logic)    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  @hcengineering/  @hcengineering/  @hcengineering/      │
│  tracker          tracker-assets   tracker-resources     │
└─────────────────────────────────────────────────────────┘
```

| Part          | Package                            | Contents                                     | Loaded               |
| ------------- | ---------------------------------- | -------------------------------------------- | -------------------- |
| **Core**      | `@hcengineering/tracker`           | TypeScript interfaces, PRI map, plugin ID    | Always (lightweight) |
| **Assets**    | `@hcengineering/tracker-assets`    | i18n strings, icons, static assets           | On demand            |
| **Resources** | `@hcengineering/tracker-resources` | Svelte components, action handlers, UI logic | On demand (lazy)     |

### Why Three Parts?

- **Core** is always loaded — it defines the contract (types + resource identifiers)
- **Assets** are loaded when the UI needs display strings and icons
- **Resources** are loaded only when the plugin's actual functionality is needed
- This minimizes initial bundle size and startup time

---

## Plugin Configuration

Plugins can be enabled/disabled and configured per workspace:

```typescript
interface PluginConfiguration {
  // Whether the plugin is enabled
  enabled: boolean;
  // Plugin-specific settings
  settings?: Record<string, unknown>;
}
```

### Configuration Resolution

```typescript
// Server-side configuration
const config: WorkspaceConfiguration = {
  plugins: {
    tracker: { enabled: true },
    hr: { enabled: true },
    love: { enabled: false }, // Video calls disabled
  },
};
```

---

## Plugin Count and Categories

Huly has **~192 packages** organized by concern:

| Category            | Count | Examples                                                   |
| ------------------- | ----- | ---------------------------------------------------------- |
| Core platform       | ~15   | `platform`, `core`, `query`, `presentation`                |
| Domain models       | ~30   | `model-core`, `model-tracker`, `model-hr`, `model-chunter` |
| UI plugins          | ~40   | `tracker-resources`, `chunter-resources`, `hr-resources`   |
| Server plugins      | ~20   | `server-tracker`, `server-hr`, `server-notification`       |
| Services            | ~15   | `ai-bot`, `collaborator`, `analytics`, `sign`              |
| Shared libraries    | ~50   | `ui`, `text-editor`, `kanban`, `calendar`                  |
| Integration plugins | ~15   | `github`, `telegram`, `gmail`, `bitrix`                    |
| Tooling             | ~7    | `dev-tool`, `dev-storage`, `rush.json` config              |

---

## Decorator-Based Model Definitions

Huly uses TypeScript decorators to define data models that generate runtime metadata:

```typescript
import { Model, Prop, Index, Collection, Mixin } from "@hcengineering/model";

@Model(tracker.class.Issue, core.class.Doc, DOMAIN_TRACKER)
export class TIssue extends TDoc implements Issue {
  @Prop(TypeString(), tracker.string.Identifier)
  identifier!: string;

  @Prop(TypeRef(tracker.class.IssueStatus), tracker.string.Status)
  status!: Ref<IssueStatus>;

  @Prop(TypeNumber(), tracker.string.Priority)
  priority!: IssuePriority;

  @Collection(tracker.class.Issue)
  subIssues!: number;

  @Index(IndexKind.FullText)
  @Prop(TypeString(), tracker.string.Title)
  title!: string;
}
```

### Decorator Purposes

| Decorator                         | Purpose                                                   |
| --------------------------------- | --------------------------------------------------------- |
| `@Model(class, extends, domain?)` | Registers class in the meta-model                         |
| `@Prop(type, label)`              | Declares a property with its type descriptor and UI label |
| `@Collection(class)`              | Declares a reverse-reference collection (stored as count) |
| `@Index(kind)`                    | Marks property for indexing (FullText, Indexed)           |
| `@Mixin(class, extends)`          | Declares a mixin class                                    |

---

## SpecForge Relevance

| Huly Concept                                  | SpecForge Parallel                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------- |
| PRI (`plugin:category.name`)                  | SpecForge's port naming: `port<T>()({ name, category })`                  |
| `plugin()` factory → typed resource map       | SpecForge's `port()` / `createAdapter()` factory pattern                  |
| `addLocation()` lazy loading                  | SpecForge's lazy adapter resolution via `graph.resolve()`                 |
| `getResource()` on-demand resolution          | SpecForge's `container.get(PortRef)` — resolve service on demand          |
| Three-part plugin (core + assets + resources) | SpecForge's port (contract) + adapter (implementation) separation         |
| `PluginConfiguration` enable/disable          | SpecForge's conditional adapter registration in graph builder             |
| Decorator-based model definitions             | SpecForge's builder-pattern definitions (functional, not decorators)      |
| ~192 plugins                                  | SpecForge's modular library architecture (each lib is a concern boundary) |
