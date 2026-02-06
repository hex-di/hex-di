# Phase 21: Tooling & Library Migration - Research

**Researched:** 2026-02-06
**Domain:** Monorepo package migration, pnpm workspaces, TypeScript monorepo configuration
**Confidence:** HIGH

## Summary

Phase 21 migrates the remaining packages from `packages/` to their semantic locations: tooling packages (`testing`, `visualization`, `graph-viz`) move to `tooling/`, and flow packages (`flow`, `flow-react`) move to `libs/flow/`. This phase directly mirrors Phase 20's integration migration, applying the same proven patterns.

The technical foundation is already in place: `pnpm-workspace.yaml` was pre-configured with `tooling/*` and `libs/*/*` globs in Phase 20, so workspace recognition will be automatic. The packages being moved are well-isolated with clear dependency boundaries: tooling packages depend on core DI packages but nothing depends on them (dev dependencies only), and flow packages form a small self-contained sub-graph.

**Primary recommendation:** Use `git mv` for directory moves to preserve history, update package.json metadata for repository paths, update root configs (vitest, eslint, README), and verify the full build pipeline. This is a low-risk structural migration with high confidence based on Phase 20's success.

## Standard Stack

The migration uses the existing monorepo tooling already configured and validated in Phase 20:

### Core Tools

| Tool            | Version           | Purpose                           | Why Standard                                                               |
| --------------- | ----------------- | --------------------------------- | -------------------------------------------------------------------------- |
| pnpm workspaces | 9.x               | Monorepo package management       | Already configured, workspace protocol resolution by package name not path |
| git mv          | git built-in      | Preserve git history during moves | Standard git practice for file moves                                       |
| TypeScript      | 5.9.3             | Type checking across packages     | Already configured with project references                                 |
| Vitest          | 4.0.16            | Test runner with include globs    | Already configured for multi-location packages                             |
| ESLint          | typescript-eslint | Linting with per-package configs  | Already configured with ignores pattern                                    |

### Supporting

| Tool                           | Purpose                    | When to Use                                          |
| ------------------------------ | -------------------------- | ---------------------------------------------------- |
| grep/rg                        | Find stale path references | After physical move, before verification             |
| pnpm install                   | Regenerate lockfile        | After any pnpm-workspace.yaml change or package move |
| pnpm build/typecheck/test/lint | Full pipeline verification | After all config updates                             |

**Installation:**
No new dependencies required. All tooling already installed and configured.

## Architecture Patterns

### Recommended Migration Sequence

Phase 20 established the pattern:

1. Physical move with `git mv` (preserves history)
2. Update workspace config if needed (already done for Phase 21)
3. Clean stale build artifacts from moved packages
4. Run `pnpm install` to regenerate lockfile with new paths
5. Update package.json metadata (repository.directory, homepage)
6. Update root configs (vitest, eslint, README)
7. Verify full pipeline (build, typecheck, test, lint)
8. Search for stale references to old paths

### Pattern 1: Package Move Without Breaking Workspace References

**What:** Move package directories while maintaining workspace dependency resolution

**When to use:** Any time reorganizing monorepo structure

**Why it works:** pnpm resolves `workspace:*` dependencies by package name from package.json, not by filesystem path. As long as the moved package is covered by a workspace glob in `pnpm-workspace.yaml`, resolution continues working after `pnpm install`.

**Example:**

```bash
# Step 1: Physical move
git mv packages/testing tooling/testing

# Step 2: Regenerate lockfile (pnpm finds it at new location)
pnpm install

# Workspace dependency like "@hex-di/testing": "workspace:*"
# automatically resolves to tooling/testing
```

### Pattern 2: Nested Workspace Glob Patterns

**What:** Use glob patterns like `libs/*/*` to match nested directory structures

**When to use:** When creating semantic groupings with sub-categories (e.g., `libs/flow/{core,react}`)

**Why it works:** pnpm workspace globs support wildcards at any depth. `libs/*/*` matches `libs/flow/core/` and `libs/flow/react/`.

**Example:**

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*" # Flat structure: packages/core, packages/graph
  - "integrations/*" # Flat structure: integrations/react, integrations/hono
  - "tooling/*" # Flat structure: tooling/testing, tooling/visualization
  - "libs/*/*" # Nested: libs/flow/core, libs/flow/react
```

### Pattern 3: Root Config Update Pattern (from Phase 20)

**What:** Update root-level configs to recognize new package locations

**When to use:** After any package location change

**Files to update:**

- `vitest.config.ts` - Add include patterns for new locations
- `eslint.config.js` - Add new locations to ignores (packages have own configs)
- `README.md` - Update package table links
- Each moved `package.json` - Update `repository.directory` and `homepage` fields

**Example from Phase 20:**

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    include: [
      "packages/**/*.test.ts",
      "integrations/**/*.test.ts", // Added in Phase 20
      "tooling/**/*.test.ts", // Add in Phase 21
      "libs/**/*.test.ts", // Add in Phase 21
    ],
  },
});
```

