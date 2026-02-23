# @hex-di/graph

> See [LOGO-BRIEF.md](./LOGO-BRIEF.md) for shared brand context, color family, and technical specs.

## What It Is

Compile-time dependency graph validation. The GraphBuilder accumulates adapters, validates the DAG (no cycles, no missing deps, no captive dependencies), and produces a typed Graph.

## Role & Metaphor

**The Validated Blueprint.** Before anything runs, the graph layer examines the entire dependency map and certifies it correct. Like a structural engineer approving blueprints before construction begins.

## Key Concepts to Convey

- Directed Acyclic Graph (DAG): nodes connected with arrows
- Validation: a checkmark or seal of approval
- Compile-time safety: this happens before runtime
- Dependencies flowing downward from parent to children

## Visual Direction

- A hexagonal frame containing a small DAG inside: one root node splitting to two child nodes with directed arrows
- Below the DAG, a bold checkmark indicating "validated"
- The hexagon is the frame/boundary, the DAG is the content, the checkmark is the seal

## Signature Color

`#0D9488` (teal) - trust, verification, analytical

## Designer Prompt

> Design a minimal geometric logo icon (200x200 SVG) of a thin hexagon outline (#0D9488 teal, stroke 4px) framing an internal directed graph: one filled circle at top connected by two lines with chevron arrowheads to two filled circles below (a 1-to-2 DAG). Below this graph, inside the hexagon, place a bold checkmark. All elements in teal (#0D9488). Circle radius 12px, checkmark stroke 7px. Conveys: "validated dependency graph enclosed in a hexagonal boundary." No text. Dark background friendly.
