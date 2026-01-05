# Specification: DevTools Plugin Architecture

## Goal

Transform HexDiDevTools from a monolithic component into a plugin-based architecture where all business logic lives in a DevTools Runtime (outside React), and plugins contribute tabs through a minimal, statically-registered interface.

## User Stories

- As a developer, I want to customize DevTools with my own plugins (MCP, A2A, chat) so that I can extend debugging capabilities for my specific use cases
- As a library consumer, I want preset plugin configurations so that I can get started quickly without manual setup

## Specific Requirements

**DevTools Runtime Core**

- Create `DevToolsRuntime` as the single source of truth for all DevTools state
- Implement hybrid pattern: events for changes, commands for actions, selectors for derived state
- Runtime must be framework-agnostic (no React dependencies)
- Use `useSyncExternalStore` pattern for React integration
- State includes: active tab, selected containers, tracing data, plugin instances
- All state mutations happen through `dispatch(command)` API

**Plugin Interface Definition**

- Define minimal `DevToolsPlugin` interface with id, label, icon, shortcuts, component
- Plugin `component` receives `PluginProps` containing runtime access
- Plugin id must be unique string (collision check at registration)
- Shortcuts array defines keyboard bindings with key, action, description
- Component is `React.ComponentType<PluginProps>` - plugins own their rendering

**Static Plugin Registration**

- Plugins registered at `createDevToolsRuntime()` call only
- Plugin list is immutable after runtime creation
- No hot-reload, dynamic loading, or runtime plugin addition
- Child scopes can create new runtimes with different plugin sets if needed
- Validate plugin id uniqueness at registration time

**Preset Plugin Functions**

- Implement `defaultPlugins()` returning Graph, Services, Tracing, Inspector
- Implement `minimalPlugins()` returning Services, Inspector only
- Presets return `readonly DevToolsPlugin[]` for composition
- Users can spread presets and add custom plugins: `[...defaultPlugins(), MyPlugin()]`
- Each built-in plugin is a factory function for consistent API

**Tab System Architecture**

- One plugin equals one tab in the DevTools panel
- Tabs render in static registration order (no user reordering)
- Tab navigation uses existing `TabNavigation` component pattern
- Active tab state managed by runtime, not individual plugins
- No shared UI contributions - plugins render only within their tab

**React Integration Layer**

- `DevToolsRuntimeProvider` context wraps application
- `useDevToolsRuntime()` hook returns runtime instance
- Plugin components receive `PluginContext` with runtime access
- Use `useSyncExternalStore` for subscription to runtime state
- Thin React wrapper - components are stateless views over runtime

**Built-in GraphPlugin**

- Extract current graph visualization into standalone plugin
- Uses `buildExportedGraphFromContainer` utility from existing code
- Supports multi-container graph display via runtime selectors
- Leverages existing `DependencyGraph` component internally

**Built-in ServicesPlugin**

- Extract `EnhancedServicesView` into standalone plugin
- Accesses service info through runtime selectors
- Maintains current filtering/search functionality within plugin
- Uses existing `ServiceInfo` types and patterns

**Built-in TracingPlugin**

- Extract `ResolutionTracingSection` into standalone plugin
- Timeline, Tree, and Summary sub-views remain internal to plugin
- Tracing state (paused, threshold, filters) managed by runtime
- Uses existing `TracingAPI` integration pattern

**Built-in InspectorPlugin**

- Extract `ContainerInspector` into standalone plugin
- Container selector for multi-container support
- Scope hierarchy visualization
- Phase and metadata display from `InspectorAPI`

## Existing Code to Leverage

**`packages/devtools/src/react/devtools-panel.tsx`**

- Contains current monolithic implementation with tabs
- Tab content implementations can be extracted into plugins
- Tab state management pattern to replicate in runtime
- GraphView, ServicesView internal components are extraction candidates

**`packages/devtools/src/react/tab-navigation.tsx`**

- `TabNavigation` component with ARIA-compliant keyboard navigation
- `TabId` type can be generalized to plugin ids
- Tab styling and hover states to preserve
- `TAB_CONFIGS` pattern to replace with dynamic plugin list

**`packages/runtime/src/plugin/types.ts`**

- `Plugin` interface pattern for dependency injection plugins
- Symbol-based API access pattern (different purpose but similar structure)
- `PluginContext` pattern for providing dependencies to plugins
- Lifecycle hooks pattern may inform DevTools plugin lifecycle

**`packages/inspector/src/types.ts`**

- `InspectorAPI` interface for container inspection
- `InspectorWithSubscription` for push-based updates
- Event types for real-time updates
- `hasSubscription` type guard pattern

**`packages/devtools/src/react/hooks/index.ts`**

- Existing hooks for tracing, container list, inspector
- `useContainerTree` for automatic container discovery
- Subscription patterns using `useSyncExternalStore`
- These hooks can wrap runtime selectors in new architecture

## Out of Scope

- Plugin marketplace or discovery mechanism
- Remote or dynamic plugin loading from URLs
- Plugin versioning or compatibility checking
- Inter-plugin dependencies or communication
- Plugin hot-reloading or live updates
- Plugin state persistence across sessions
- Plugin sandboxing or isolation
- Plugin-to-plugin direct communication
- Settings UI for plugin configuration
- Async plugin initialization or lazy loading
- User-configurable tab ordering or hiding
- Plugin lifecycle hooks beyond mount/unmount
