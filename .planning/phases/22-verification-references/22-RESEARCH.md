# Phase 22: Verification & References - Research

**Researched:** 2026-02-06
**Domain:** Monorepo verification, workspace dependency validation, post-migration quality assurance
**Confidence:** HIGH

## Summary

Phase 22 is the final verification and cleanup phase for the v6.0 monorepo reorganization. After Phase 20 moved integrations and Phase 21 moved tooling and library packages, this phase ensures all workspace consumers (examples and website) correctly reference the new locations and that the full build pipeline passes with zero regressions.

This is a validation-focused phase with minimal code changes. The workspace dependencies in examples and website already use `workspace:*` protocol, which resolves packages by name rather than path, so they should already work. The core tasks are: verify examples build correctly, confirm all 1,816+ tests pass, run the complete build pipeline (build/typecheck/lint), and fix any stale path references discovered during verification.

The phase differs from Phase 21's verification (which verified the migration itself) by focusing on downstream consumers. Phase 21 verified packages were moved correctly; Phase 22 verifies nothing broke for consumers of those packages.

**Primary recommendation:** Run full pipeline verification first to identify any issues, then systematically fix workspace references in examples and website if needed. Expect minimal changes since workspace protocol is name-based, not path-based.

## Standard Stack

This phase uses existing project tooling for verification:

### Core Verification Tools

| Tool           | Version          | Purpose                               | Why Standard                                               |
| -------------- | ---------------- | ------------------------------------- | ---------------------------------------------------------- |
| pnpm           | 9.15.0           | Workspace dependency resolution       | Official package manager for this monorepo                 |
| pnpm list      | built-in         | Verify workspace dependencies resolve | Shows dependency tree with resolution paths                |
| pnpm build     | workspace script | Compile all packages                  | Runs `pnpm -r build` across workspace                      |
| pnpm typecheck | workspace script | Type-check all packages               | Runs `pnpm -r --parallel typecheck`                        |
| pnpm test      | workspace script | Run test suite                        | Currently passes 1,816 tests across 122 test files         |
| pnpm lint      | workspace script | Lint all packages                     | Currently has pre-existing failures in packages/graph only |

### Supporting Tools

| Tool         | Purpose                    | When to Use                                    |
| ------------ | -------------------------- | ---------------------------------------------- |
| grep/ripgrep | Find stale path references | After pipeline verification, before completion |
| git status   | Verify no untracked files  | During verification to catch missed updates    |
| Vitest       | Test runner                | Used by `pnpm test` to verify test suite       |
| TypeScript   | Type checker               | Used by `pnpm typecheck` to verify type safety |
| ESLint       | Linter                     | Used by `pnpm lint` to verify code quality     |

**Installation:**
No new dependencies required. All verification tools are already installed and configured.

## Architecture Patterns

### Pattern 1: Workspace Protocol Name-Based Resolution

**What:** pnpm resolves `workspace:*` dependencies by package name from package.json, not filesystem path

**When to use:** Any workspace dependency (already in use throughout monorepo)

**Why it works:** When packages move, pnpm-workspace.yaml globs determine discoverability. As long as moved packages are covered by workspace globs, `pnpm install` finds them by name automatically.

**Example:**

```json
// examples/react-showcase/package.json
{
  "dependencies": {
    "@hex-di/react": "workspace:*", // Resolves to integrations/react
    "@hex-di/flow": "workspace:*", // Resolves to libs/flow/core
    "@hex-di/flow-react": "workspace:*" // Resolves to libs/flow/react
  },
  "devDependencies": {
    "@hex-di/testing": "workspace:*" // Resolves to tooling/testing
  }
}
```

After Phase 20 and 21 moves, `pnpm install` automatically resolves these to new locations because:

- `integrations/*` glob covers integrations/react and integrations/hono
- `libs/*/*` glob covers libs/flow/core and libs/flow/react
- `tooling/*` glob covers tooling/testing

No package.json changes needed in examples or website.

### Pattern 2: Full Pipeline Verification Sequence

**What:** Run all verification commands in dependency order to catch issues early

**When to use:** After any structural change (package moves, config updates, dependency changes)

**Sequence:**

```bash
# 1. Verify lockfile is current
pnpm install

# 2. Verify all packages build (build is prerequisite for typecheck)
pnpm build

# 3. Verify type correctness (depends on built .d.ts files)
pnpm typecheck

# 4. Verify tests pass (depends on built packages)
pnpm test

# 5. Verify code quality (can run independently but usually last)
pnpm lint
```

