# Phase 19: Polish - Research

**Researched:** 2026-02-05
**Domain:** Error messaging, developer experience (DX), technical documentation
**Confidence:** HIGH

## Summary

Phase 19 focuses on two complementary areas: **error experience** and **technical documentation**. The goal is to help developers quickly fix issues when they occur and understand the system's internal architecture.

For error experience, the codebase already has a solid foundation with structured error classes (ContainerError hierarchy) and template literal error types (ERROR[TYPE-XX] pattern from Phase 17). The task is to enhance these with:

1. Programmatic `suggestion` properties on runtime errors
2. Copy-paste-ready code examples in error messages
3. "Did you mean?" suggestions using Levenshtein distance

For documentation, this involves writing prose documentation explaining:

1. Container lifecycle and resolution flow
2. Module organization and responsibilities
3. Design decisions (branded types, phase-dependent resolution)
4. Enhancing existing JSDoc with `@typeParam` documentation

**Primary recommendation:** Build on existing error infrastructure, use simple hand-rolled Levenshtein algorithm (no external deps), follow graph/ARCHITECTURE.md as documentation template.

## Standard Stack

### Core

| Library              | Version | Purpose                     | Why Standard                                          |
| -------------------- | ------- | --------------------------- | ----------------------------------------------------- |
| TypeScript           | 5.6+    | Type system and JSDoc       | Already in use, provides `@typeParam` support         |
| Vitest               | 4.x     | Testing error messages      | Already in use, can validate error output             |
| None for Levenshtein | N/A     | String distance calculation | Simple algorithm (<30 LOC), avoid adding dependencies |

### Supporting

No additional libraries needed. The phase builds on existing infrastructure:

- Existing `ContainerError` hierarchy in `packages/runtime/src/errors/index.ts`
- Existing template literal error types in `packages/runtime/src/types/validation-errors.ts`
- Existing JSDoc patterns throughout codebase

### Alternatives Considered

| Instead of              | Could Use                         | Tradeoff                                                                               |
| ----------------------- | --------------------------------- | -------------------------------------------------------------------------------------- |
| Hand-rolled Levenshtein | `fastest-levenshtein` npm package | External dependency vs 20-30 lines of code; hand-rolled wins for such simple algorithm |
| Prose docs              | JSDoc only                        | Architectural concepts need narrative explanation, not just API reference              |
| Mermaid diagrams        | ASCII art                         | Mermaid provides better visual clarity and is already used in planning docs            |

**Installation:**

No new packages needed.

## Architecture Patterns

### Recommended Project Structure

```
packages/runtime/
├── src/
│   ├── errors/
│   │   └── index.ts                    # Error classes [MODIFY - add suggestion property]
│   ├── types/
│   │   └── validation-errors.ts        # Template literal errors [MODIFY - add examples]
│   ├── util/
│   │   └── string-similarity.ts        # Levenshtein distance [CREATE]
│   └── container/
│       ├── base-impl.ts                # [MODIFY - add did-you-mean to resolution errors]
│       └── ...
├── docs/
│   ├── runtime-architecture.md         # [CREATE] Architecture documentation
│   └── design-decisions.md             # [CREATE] Key design decisions explained
└── tests/
    └── error-suggestions.test.ts       # [CREATE] Test error messages and suggestions
```

### Pattern 1: Structured Error with Suggestions

**What:** Enhance ContainerError subclasses with optional `suggestion` property containing actionable fix guidance.

**When to use:** All programming errors (`isProgrammingError: true`) should include suggestions. Runtime errors (factory failures) typically don't need suggestions since the fix depends on the factory's context.

**Example:**

```typescript
// Enhanced ScopeRequiredError
export class ScopeRequiredError extends ContainerError {
  readonly code = "SCOPE_REQUIRED" as const;
  readonly isProgrammingError = true as const;
  readonly portName: string;
  readonly suggestion: string; // NEW

  constructor(portName: string) {
    super(
      `Cannot resolve scoped port '${portName}' from the root container. ` +
        `Scoped ports must be resolved from a scope created via createScope().`
    );
    this.portName = portName;

    // NEW: Actionable suggestion with code example
    this.suggestion =
      `Create a scope before resolving:\n\n` +
      `  const scope = container.createScope();\n` +
      `  const service = scope.resolve(${portName}Port);`;
  }
}
```

### Pattern 2: Template Literal Error with Examples

