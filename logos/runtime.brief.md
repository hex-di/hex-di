# @hex-di/runtime

> See [LOGO-BRIEF.md](./LOGO-BRIEF.md) for shared brand context, color family, and technical specs.

## What It Is

The execution engine. Creates containers from validated graphs, resolves services, manages scope hierarchies, handles lifecycle (creation, disposal), and enforces lifetime rules.

## Role & Metaphor

**The Execution Engine.** If the graph is the blueprint, runtime is the factory floor that actually builds and manages the services. It's the operating system of dependency injection - managing lifecycles, scopes, and resolution.

## Key Concepts to Convey

- Execution: something running, active, alive
- Container: an enclosed space holding resolved services
- Scope hierarchy: nested layers/levels
- Resolution: turning a port into an actual service instance (the dot in the center)

## Visual Direction

- A hexagonal outline (the container) with angular curly braces `{ }` inside (code execution)
- A single dot in the center between the braces (the resolved service)
- The curly braces reference code/runtime execution
- The hexagon frames everything as "contained"

## Signature Color

`#7C3AED` (violet/purple) - the runtime is the heart of the system

## Designer Prompt

> Design a minimal geometric logo icon (200x200 SVG) of a thin hexagon outline (#7C3AED violet, stroke 4px) containing two angular curly braces `{ }` in bold strokes (stroke 7px, rounded caps) flanking a centered filled dot (radius 8px). The braces should be geometric/angular (not font-rendered), with a clear indentation pattern. All elements in violet (#7C3AED). Conveys: "runtime execution container that resolves services." No text. Dark background friendly.