**Why this order:**

- `build` must succeed before `typecheck` (typecheck needs .d.ts declarations)
- `test` should run after build (some tests may import from dist)
- `lint` is independent but conventionally last
- Stop at first failure (no point running tests if build fails)

### Pattern 3: Example Package Verification

**What:** Verify examples build and their workspace dependencies resolve correctly

**When to use:** After any package relocation that examples depend on

**How to verify:**

```bash
# Verify hono-todo example
pnpm --filter @hex-di/hono-todo build
pnpm --filter @hex-di/hono-todo typecheck

# Verify react-showcase example
pnpm --filter @hex-di/react-showcase build
pnpm --filter @hex-di/react-showcase typecheck
pnpm --filter @hex-di/react-showcase test

# Check workspace dependency resolution
pnpm list --filter @hex-di/hono-todo --depth=1
pnpm list --filter @hex-di/react-showcase --depth=1
```

**Success criteria:**

- Examples build without errors
- Workspace dependencies show correct paths in `pnpm list` output
- Example-specific tests pass (react-showcase has test suite)

### Pattern 4: Stale Reference Detection

**What:** Search for old package paths in source code, configs, and documentation

**When to use:** After verification passes, before marking phase complete

**Search patterns:**

```bash
# Phase 20 moved these packages
grep -r "packages/react\|packages/hono" \
  --include="*.ts" --include="*.tsx" --include="*.json" \
  --include="*.md" --include="*.yaml" \
  . | grep -v node_modules | grep -v dist | grep -v .git | grep -v pnpm-lock

# Phase 21 moved these packages
grep -r "packages/testing\|packages/visualization\|packages/graph-viz" \
  --include="*.ts" --include="*.tsx" --include="*.json" \
  --include="*.md" --include="*.yaml" \
  . | grep -v node_modules | grep -v dist | grep -v .git | grep -v pnpm-lock

grep -r "packages/flow\|packages/flow-react" \
  --include="*.ts" --include="*.tsx" --include="*.json" \
  --include="*.md" --include="*.yaml" \
  . | grep -v node_modules | grep -v dist | grep -v .git | grep -v pnpm-lock
```

**Acceptable matches:**

- `.planning/` directory (historical documentation)
- `pnpm-lock.yaml` (auto-generated, will update on next install)
- `.vite-temp/` cache (gitignored, temporary)

**Unacceptable matches:**

- Source code imports (e.g., `import { X } from '../packages/react'`)
- README or documentation links pointing to old paths
- Config files (tsconfig.json paths, package.json references)

### Pattern 5: Website Build Verification

**What:** Verify Docusaurus website builds and workspace configuration is correct

**When to use:** After package moves that website may reference

**How to verify:**

```bash
# Verify website builds
pnpm --filter website build
pnpm --filter website typecheck

# Website has no workspace dependencies currently
# (Docusaurus site doesn't import hex-di packages directly)
```

**What to check:**

- Website builds without errors
- Documentation links don't point to moved package paths (already verified in README.md)
- No stale path references in website source or config

### Anti-Patterns to Avoid

- **Changing package.json workspace dependencies to absolute paths:** Keep using `workspace:*` protocol, don't hardcode paths
- **Updating imports to use relative paths:** Workspace imports should use package names (e.g., `@hex-di/react`), not relative paths
- **Skipping verification steps:** Each command catches different classes of errors
- **Assuming no changes needed:** Always verify even if you expect everything to work
- **Not checking test counts:** Test count regression indicates missing test files

## Don't Hand-Roll

| Problem                         | Don't Build                    | Use Instead                                       | Why                                                         |
| ------------------------------- | ------------------------------ | ------------------------------------------------- | ----------------------------------------------------------- |
| Workspace dependency resolution | Custom path resolution scripts | pnpm's built-in workspace protocol                | pnpm handles resolution automatically by package name       |
| Full build verification         | Custom test scripts            | Existing pnpm scripts (build/typecheck/test/lint) | Scripts already configured with correct workspace semantics |
| Dependency tree inspection      | Manual package.json parsing    | `pnpm list` with --depth and --filter             | pnpm provides accurate resolution information               |
| Stale reference detection       | AST parsing tools              | grep/ripgrep with file type filters               | Simple text search is sufficient and handles all file types |