### Pattern 4: Two-Wave Migration

**What:** Split migration into physical move + config updates

**When to use:** Any multi-package migration

**Why:** Physical moves are reversible (git can undo), config updates depend on physical structure being in place. Separating waves enables incremental verification.

**Wave 1:** Physical moves only

- Move all packages with `git mv`
- Clean build artifacts
- Run `pnpm install`
- Verify workspace recognition

**Wave 2:** Configuration updates

- Update package metadata
- Update root configs
- Full pipeline verification
- Search for stale references

This matches Phase 20's proven two-plan structure.

### Anti-Patterns to Avoid

- **Manual directory copy:** Use `git mv` not `cp` or `mv` to preserve git history
- **Updating configs before physical move:** Config updates fail if directories don't exist
- **Forgetting to update package.json metadata:** Repository links break (minor but sloppy)
- **Skipping full pipeline verification:** May miss broken references
- **Assuming no stale references:** Always grep for old paths after migration

## Don't Hand-Roll

| Problem                         | Don't Build              | Use Instead                    | Why                                                                  |
| ------------------------------- | ------------------------ | ------------------------------ | -------------------------------------------------------------------- |
| Finding stale path references   | Custom AST walker        | `grep -r` or ripgrep           | Simple text search is sufficient, faster, and handles all file types |
| Workspace dependency resolution | Path rewriting scripts   | pnpm's name-based resolution   | pnpm resolves by package name automatically                          |
| Build artifact cleanup          | Selective rm scripts     | `rm -rf */node_modules */dist` | Simple pattern matching is reliable                                  |
| Git history preservation        | Manual history stitching | `git mv`                       | Git tracks moves automatically with `git mv`                         |

**Key insight:** Monorepo package moves are primarily a filesystem + config synchronization problem, not a code transformation problem. The tools (git, pnpm, grep) are mature and purpose-built for this.

## Common Pitfalls

### Pitfall 1: Forgetting to Clean Build Artifacts Before pnpm install

**What goes wrong:** Old `dist/` and `node_modules/` in moved packages can cause pnpm link errors or stale build output

**Why it happens:** Build artifacts reference old paths, moving them creates dangling references

**How to avoid:** Always `rm -rf moved-package/node_modules moved-package/dist` immediately after `git mv`

**Warning signs:** pnpm install warnings about symlinks, stale TypeScript errors

### Pitfall 2: Not Updating vitest.config.ts Include Patterns

**What goes wrong:** Tests in moved packages aren't discovered by root `pnpm test`

**Why it happens:** Root vitest config has explicit include patterns that don't match new locations

**How to avoid:** Add include patterns for `tooling/**/*.test.ts` and `libs/**/*.test.ts` to root vitest config

**Warning signs:** `pnpm test` shows fewer tests passing than expected, specific package tests not running

### Pitfall 3: Missing eslint.config.js Ignores Update

**What goes wrong:** Root eslint tries to lint moved packages (which have their own eslint configs), causing conflicts or double-linting

**Why it happens:** Root eslint config has ignores for `packages/**` and `integrations/**` but not new locations

**How to avoid:** Add `tooling/**` and `libs/**` to root eslint ignores array

**Warning signs:** Duplicate lint errors, conflicting rule reports, slower lint times

### Pitfall 4: Not Verifying workspace:\* Resolution After Move

**What goes wrong:** Workspace dependencies fail to resolve, causing build errors

**Why it happens:** pnpm-workspace.yaml doesn't include glob matching new location

**How to avoid:** Phase 20 already added `tooling/*` and `libs/*/*` globs, but always verify with `pnpm list` after install

**Warning signs:** `pnpm install` errors, `workspace:*` dependencies not resolved in lockfile

### Pitfall 5: Stale Path References in Documentation or Scripts

**What goes wrong:** README links break, scripts reference old paths

**Why it happens:** Documentation and scripts don't get type-checked, easy to miss

**How to avoid:** Search for old paths after migration: `grep -r "packages/testing\|packages/flow" --include="*.md" --include="*.json" --include="*.js"`

**Warning signs:** Broken links in GitHub, scripts failing with "directory not found"

## Code Examples

Verified patterns from Phase 20 implementation:

### Moving Multiple Packages with git mv

```bash
# Create target directories
mkdir -p tooling
mkdir -p libs/flow

# Move packages with history preservation
git mv packages/testing tooling/testing
git mv packages/visualization tooling/visualization
git mv packages/graph-viz tooling/graph-viz
git mv packages/flow libs/flow/core
git mv packages/flow-react libs/flow/react

# Clean build artifacts from moved packages
rm -rf tooling/*/node_modules tooling/*/dist
rm -rf libs/flow/*/node_modules libs/flow/*/dist

# Regenerate lockfile with new paths
pnpm install
```