**What:** Enhance compile-time template literal errors to include copy-paste-ready code examples.

**When to use:** Type-level errors (ERROR[TYPE-XX]) where developers need to modify their code to fix the issue.

**Example:**

```typescript
export type PortNotInGraphError<
  TPortName extends string,
  TAvailable extends Port<unknown, string>,
> = `ERROR[TYPE-01]: Port '${TPortName}' not found in graph.

Available ports: ${PortUnionToString<TAvailable>}

Fix: Add adapter for '${TPortName}' to graph before creating override.

Example:
  const graph = GraphBuilder.create()
    .provide(${TPortName}Adapter)  // ← Add this adapter
    .provide(...)
    .build();`;
```

### Pattern 3: Did-You-Mean Port Resolution

**What:** When a port name doesn't exist, calculate Levenshtein distance to all available ports and suggest the closest match if distance ≤ 2.

**When to use:** Runtime resolution errors where the port name doesn't match any registered port. This typically only applies if ports are resolved dynamically by name (which the current API doesn't support), so this may be for future extensibility or error messages that include port names.

**Example:**

```typescript
// In container resolution code when port not found
function suggestSimilarPort(attemptedName: string, availablePorts: string[]): string | undefined {
  const MIN_SIMILARITY = 0.6; // 60% similarity threshold
  const MAX_DISTANCE = 2; // Max 2 character edits

  let bestMatch: string | undefined;
  let bestDistance = Infinity;

  for (const portName of availablePorts) {
    const distance = levenshteinDistance(attemptedName, portName);
    if (distance <= MAX_DISTANCE && distance < bestDistance) {
      bestMatch = portName;
      bestDistance = distance;
    }
  }

  return bestMatch;
}

// Usage in error message
const suggestion = similar
  ? `Did you mean '${similar}'?`
  : `Available ports: ${availablePorts.join(", ")}`;
```

### Pattern 4: Architecture Documentation Structure

**What:** Follow the structure established in `packages/graph/ARCHITECTURE.md` for consistency.

**When to use:** When creating `runtime-architecture.md` and `design-decisions.md`.

**Structure:**

1. Package position in ecosystem (layer diagram)
2. Layer responsibilities and dependency rules
3. Core patterns (e.g., branded types, phase tracking)
4. Key abstractions (Container, Scope, resolution engine)
5. Lifecycle state machine
6. Module organization
7. Internal vs public API boundaries

**Example sections:**

- "Container Lifecycle State Machine" - explains uninitialized → initialized transition
- "Resolution Flow" - explains sync vs async resolution, hook execution order
- "Branded Types" - explains why Container/Scope use brands instead of classes
- "Phase-Dependent Resolution" - explains type-state pattern for async initialization

### Anti-Patterns to Avoid