**Key insight:** Workspace verification is primarily about running existing verification commands and interpreting results. The tooling (pnpm, TypeScript, Vitest, ESLint) already knows how to work with the workspace structure; we just need to execute and verify.

## Common Pitfalls

### Pitfall 1: Not Running Full Pipeline Before Making Changes

**What goes wrong:** Make "fixes" that aren't needed, or fix wrong things

**Why it happens:** Assumption that changes are needed without verifying current state

**How to avoid:** Run `pnpm install && pnpm build && pnpm typecheck && pnpm test && pnpm lint` FIRST to establish baseline

**Warning signs:** "Fixing" things that already work, making unnecessary changes

### Pitfall 2: Breaking on Pre-Existing Lint Failures

**What goes wrong:** Phase blocked by lint errors in packages/graph that predate Phase 22

**Why it happens:** `pnpm lint` exits non-zero due to packages/graph failures

**How to avoid:** Check if lint failures are pre-existing (STATE.md documents packages/graph has 11 errors, 12 warnings). Verify moved packages lint cleanly even if overall lint fails.

**Warning signs:** Lint failures in packages that weren't touched in Phase 20-22

**Pre-existing issues:**

- packages/graph: 11 errors, 12 warnings (documented in STATE.md as pre-migration)
- libs/flow: 3000+ warnings surfaced by lint-staged during Phase 21 move (documented as pre-existing)

### Pitfall 3: Missing Test Count Regression

**What goes wrong:** Tests are not discovered due to path changes, but suite still "passes"

**Why it happens:** Root vitest.config.ts includes patterns for new locations, but if patterns are wrong, tests are silently skipped

**How to avoid:** Compare test count (1,816+ expected) with actual count. Significant drop indicates missing test files.

**Warning signs:** Test suite passes but with fewer tests than expected (baseline: 122 test files, 1816 tests)

### Pitfall 4: Forgetting to Verify Examples Separately

**What goes wrong:** Examples break but root build passes (examples not in build pipeline)

**Why it happens:** Examples are separate workspaces with their own build processes

**How to avoid:** Run `pnpm --filter @hex-di/hono-todo build` and `pnpm --filter @hex-di/react-showcase build` explicitly

**Warning signs:** Root build succeeds but examples fail when run individually

### Pitfall 5: Not Checking Workspace Dependency Resolution Paths

**What goes wrong:** Workspace dependencies resolve but to wrong package version or location

**Why it happens:** pnpm-workspace.yaml globs may match wrong directories, or old packages still present

**How to avoid:** Use `pnpm list --filter <package> --depth=1` to verify dependencies resolve to expected locations

**Warning signs:** Dependencies resolve but point to unexpected paths (e.g., old packages/ instead of integrations/)

## Code Examples

Verified patterns from existing project configuration:

### Verifying Example Workspace Dependencies

```bash
# Check hono-todo's dependencies resolve to correct locations
pnpm list --filter @hex-di/hono-todo --depth=1 --json | grep -A 3 "@hex-di/hono"

# Expected output shows:
# "@hex-di/hono": {
#   "version": "0.1.0",
#   "path": ".../integrations/hono"  # Not packages/hono
# }

# Check react-showcase's dependencies resolve correctly
pnpm list --filter @hex-di/react-showcase --depth=1 --json | grep -A 3 "@hex-di/react\|@hex-di/flow\|@hex-di/testing"

# Expected output shows:
# "@hex-di/react": path integrations/react
# "@hex-di/flow": path libs/flow/core
# "@hex-di/flow-react": path libs/flow/react
# "@hex-di/testing": path tooling/testing
```

### Full Pipeline Verification Script

```bash
#!/bin/bash
# Run from repository root

set -e  # Exit on first error

echo "==> Phase 22 Verification Pipeline"

echo "==> Step 1: Verify lockfile is current"
pnpm install
# Should output "Lockfile is up to date" if no changes needed

echo "==> Step 2: Build all packages"
pnpm build
# All packages including examples should build successfully

echo "==> Step 3: Type-check all packages"
pnpm typecheck
# All 13+ packages should pass type checking

echo "==> Step 4: Run test suite"
pnpm test 2>&1 | tee test-output.txt
# Verify 122 test files, 1816 tests passed (1 skipped acceptable)
grep "Test Files" test-output.txt
grep "Tests" test-output.txt

echo "==> Step 5: Lint (expect packages/graph to fail with pre-existing issues)"
pnpm lint 2>&1 | tee lint-output.txt || true
# Check that ONLY packages/graph fails, all moved packages pass
grep -E "integrations/(react|hono)" lint-output.txt && echo "ERROR: Integrations failed lint" && exit 1
grep -E "libs/flow/(core|react)" lint-output.txt && echo "ERROR: Libs/flow failed lint" && exit 1
grep -E "tooling/" lint-output.txt && echo "ERROR: Tooling failed lint" && exit 1
grep "packages/graph" lint-output.txt && echo "Expected: packages/graph pre-existing issues"

echo "==> All verification steps passed!"
```

