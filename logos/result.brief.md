# @hex-di/result

> See [LOGO-BRIEF.md](./LOGO-BRIEF.md) for shared brand context, color family, and technical specs.

## What It Is

Rust-style `Result<T, E>` and `Option<T>` types for TypeScript. All errors are values, never thrown. The foundational error-handling vocabulary.

## Role & Metaphor

**The Bifurcated Path.** Every operation has exactly two outcomes: success (Ok) or failure (Err). The logo should convey this binary branching - a single input splitting into two guaranteed, typed channels.

## Key Concepts to Convey

- Duality: Ok vs Err, success vs failure
- Containment: errors are wrapped, not thrown
- Branching: one path becomes two
- Safety: both paths are handled

## Visual Direction

- A hexagon split into two halves (left = success, right = error)
- Or: a hexagonal shape with a vertical dividing line, each half containing a distinct symbol
- Left half: checkmark (Ok) / Right half: X mark (Err)
- The split should feel clean and intentional, not broken

## Signature Colors

- Ok side: `#10B981` (emerald green)
- Err side: `#F97316` (orange)
- Combined effect: the hexagon is whole but contains both outcomes

## Designer Prompt

> Design a minimal geometric logo icon (200x200 SVG) of a hexagon cleanly split down its vertical center into two halves. The left half is filled emerald green (#10B981) with a negative-space checkmark symbol. The right half is filled orange (#F97316) with a negative-space X symbol. A thin white vertical line separates the halves. The overall shape remains a complete hexagon. The symbols should be bold enough to read at 32px. Conveys: "every operation has two typed outcomes." No text. Dark background friendly.
