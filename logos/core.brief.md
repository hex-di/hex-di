# @hex-di/core

> See [LOGO-BRIEF.md](./LOGO-BRIEF.md) for shared brand context, color family, and technical specs.

## What It Is

The foundational layer: ports (typed service contracts), adapters (implementations), error types, inspection primitives. Zero-dependency foundation of the entire framework.

## Role & Metaphor

**The Hexagonal Circuit Board.** Core defines the vocabulary - the connection points (ports) where services plug in. Like a circuit board with clearly defined pin-outs, every connection point is typed and named.

## Key Concepts to Convey

- Ports: connection points on a hexagon's vertices
- Adapters: things that plug into ports
- Foundation: the base everything else builds on
- Circuit/schematic precision

## Visual Direction

- A hexagon outline where each vertex is a distinct node/circle (6 port nodes)
- The edges between vertices have gaps (disconnected segments), emphasizing that ports are connection points, not a closed wall
- Each vertex node is a filled circle = a port
- The hex edges are line segments between ports, not a continuous outline

## Signature Color

`#1D4ED8` (royal blue) - foundational, trustworthy, structural

## Designer Prompt

> Design a minimal geometric logo icon (200x200 SVG) of a hexagon shape formed by 6 short line segments with gaps at each vertex, and 6 filled circles (nodes) at each vertex position. The line segments connect adjacent nodes but stop short of touching them, creating visible gaps. This forms a "circuit board" hexagon with 6 port connection points. All elements in a single color: royal blue (#1D4ED8). Stroke width 6px for lines, circles radius 9px. Conveys: "a hexagonal circuit with 6 typed connection ports." No text. Dark background friendly.