### Checking Example Builds

```bash
# Verify hono-todo example
echo "==> Verifying hono-todo example"
pnpm --filter @hex-di/hono-todo typecheck
pnpm --filter @hex-di/hono-todo build
echo "hono-todo: OK"

# Verify react-showcase example
echo "==> Verifying react-showcase example"
pnpm --filter @hex-di/react-showcase typecheck
pnpm --filter @hex-di/react-showcase build
pnpm --filter @hex-di/react-showcase test
echo "react-showcase: OK"

# Verify website
echo "==> Verifying website"
pnpm --filter website typecheck
pnpm --filter website build
echo "website: OK"
```

### Searching for Stale References

```bash
# Search for references to old package paths
# (Adapted from Phase 21 research patterns)

echo "==> Searching for stale path references"

# Phase 20 moved packages (integrations)
echo "Checking for packages/react and packages/hono references..."
STALE=$(grep -r "packages/react\|packages/hono" \
  --include="*.ts" --include="*.tsx" --include="*.json" \
  --include="*.md" --include="*.yaml" --include="*.yml" \
  examples/ website/ \
  | grep -v node_modules | grep -v dist | grep -v .vite-temp || true)

if [ -n "$STALE" ]; then
  echo "WARNING: Found stale references to moved integrations:"
  echo "$STALE"
else
  echo "No stale integration references found"
fi

# Phase 21 moved packages (tooling and libs)
echo "Checking for packages/testing, packages/flow references..."
STALE=$(grep -r "packages/testing\|packages/flow" \
  --include="*.ts" --include="*.tsx" --include="*.json" \
  --include="*.md" --include="*.yaml" --include="*.yml" \
  examples/ website/ \
  | grep -v node_modules | grep -v dist | grep -v .vite-temp || true)

if [ -n "$STALE" ]; then
  echo "WARNING: Found stale references to moved packages:"
  echo "$STALE"
else
  echo "No stale package references found"
fi

echo "==> Stale reference check complete"
```

### Example Package.json Structure (No Changes Needed)

```json
// examples/hono-todo/package.json
{
  "name": "@hex-di/hono-todo",
  "dependencies": {
    "@hex-di/core": "workspace:*",     // Resolves to packages/core (not moved)
    "@hex-di/graph": "workspace:*",    // Resolves to packages/graph (not moved)
    "@hex-di/runtime": "workspace:*",  // Resolves to packages/runtime (not moved)
    "@hex-di/hono": "workspace:*"      // Resolves to integrations/hono (moved in Phase 20)
  }
  // ✓ All dependencies use workspace:* protocol (name-based)
  // ✓ No path-based dependencies
  // ✓ No changes needed for Phase 22
}

// examples/react-showcase/package.json
{
  "name": "@hex-di/react-showcase",
  "dependencies": {
    "@hex-di/core": "workspace:*",        // packages/core
    "@hex-di/flow": "workspace:*",        // libs/flow/core (moved in Phase 21)
    "@hex-di/flow-react": "workspace:*",  // libs/flow/react (moved in Phase 21)
    "@hex-di/graph": "workspace:*",       // packages/graph
    "@hex-di/react": "workspace:*",       // integrations/react (moved in Phase 20)
    "@hex-di/runtime": "workspace:*"      // packages/runtime
  },
  "devDependencies": {
    "@hex-di/testing": "workspace:*"      // tooling/testing (moved in Phase 21)
  }
  // ✓ All dependencies use workspace:* protocol
  // ✓ No changes needed for Phase 22
}
```

## State of the Art