- **Overly clever suggestions:** Keep suggestions literal and copy-paste-ready, don't try to infer user intent beyond the immediate error.
- **Vague error messages:** "Something went wrong" is never acceptable; always include the port name, operation, and context.
- **Documentation that duplicates JSDoc:** Architecture docs explain concepts and design decisions, not API usage (that's what JSDoc is for).
- **External string similarity libraries:** The algorithm is simple enough to hand-roll in 20-30 lines.

## Don't Hand-Roll

| Problem                  | Don't Build          | Use Instead                                        | Why                                                                              |
| ------------------------ | -------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------- |
| JSDoc parsing/generation | Custom parser        | TypeScript Compiler API or simple string templates | JSDoc is well-structured; use template strings for `@typeParam` additions        |
| Diagram generation       | Custom SVG generator | Mermaid.js markdown syntax                         | Renders in GitHub, IDEs, and documentation sites automatically                   |
| Documentation site       | Custom static site   | Plain Markdown in `docs/` folder                   | Keep it simple; no need for Docusaurus or similar for internal architecture docs |

**Key insight:** This phase is about developer experience polish, not building infrastructure. Use the simplest approach that achieves clarity.

## Common Pitfalls

### Pitfall 1: Over-engineering Levenshtein Distance

**What goes wrong:** Implementing weighted Levenshtein, Damerau-Levenshtein, or using phonetic algorithms (Soundex, Metaphone) for port name suggestions.

**Why it happens:** Desire for "better" suggestions leads to complexity.

**How to avoid:**

- Standard Levenshtein distance with threshold of 2 is sufficient
- Port names are typically PascalCase identifiers, not natural language
- Simple algorithm is faster and has no edge cases

**Warning signs:**

- Adding npm dependencies for string similarity
- Considering case-insensitive matching (ports are case-sensitive)
- Implementing weighted distance (all edits are equally likely)

### Pitfall 2: Treating Documentation as API Reference

**What goes wrong:** Architecture documentation becomes a list of every class and function, duplicating what JSDoc already provides.

**Why it happens:** Unclear distinction between API reference (JSDoc) and architectural concepts (prose docs).

**How to avoid:**

- Architecture docs explain "why" and "how it works", not "what each function does"
- Focus on concepts: lifecycle, phases, resolution flow, design decisions
- Link to JSDoc for API details, don't duplicate it

**Warning signs:**

- Documentation has a section for every class
- Lots of method signatures in docs
- No explanation of design decisions or tradeoffs

### Pitfall 3: Adding Suggestions to Non-Programming Errors

**What goes wrong:** Factory errors and async factory errors get suggestions like "Fix your factory implementation", which doesn't help.

**Why it happens:** Desire for consistency across all errors.

**How to avoid:**

- Only add `suggestion` to programming errors (`isProgrammingError: true`)
- Factory failures are runtime conditions; the fix is in the user's factory code, which we can't know
- Circular dependencies, disposed scopes, scope required - these have clear, specific fixes

**Warning signs:**

- Suggestions that say "fix your code" without specifics
- Suggestions for factory errors that can't be actionable
- Generic suggestions that apply to multiple error types

## Code Examples

Verified patterns from existing codebase:

### Levenshtein Distance Implementation

````typescript
/**
 * Calculates Levenshtein distance between two strings.
 *
 * This is the minimum number of single-character edits (insertions,
 * deletions, or substitutions) needed to transform one string into another.
 *
 * Used for "Did you mean?" suggestions in error messages.
 *
 * @param a - First string
 * @param b - Second string
 * @returns The edit distance between the strings
 *
 * @example
 * ```typescript
 * levenshteinDistance("LoggerPort", "LogerPort")  // 1 (one deletion)
 * levenshteinDistance("Database", "Databse")      // 1 (one substitution)
 * levenshteinDistance("Cache", "Logger")          // 6 (no suggestion)
 * ```
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[i]![0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0]![j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1, // deletion
        matrix[i]![j - 1]! + 1, // insertion
        matrix[i - 1]![j - 1]! + cost // substitution
      );
    }
  }

  return matrix[a.length]![b.length]!;
}
````

### Enhanced Error with Suggestion

```typescript
// From packages/runtime/src/errors/index.ts
export class ScopeRequiredError extends ContainerError {
  readonly code = "SCOPE_REQUIRED" as const;
  readonly isProgrammingError = true as const;
  readonly portName: string;
  readonly suggestion: string; // ADD THIS

  constructor(portName: string) {
    super(
      `Cannot resolve scoped port '${portName}' from the root container. ` +
        `Scoped ports must be resolved from a scope created via createScope().`
    );
    this.portName = portName;

    // ADD THIS: Actionable suggestion
    this.suggestion =
      `Create a scope before resolving:\n\n` +
      `  const scope = container.createScope();\n` +
      `  const service = scope.resolve(${portName}Port);`;
  }
}
```

### Enhanced Type-Level Error with Example

```typescript
// From packages/runtime/src/types/validation-errors.ts
export type MissingDependenciesError<
  TPortName extends string,
  TMissing extends Port<unknown, string>,
> = `ERROR[TYPE-02]: Override adapter for '${TPortName}' has unsatisfied dependencies.

Missing: ${PortUnionToString<TMissing>}

Fix: Ensure all required ports exist in graph or add them before overriding.

Example:
  const graph = GraphBuilder.create()
    .provide(${PortUnionToString<TMissing>}Adapter)  // ← Add missing adapters
    .provide(${TPortName}Adapter)
    .build();

  const testContainer = container.override(${TPortName}Adapter).build();`;
```

### JSDoc with @typeParam

```typescript
// From packages/runtime/src/types/container.ts - existing example
/**
 * A branded container type that provides type-safe service resolution.
 *
 * @typeParam TProvides - Union of Port types from graph (root) or parent (child).
 * @typeParam TExtends - Union of Port types added via `.extend()`. `never` for root containers.
 * @typeParam TAsyncPorts - Union of Port types that have async factories.
 * @typeParam TPhase - The initialization phase of the container.
 *
 * @remarks
 * - The brand property carries the TProvides and TExtends types for nominal typing
 * - Resolution works on `TProvides | TExtends` (effective provides)
 * - Before initialization, sync resolve is limited to non-async ports
 */
export type Container<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = "uninitialized",
> = ContainerMembers<TProvides, TExtends, TAsyncPorts, TPhase>;
```

## State of the Art

| Old Approach                 | Current Approach                                                         | When Changed     | Impact                                         |
| ---------------------------- | ------------------------------------------------------------------------ | ---------------- | ---------------------------------------------- |
| Generic error messages       | Structured ContainerError hierarchy with `code` and `isProgrammingError` | v5.0 Phase 15-17 | Better programmatic error handling             |
| String-based template errors | Template literal types with ERROR[TYPE-XX] codes                         | v5.0 Phase 17    | Compile-time error validation with clear codes |
| No "did you mean"            | Not yet implemented                                                      | Phase 19         | Will reduce time to fix typos                  |
| Minimal JSDoc                | Comprehensive JSDoc with examples                                        | Ongoing          | Better IDE hover information                   |

**Deprecated/outdated:**

- Generic `Error` throwing: All container operations should throw ContainerError subclasses
- Inline error messages: Error construction logic should be in error class constructors, not at throw sites

## Open Questions

Things that couldn't be fully resolved:

1. **Should "did you mean" apply to compile-time or runtime?**
   - What we know: Current API uses compile-time port validation via branded types; there's no "port name string lookup" at runtime
   - What's unclear: Whether to add runtime port name lookup for error messages, or only enhance compile-time template literal suggestions
   - Recommendation: Focus on enhancing runtime error messages when ports ARE resolved (e.g., including similar port names in "port not found" scenarios if they ever occur), and compile-time template literal improvements

2. **How detailed should lifecycle diagrams be?**
   - What we know: Container has phases (uninitialized → initialized), scope has lifecycle (active → disposed)
   - What's unclear: Whether to show internal state transitions (e.g., MemoMap states, hook execution phases)
   - Recommendation: Start with high-level user-facing state machine (uninitialized/initialized, active/disposed), add internal states only if they help explain behavior

3. **Should design decisions docs include historical context?**
   - What we know: Many decisions were made across v1.0-v5.0 (see PROJECT.md key decisions table)
   - What's unclear: Whether to explain why alternatives were rejected, or just document current state
   - Recommendation: Include "why not X?" for major alternatives (e.g., "Why branded types instead of classes?") but don't enumerate every historical path

## Sources

### Primary (HIGH confidence)

- **Existing codebase analysis:**
  - `packages/runtime/src/errors/index.ts` - ContainerError hierarchy, error structure patterns
  - `packages/runtime/src/types/validation-errors.ts` - Template literal error pattern with ERROR[TYPE-XX] codes
  - `packages/runtime/src/types/container.ts` - Existing JSDoc and `@typeParam` usage examples
  - `packages/runtime/src/types/options.ts` - ContainerPhase type and state machine
  - `packages/graph/ARCHITECTURE.md` - Documentation structure template

- **Project documentation:**
  - `.planning/REQUIREMENTS.md` - ERR-01, ERR-02, ERR-03, DOC-01-04 requirements
  - `.planning/ROADMAP.md` - Phase 19 success criteria
  - `.planning/PROJECT.md` - Key decisions table showing design decision history

### Secondary (MEDIUM confidence)

- **TypeScript documentation:**
  - TypeScript Handbook on JSDoc support: `@typeParam` tag is standard for documenting type parameters
  - Template literal types are stable in TypeScript 4.1+ (current project uses 5.6+)

### Tertiary (LOW confidence)

None - all findings verified against existing codebase.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - No new dependencies needed, building on existing infrastructure
- Architecture: HIGH - Patterns extracted from existing codebase and graph/ARCHITECTURE.md
- Pitfalls: HIGH - Based on common DX anti-patterns and project constraints

**Research date:** 2026-02-05
**Valid until:** 60 days (stable domain - error handling patterns and documentation don't change rapidly)

**Phase-specific notes:**

- No CONTEXT.md exists for this phase; all implementation choices at Claude's discretion
- Phase depends on 15-18 being complete (they are); final polish phase for v5.0
- No external dependencies to add; pure TypeScript and documentation work
- Should validate enhanced error messages with tests (Vitest)
