# Feature: Child Container

## Initial Description

In the HexDi library we need to introduce the child container. A child container is a container that gets the scope of a parent container so it can consume all the parent container's services and also can override them for its own scope (override only affects the child container, not the parent).

## Context from Research

Based on codebase analysis:
- There appears to be existing work on child containers in the dist folder (child-container.ts, child-container-builder.ts)
- The current Container/Scope architecture already supports:
  - Singleton lifetime (shared across container and scopes)
  - Scoped lifetime (per-scope instances)
  - Request lifetime (fresh per resolution)
- Scopes (via `createScope()`) inherit singletons from parent but have isolated scoped instances
- The testing package has `TestGraphBuilder` for overriding adapters

## Key Differentiators from Existing Scope

The child container differs from the existing Scope mechanism in that:
1. Child containers can **override** adapters (replace parent's implementation)
2. Child containers can **extend** the graph with new ports/adapters not in parent
3. Child containers have their own isolated singleton cache (not just scoped)
4. The override only affects the child, not the parent container