### Updating Root vitest.config.ts

```typescript
// Before (Phase 20 state)
export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts", "integrations/**/*.test.ts"],
  },
});

// After (Phase 21)
export default defineConfig({
  test: {
    include: [
      "packages/**/*.test.ts",
      "integrations/**/*.test.ts",
      "tooling/**/*.test.ts", // Add tooling packages
      "libs/**/*.test.ts", // Add libs packages (both .test.ts and .test.tsx)
    ],
  },
});
```

Note: All moved packages use `.test.ts` files (no `.test.tsx`), so we don't need `.test.tsx` pattern for Phase 21.

### Updating Root eslint.config.js

```javascript
// Add to ignores array (packages have their own configs)
export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.docusaurus/**",
      "**/coverage/**",
      "packages/**",
      "integrations/**",
      "tooling/**", // Add this
      "libs/**", // Add this
      "examples/**",
      "website/**",
    ],
  }
  // ... rest of config
);
```

### Updating Package Metadata

```json
// tooling/testing/package.json - Update these fields:
{
  "repository": {
    "type": "git",
    "url": "https://github.com/hex-di/hex-di.git",
    "directory": "tooling/testing"  // Changed from "packages/testing"
  },
  "homepage": "https://github.com/hex-di/hex-di/tree/main/tooling/testing#readme"  // Changed from "packages/testing"
}

// libs/flow/core/package.json - Update these fields:
{
  "name": "@hex-di/flow",  // Package name stays the same
  "repository": {
    "type": "git",
    "url": "https://github.com/hex-di/hex-di.git",
    "directory": "libs/flow/core"  // Changed from "packages/flow"
  },
  "homepage": "https://github.com/hex-di/hex-di/tree/main/libs/flow/core#readme"  // Changed from "packages/flow"
}
```

### Verifying Workspace Resolution

```bash
# Verify pnpm found all packages at new locations
pnpm list --depth 0 --json | grep -E "tooling|libs/flow"

# Should show:
# - tooling/testing
# - tooling/visualization
# - tooling/graph-viz
# - libs/flow/core
# - libs/flow/react

# Verify specific workspace dependency resolution
pnpm list --filter @hex-di/testing --json | grep -E "workspace|link"
# Should show workspace:* dependencies resolved to correct packages
```

### Searching for Stale References

```bash
# Search for old path references in source files (exclude generated files)
grep -r "packages/testing" \
  --include="*.json" --include="*.ts" --include="*.js" --include="*.tsx" \
  --include="*.yaml" --include="*.yml" --include="*.md" \
  . | grep -v node_modules | grep -v dist | grep -v pnpm-lock | grep -v .git

grep -r "packages/visualization" <same options>
grep -r "packages/graph-viz" <same options>
grep -r "packages/flow" <same options> | grep -v "packages/flow-" # Avoid false positive from flow-react
grep -r "packages/flow-react" <same options>

# Only remaining references should be in:
# - pnpm-lock.yaml (auto-generated, will update)
# - .vite-temp cache (ignored)
# - .planning/ historical docs (acceptable)
```

### Full Pipeline Verification

```bash
# Run complete verification sequence
pnpm install  # Should exit 0, regenerate lockfile
pnpm build    # All packages including moved ones should build
pnpm typecheck # TypeScript should pass for all packages
pnpm test     # All tests should pass (1816+ tests)
pnpm lint     # All packages should lint cleanly

# Each step must exit 0 (success) before proceeding
```

## State of the Art

| Old Approach                   | Current Approach                                                      | When Changed          | Impact                                          |
| ------------------------------ | --------------------------------------------------------------------- | --------------------- | ----------------------------------------------- |
| Flat `packages/*` structure    | Semantic grouping (`packages/`, `integrations/`, `tooling/`, `libs/`) | Phase 20-21 (v6.0)    | Clearer package categories, easier to find code |
| Manual path updates in imports | pnpm name-based workspace resolution                                  | Always (pnpm feature) | Moves don't break imports                       |
| Losing git history on moves    | `git mv` preserves history                                            | Always (git feature)  | Full git blame/log across moves                 |

**Current best practices (as of Phase 20):**

- Pre-add workspace globs before creating directories (Phase 20 added globs for Phase 21)
- Use `git mv` for all directory moves
- Two-wave migration: physical move first, config updates second
- Always clean build artifacts before `pnpm install`
- Always grep for stale references after migration

## Open Questions

No unresolved questions. This phase replicates Phase 20's proven patterns with different packages.

**What we know:**