| Old Approach                        | Current Approach                                         | When Changed             | Impact                                                |
| ----------------------------------- | -------------------------------------------------------- | ------------------------ | ----------------------------------------------------- |
| Manual verification of each package | Automated pnpm workspace scripts                         | Always (monorepo setup)  | Single command verifies all packages                  |
| Path-based imports across packages  | Package name-based imports with workspace protocol       | Always (pnpm workspaces) | Package moves don't break imports                     |
| Manual test count tracking          | Vitest reporters show test counts                        | Always (vitest setup)    | Easy to detect test discovery issues                  |
| Pre-commit hooks for every change   | --no-verify for structural moves, hooks for code changes | Phase 21 (v6.0)          | Avoid noise from pre-existing warnings in moved files |

**Current verification best practices (Phase 22):**

- Run full pipeline in order: install → build → typecheck → test → lint
- Verify test count matches baseline (1,816+ tests)
- Check examples separately with `pnpm --filter`
- Use `pnpm list` to verify workspace dependency resolution
- Search for stale references after verification passes
- Accept pre-existing lint failures (packages/graph documented)

## Open Questions

None. Phase 22 is straightforward verification of completed work.

**What we know:**

- Phase 20 and 21 are marked complete with passing verification
- Examples and website already use `workspace:*` protocol
- Full pipeline passed in Phase 21 verification (1,816 tests)
- Pre-existing lint issues documented (packages/graph)

**What's clear:**

- Workspace protocol ensures examples resolve dependencies by name
- No package.json changes needed in examples or website
- Verification is about confirming what's already working

**Recommendation:** Execute verification sequence and only make changes if issues found. Expect minimal to zero changes needed.

## Requirements Mapping

Phase 22 requirements from PHASE.md:

### Build Verification Requirements

| Requirement                                              | Verification Method                      | Success Criteria                                                                        |
| -------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| VER-01: pnpm install resolves all workspace dependencies | Run `pnpm install` and check exit code   | Exit code 0, "Lockfile is up to date"                                                   |
| VER-02: pnpm build succeeds for all packages             | Run `pnpm build` and check exit code     | Exit code 0, all packages build                                                         |
| VER-03: pnpm typecheck passes across all packages        | Run `pnpm typecheck` and check exit code | Exit code 0, all packages pass                                                          |
| VER-04: pnpm test passes (1,816+ tests)                  | Run `pnpm test` and check test count     | Exit code 0, 122 test files, 1816+ tests passed                                         |
| VER-05: pnpm lint passes across all packages             | Run `pnpm lint` and analyze output       | Only pre-existing packages/graph failures (11 errors, 12 warnings), moved packages pass |

### Example & Website Reference Requirements

| Requirement                                                             | Verification Method                                              | Success Criteria                                                                                                                           |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| REF-01: hono-todo example workspace dependencies resolve correctly      | `pnpm list --filter @hex-di/hono-todo --depth=1`                 | @hex-di/hono resolves to integrations/hono                                                                                                 |
| REF-02: react-showcase example workspace dependencies resolve correctly | `pnpm list --filter @hex-di/react-showcase --depth=1`            | @hex-di/react → integrations/react, @hex-di/flow → libs/flow/core, @hex-di/flow-react → libs/flow/react, @hex-di/testing → tooling/testing |
| REF-03: website workspace configuration updated                         | `pnpm --filter website build && pnpm --filter website typecheck` | Both commands succeed                                                                                                                      |

## Sources

### Primary (HIGH confidence)

- Phase 21 verification report (21-VERIFICATION.md) - Documents current state, test counts, pre-existing issues
- Phase 21 research (21-RESEARCH.md) - Patterns for workspace moves and verification
- Current codebase inspection - Verified examples use workspace:\* protocol
- pnpm-workspace.yaml - Confirmed globs cover all package locations
- STATE.md - Documents pre-existing lint issues, recent completion of Phase 21

### Secondary (MEDIUM confidence)

- pnpm workspace documentation (attempted WebFetch, blocked by network) - Workspace protocol resolution semantics

### Tertiary (LOW confidence)

None. All findings verified against actual project state.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Using existing project tooling already configured
- Architecture patterns: HIGH - Based on Phase 20/21 verification patterns
- Pitfalls: HIGH - Documented from Phase 21 learnings and known pre-existing issues
- Requirements coverage: HIGH - All requirements map to concrete verification steps

**Research date:** 2026-02-06
**Valid until:** 30 days (verification patterns stable, project-specific)

**Key insights from Phase 21:**

- workspace:\* protocol makes moves transparent to consumers
- Pre-existing lint issues (packages/graph) acceptable and documented
- Test count regression is key indicator of missing test files
- Examples require separate verification (not in root build pipeline)