- Phase 20 successfully migrated react and hono packages using these exact patterns
- pnpm-workspace.yaml already includes `tooling/*` and `libs/*/*` globs
- All packages being moved have clear dependency boundaries

**What's clear:**

- Testing package depends on core/graph/runtime (all staying in `packages/`)
- Visualization and graph-viz packages are leaf packages (dev dependencies only)
- Flow packages form isolated sub-graph (flow-react depends on flow)

**Recommendation:** Execute as planned with high confidence. No architectural decisions needed.

## Package Dependency Analysis

Understanding what depends on the packages being moved:

### Testing Package (`@hex-di/testing`)

**Dependencies:** core, graph, runtime, react (peer)
**Depended on by:** Examples (react-showcase) - **devDependency only**
**Impact:** No production dependencies on testing package; safe to move

### Visualization Package (`@hex-di/visualization`)

**Dependencies:** graph
**Depended on by:** None (dev tooling only)
**Impact:** Completely isolated; safe to move

### Graph-viz Package (`@hex-di/graph-viz`)

**Dependencies:** dagre (external), react (peer)
**Depended on by:** None (dev tooling only)
**Impact:** Completely isolated; safe to move

### Flow Package (`@hex-di/flow`)

**Dependencies:** core, graph, runtime
**Depended on by:** flow-react, react-showcase example
**Impact:** flow-react must move together; example uses workspace:\* (auto-resolves)

### Flow-react Package (`@hex-di/flow-react`)

**Dependencies:** flow, react (from integrations), core
**Depended on by:** react-showcase example
**Impact:** Depends on flow; must move as pair; example uses workspace:\* (auto-resolves)

**Critical insight:** All five packages can move safely because:

1. Tooling packages are only dev dependencies (not in production graphs)
2. Flow packages form an isolated sub-graph
3. All consumers use `workspace:*` protocol (name-based resolution)
4. No circular dependencies across the packages being moved

## Files That Need Updates

Based on Phase 20 patterns, here's the exhaustive list:

### Must Update:

1. **Physical moves** (5 packages via `git mv`)
   - packages/testing → tooling/testing
   - packages/visualization → tooling/visualization
   - packages/graph-viz → tooling/graph-viz
   - packages/flow → libs/flow/core
   - packages/flow-react → libs/flow/react

2. **Root configs**
   - `vitest.config.ts` - Add tooling/**/\*.test.ts and libs/**/\*.test.ts to includes
   - `eslint.config.js` - Add tooling/** and libs/** to ignores

3. **Package metadata** (5 files)
   - `tooling/testing/package.json` - Update repository.directory and homepage
   - `tooling/visualization/package.json` - Update repository.directory and homepage
   - `tooling/graph-viz/package.json` - Update repository.directory and homepage
   - `libs/flow/core/package.json` - Update repository.directory and homepage
   - `libs/flow/react/package.json` - Update repository.directory and homepage

4. **README.md**
   - Update package table links for all 5 moved packages

### Do NOT Need Updates:

- `pnpm-workspace.yaml` - Already includes `tooling/*` and `libs/*/*` (Phase 20)
- Individual package tsconfig.json files - Relative paths unchanged (same depth)
- Individual package eslint.config.js files - Import from `../../eslint.config.js` (same depth)
- Individual package vitest.config.ts files - Use local paths only
- Root package.json scripts - Use `pnpm -r` (auto-discovers packages)
- Examples package.json - Use `workspace:*` protocol (name-based resolution)
- Website config - No direct references to these packages
- Core packages (core, graph, runtime) - Completely untouched

## Sources

### Primary (HIGH confidence)

- Phase 20 implementation and summaries (20-01-PLAN.md, 20-02-PLAN.md) - Proven migration patterns
- Current codebase structure (STRUCTURE.md, package.json files) - Actual dependency graph
- pnpm workspace documentation (https://pnpm.io/workspaces) - Workspace glob resolution
- Phase 20 v5.0-INTEGRATION-REPORT.md - Comprehensive integration verification example

### Secondary (MEDIUM confidence)

- git mv documentation (git built-in) - History preservation mechanics

### Tertiary (LOW confidence)

None. All findings verified against Phase 20 implementation.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Using exact same tools as Phase 20
- Architecture patterns: HIGH - Replicating Phase 20's proven two-wave approach
- Pitfalls: HIGH - Documented from Phase 20's learnings
- Package dependencies: HIGH - Verified from actual package.json files

**Research date:** 2026-02-06
**Valid until:** 90 days (stable monorepo tooling, patterns established in Phase 20)

**Phase 20 learnings applied:**

- Pre-configured workspace globs (Phase 20 did this for us)
- Two-wave migration pattern (physical move + config updates)
- Root config update checklist (vitest, eslint, README, package.json metadata)
- Full pipeline verification sequence (install, build, typecheck, test, lint)
- Stale reference search patterns (grep with file type filters)
