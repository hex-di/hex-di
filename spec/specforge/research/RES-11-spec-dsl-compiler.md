---
id: RES-11
kind: research
title: "Spec DSL Compiler — Replacing Markdown + Bash with a Universal Spec Language"
status: draft
date: 2026-03-01
---

# RES-11: Spec DSL Compiler

## Problem Statement

The current spec-authoring system uses markdown + YAML frontmatter validated by 62 bash scripts and 25+ Claude skills. This approach has fundamental weaknesses:

1. **References are strings** — `invariants: [INV-SF-7]` in YAML is opaque; typos discovered only after bash scripts run
2. **Same ID duplicated 5-7 places** — frontmatter, headings, index.yaml, traceability files, invariant back-references, overview document map
3. **Validation is post-hoc** — 62 rules implemented as bash scripts parsing markdown with grep/sed/yq; fragile, slow feedback
4. **Traceability manually maintained** — 10 TRACE-SF-\* files are hand-written matrices, drift guaranteed
5. **No connection to code/tests** — no mechanism linking BEH-SF-NNN to actual test files
6. **Language-specific** — a TypeScript internal DSL would lock out Python/Go/Rust/Java projects

## Proposal: A Standalone Spec Compiler

Replace the markdown + bash system with:

- A `.spec` file format (source of truth)
- A compiler that parses, resolves references, validates, and generates outputs
- An LSP server for IDE navigation
- Universal test coverage scanning via `@spec` annotations

No database. No server. One binary.

---

## Core Architecture

```
.spec files  →  Parser  →  In-Memory Graph  →  Validation passes
   (source       (AST)      (nodes + edges)     Navigation (LSP)
    of truth)                                    Renderings (markdown, JSON)
                                                 Coverage reports
```

### Pipeline

```
                    .spec files (on disk)
                          │
                          ▼
                 ┌─────────────────┐
                 │     Parser      │  tree-sitter grammar
                 │                 │  → per-file AST
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │    Resolver     │  resolve `use` imports
                 │                 │  link ID references to definitions
                 │                 │  build in-memory graph
                 └────────┬────────┘
                          │
                          ▼
               ┌─────────────────────┐
               │   In-Memory Graph   │  nodes: invariant, behavior,
               │                     │         feature, capability,
               │   (the "database")  │         decision, risk...
               │                     │  edges: references, enforces,
               │                     │         implements, traces_to
               └────────┬────────────┘
                        │
          ┌─────────────┼─────────────────┐
          ▼             ▼                 ▼
   ┌────────────┐ ┌──────────┐  ┌──────────────┐
   │ Validators │ │   LSP    │  │   Emitters   │
   │            │ │          │  │              │
   │ • orphans  │ │ • go-def │  │ • markdown   │
   │ • broken   │ │ • refs   │  │ • json       │
   │   refs     │ │ • hover  │  │ • coverage   │
   │ • coverage │ │ • diag   │  │ • trace      │
   │ • ranges   │ │ • rename │  │ • index.yaml │
   └────────────┘ └──────────┘  └──────────────┘
```

---

## The `.spec` Format

### Design Goals

- Learn in 5 minutes
- Read like documentation, compile like code
- First-class cross-references (not strings)
- Minimal syntax noise
- Language-agnostic (works for any project)

### Syntax

#### Project Root

```spec
// specforge.spec
spec "my-service" {
  infix  "MS"
  version "1.0"

  test_dirs ["tests/", "src/**/*.test.*"]
}
```

#### Invariants

```spec
// invariants/data.spec

invariant INV-MS-1 "Data Persistence" {
  guarantee """
    All committed writes survive process restarts.
    No acknowledged write may be silently dropped.
  """
  enforced_by [PostgresAdapter, WriteAheadLog]
  risk high
}

invariant INV-MS-2 "Email Uniqueness" {
  guarantee "No two active users share the same email address."
  enforced_by [UniqueConstraint, UserRepository]
  risk medium
}
```

#### Decisions (ADRs)

```spec
// decisions/ADR-001.spec

decision ADR-001 "PostgreSQL over MongoDB" {
  status   accepted
  date     2025-03-01

  context """
    We need a primary datastore. Team has SQL expertise.
    Document model not needed — data is relational.
  """

  decision """
    Use PostgreSQL with typed schemas.
  """

  consequences [
    "Migrations required for schema changes",
    "Strong ACID guarantees",
  ]

  invariants [INV-MS-1]    // ← compiler-resolved reference
}
```

#### Behaviors

```spec
// behaviors/user-crud.spec

use invariants/data       // ← file-level import
use decisions/ADR-001

behavior_group "User CRUD" {
  range    [1, 8]
  adrs     [ADR-001]
  types    [user, auth]
  ports    [UserRepository, EmailService]

  behavior BEH-MS-001 "Create User" {
    invariants [INV-MS-1, INV-MS-2]

    contract """
      When a valid CreateUserCommand is received,
      the system MUST create a user record with unique email
      and MUST return Result<User, DuplicateEmailError>.
    """

    verify unit        "insert user, retrieve by ID, assert equal"
    verify integration "insert user, restart process, retrieve persists"
    verify property    "email uniqueness holds under concurrent inserts"

    tests [
      "tests/user_test.go::TestCreateUser",
      "tests/user.test.ts:45",
      "tests/test_user.py::test_create_user",
    ]
  }

  behavior BEH-MS-002 "Read User by ID" {
    invariants [INV-MS-1]

    contract """
      Given a valid user ID, MUST return the user or NotFoundError.
      MUST NOT return stale data after a successful write.
    """

    verify unit "insert then get by ID"
  }

  behavior BEH-MS-003 "Update User Email" {
    invariants [INV-MS-1, INV-MS-2]

    contract """
      MUST validate new email uniqueness before committing.
      MUST return DuplicateEmailError if email already taken.
    """

    verify unit        "update to unique email succeeds"
    verify unit        "update to taken email fails with DuplicateEmailError"
    verify integration "concurrent updates to same email — exactly one wins"
  }
}
```

#### Features

```spec
// features/user-management.spec

use behaviors/user-crud
use roadmap/phases

feature FEAT-MS-001 "User Management" {
  behaviors [BEH-MS-001, BEH-MS-002, BEH-MS-003]
  roadmap   [RM-01]

  problem """
    Administrators need to manage user accounts
    with guaranteed data integrity.
  """

  solution """
    CRUD operations backed by PostgreSQL with
    unique email constraints and full audit trail.
  """
}
```

#### Capabilities

```spec
// capabilities/admin-users.spec

use features/user-management

capability UX-MS-001 "Create a New User" {
  persona  admin
  surface  [web, cli, api]
  features [FEAT-MS-001]

  flow """
    1. Admin opens user management page
    2. Clicks "New User"
    3. Fills form (name, email, role)
    4. Submits → system validates uniqueness
    5. Success: user appears in list
    6. Failure: inline error on email field
  """
}
```

#### Risk Assessment (FMEA)

```spec
// risk-assessment/data-integrity.spec

use invariants/data

failure_mode FM-MS-001 "Write Acknowledged but Lost" {
  invariant  INV-MS-1
  severity   8
  occurrence 2
  detection  3
  rpn        48    // auto-computed: S × O × D

  cause      "Crash between ACK and fsync"
  effect     "Silent data loss — user believes write succeeded"
  mitigation "Write-ahead log with fsync before ACK"

  post_mitigation {
    severity   8
    occurrence 1
    detection  2
    rpn        16
  }
}
```

---

## Compiler Validation

### What becomes impossible by construction

| Current VAL rule                   | In the compiler                                             |
| ---------------------------------- | ----------------------------------------------------------- |
| VAL-001–009: No duplicate IDs      | **Parser error** — duplicate ID = compile error             |
| VAL-010–017: Frontmatter schema    | **No frontmatter** — the syntax IS the schema               |
| VAL-018–024: Forward references    | **Resolver error** — unresolved `use` or ID = compile error |
| VAL-025–030: Reverse coverage      | **Validator warning** — orphan detection on the graph       |
| VAL-031–037: Index completeness    | **No index files** — compiler generates them                |
| VAL-038–042: Overview completeness | **Compiler generates** overview from graph                  |
| VAL-043–048: Content structure     | **Syntax enforced** — `behavior` block requires `contract`  |
| VAL-049–053: Traceability          | **Auto-generated** — traverse the graph                     |

From 62 hand-written bash rules → ~10 graph-level warnings emitted automatically. The rest are structurally impossible.

### Error Messages

```
error[E001]: unresolved reference `INV-MS-99`
  --> behaviors/user-crud.spec:12:18
   |
12 |     invariants [INV-MS-1, INV-MS-99]
   |                           ^^^^^^^^^ not found
   |
   = help: did you mean `INV-MS-9`?
   = note: available invariants: INV-MS-1, INV-MS-2, INV-MS-3

error[E002]: duplicate behavior ID `BEH-MS-001`
  --> behaviors/order-crud.spec:5:3
   |
 5 |   behavior BEH-MS-001 "Create Order" {
   |            ^^^^^^^^^^ already defined here
   |
  --> behaviors/user-crud.spec:8:3
   |
 8 |   behavior BEH-MS-001 "Create User" {
   |            ^^^^^^^^^^ first definition

warning[W001]: orphan behavior — not referenced by any feature
  --> behaviors/user-crud.spec:30:3
   |
30 |   behavior BEH-MS-008 "Soft Delete User" {
   |            ^^^^^^^^^^ add to a feature or remove
```

Errors styled like `rustc` — file, line, column, context, suggestions.

---

## LSP: Navigation Layer

The LSP server runs against the in-memory graph. Compiler in watch mode rebuilds the graph on file change.

### Features

**Go-to-definition:**
Ctrl+click on `INV-MS-1` anywhere → jumps to `invariants/data.spec:3`

**Find all references:**
Right-click `INV-MS-1` → shows every behavior, decision, and feature that references it

**Hover info:**

```
┌────────────────────────────────────────┐
│ invariant INV-MS-1 "Data Persistence"  │
│                                        │
│ All committed writes survive process   │
│ restarts.                              │
│                                        │
│ Referenced by: 3 behaviors, 1 ADR      │
│ Risk: high                             │
│ Tests: 4 ✓                             │
└────────────────────────────────────────┘
```

**Autocomplete:**

```
invariants [INV-|
              ├─ INV-MS-1  "Data Persistence"
              ├─ INV-MS-2  "Email Uniqueness"
              └─ INV-MS-3  "Audit Trail Integrity"
```

**Rename symbol:**
Rename `INV-MS-1` → updates every `.spec` file that references it.

**Diagnostics (live, as you type):**

- Red squiggle on broken references
- Yellow squiggle on orphan behaviors
- Info squiggle on behaviors without tests

**Code actions:**

```
BEH-MS-005 has no tests.
  Quick fix: Generate test stub for Go | TypeScript | Python
```

**Outline view (sidebar):**

```
behaviors/user-crud.spec
  User CRUD [BEH-MS-001..008]
    ├─ BEH-MS-001 Create User         ✓ 3 tests
    ├─ BEH-MS-002 Read User by ID     ✗ no tests
    ├─ BEH-MS-003 Update User Email   ✗ no tests
    └─ ...
```

---

## CLI Commands

```bash
specforge init                        # scaffold a new spec project
specforge check                       # parse + resolve + validate (like tsc --noEmit)
specforge check --strict              # treat warnings as errors
specforge watch                       # incremental recompilation on file change

specforge trace                       # print full traceability tree
specforge trace BEH-MS-001            # trace one behavior up and down

specforge coverage                    # scan test_dirs for @spec annotations
specforge coverage --min=95           # fail if below threshold
specforge coverage --format=json      # machine-readable output

specforge render markdown ./docs/     # emit .md files for stakeholders
specforge render json ./out/          # emit JSON graph for tooling

specforge stats                       # summary: counts, coverage %, orphans
specforge graph                       # dump DOT format for visualization
specforge graph | dot -Tsvg > spec.svg

specforge lsp                         # start LSP server (editor integration)
```

---

## Test Coverage: Framework-Native Plugins

Comment scanning (`// @spec BEH-MS-001`) is fragile — it's just a string, it tells you nothing about pass/fail, and it can't validate that the test actually exercises the behavior. Instead, specforge ships **test runner plugins** that integrate natively with each framework.

### The Protocol: `specforge-report.json`

Every plugin emits a standard report file after test execution:

```json
{
  "specforge": "1.0",
  "runner": "@specforge/vitest",
  "timestamp": "2026-03-01T14:30:00Z",
  "behaviors": {
    "BEH-MS-001": {
      "tests": [
        {
          "name": "creates user with unique email",
          "file": "tests/user-crud.test.ts",
          "line": 12,
          "status": "pass",
          "duration_ms": 45
        },
        {
          "name": "rejects duplicate email",
          "file": "tests/user-crud.test.ts",
          "line": 28,
          "status": "pass",
          "duration_ms": 32
        }
      ],
      "status": "covered"
    },
    "BEH-MS-002": {
      "tests": [],
      "status": "missing"
    }
  },
  "invariants": {
    "INV-MS-2": {
      "violations": [
        {
          "name": "rejects concurrent duplicate emails",
          "file": "tests/user-crud.test.ts",
          "line": 45,
          "status": "pass",
          "duration_ms": 120
        }
      ],
      "status": "covered"
    }
  }
}
```

The specforge CLI reads this file — not source comments — for coverage analysis.

### `@specforge/vitest` — TypeScript / JavaScript

```typescript
// vitest.config.ts
import { specforgeReporter } from "@specforge/vitest";

export default defineConfig({
  test: {
    reporters: [specforgeReporter({ specDir: "./spec" })],
  },
});
```

```typescript
// tests/user-crud.test.ts
import { spec, violation } from "@specforge/vitest";

spec("BEH-MS-001", () => {
  it("creates user with unique email", async () => {
    const repo = createUserRepository(testDb);
    const result = await repo.create({
      email: "a@b.com",
      name: "Alice",
      role: "admin",
    });
    expect(result.isOk()).toBe(true);

    const found = await repo.findById(result.value.id);
    expect(found.value).toEqual(result.value);
  });

  it("rejects duplicate email", async () => {
    const repo = createUserRepository(testDb);
    await repo.create({ email: "a@b.com", name: "Alice", role: "admin" });
    const dup = await repo.create({ email: "a@b.com", name: "Bob", role: "viewer" });
    expect(dup.isErr()).toBe(true);
    expect(dup.error._tag).toBe("DuplicateEmailError");
  });
});

// Invariant violation test — proves the system PREVENTS the violation
violation("INV-MS-2", () => {
  it("rejects concurrent duplicate emails", async () => {
    const repo = createUserRepository(testDb);
    const results = await Promise.all([
      repo.create({ email: "same@b.com", name: "A", role: "admin" }),
      repo.create({ email: "same@b.com", name: "B", role: "admin" }),
    ]);

    const successes = results.filter(r => r.isOk());
    const failures = results.filter(r => r.isErr());
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0].error._tag).toBe("DuplicateEmailError");
  });
});
```

**What `spec()` does at runtime:**

- Wraps `describe()` — all tests inside are tagged with the behavior ID
- The reporter collects per-behavior results: pass, fail, skip, duration
- If a `spec("BEH-MS-099")` references an ID that doesn't exist in `.spec` files, the reporter **fails the test suite** with a clear error
- Emits `specforge-report.json` at the end of the run

**What `violation()` does at runtime:**

- Same as `spec()` but tags the test as an invariant violation test
- These tests prove the system prevents a bad state, not just that the happy path works

### `@specforge/pytest` — Python

```python
# conftest.py
pytest_plugins = ["specforge.pytest"]

# pytest.ini or pyproject.toml
[tool.specforge]
spec_dir = "./spec"
```

```python
# tests/test_user_crud.py
from specforge.pytest import spec, violation

@spec("BEH-MS-001")
class TestCreateUser:
    async def test_creates_user(self, user_repo):
        result = await user_repo.create(
            CreateUserCommand(email="a@b.com", name="Alice", role=UserRole.ADMIN)
        )
        assert result.is_ok()

        found = await user_repo.find_by_id(result.ok().id)
        assert found.ok() == result.ok()

    async def test_rejects_duplicate_email(self, user_repo):
        await user_repo.create(
            CreateUserCommand(email="a@b.com", name="Alice", role=UserRole.ADMIN)
        )
        dup = await user_repo.create(
            CreateUserCommand(email="a@b.com", name="Bob", role=UserRole.VIEWER)
        )
        assert dup.is_err()
        assert dup.err()._tag == "DuplicateEmailError"


@violation("INV-MS-2")
class TestEmailUniquenessInvariant:
    async def test_concurrent_duplicate_emails(self, user_repo):
        """Two concurrent creates with same email — exactly one wins."""
        results = await asyncio.gather(
            user_repo.create(CreateUserCommand(email="same@b.com", name="A", role=UserRole.ADMIN)),
            user_repo.create(CreateUserCommand(email="same@b.com", name="B", role=UserRole.ADMIN)),
        )
        successes = [r for r in results if r.is_ok()]
        failures = [r for r in results if r.is_err()]
        assert len(successes) == 1
        assert len(failures) == 1
```

**How the pytest plugin works:**

- `@spec("BEH-MS-001")` is a decorator that marks a test class or function
- The plugin registers a custom pytest reporter that collects results per behavior ID
- At session end, emits `specforge-report.json`
- Validates behavior IDs against `.spec` files at collection time — unknown IDs fail immediately

### `@specforge/go` — Go

```go
// user_crud_test.go
package user_test

import (
    "testing"
    "github.com/specforge/go-specforge"
)

func TestCreateUser(t *testing.T) {
    specforge.Spec(t, "BEH-MS-001")

    repo := createUserRepository(testDB)

    t.Run("creates user with unique email", func(t *testing.T) {
        result, err := repo.Create(ctx, CreateUserCommand{
            Email: "a@b.com", Name: "Alice", Role: RoleAdmin,
        })
        require.NoError(t, err)
        require.NotNil(t, result)

        found, err := repo.FindByID(ctx, result.ID)
        require.NoError(t, err)
        require.Equal(t, result, found)
    })

    t.Run("rejects duplicate email", func(t *testing.T) {
        _, _ = repo.Create(ctx, CreateUserCommand{
            Email: "a@b.com", Name: "Alice", Role: RoleAdmin,
        })
        _, err := repo.Create(ctx, CreateUserCommand{
            Email: "a@b.com", Name: "Bob", Role: RoleViewer,
        })
        require.ErrorAs(t, err, &DuplicateEmailError{})
    })
}

func TestEmailUniquenessInvariant(t *testing.T) {
    specforge.Violation(t, "INV-MS-2")

    // ... concurrent insert test
}
```

**How the Go plugin works:**

- `specforge.Spec(t, "BEH-MS-001")` registers the current test with that behavior ID
- A `TestMain` hook or `-json` output parser collects results
- `go test -json ./... | specforge collect go` parses the JSON test output and emits `specforge-report.json`

### CLI: `specforge coverage`

The CLI reads `specforge-report.json` files (one per test runner) and merges them:

```bash
$ specforge coverage

BEHAVIOR COVERAGE (from 3 reports: vitest, pytest, go)
═══════════════════════════════════════════════════════════════════════
ID          Title                 Tests  Pass  Fail  Skip  Runners
───────────────────────────────────────────────────────────────────────
BEH-MS-001  Create User           5      5     0     0     vitest,pytest,go
BEH-MS-002  Read User by ID       2      2     0     0     vitest,go
BEH-MS-003  Update User Email     3      2     1     0     vitest         ← FAILING
BEH-MS-004  Delete User           2      2     0     0     pytest,go
BEH-MS-005  List Users            0      —     —     —     —              ← MISSING
BEH-MS-006  Search Users          1      1     0     0     go
BEH-MS-007  Change Password       0      —     —     —     —              ← MISSING
BEH-MS-008  Soft Delete User      0      —     —     —     —              ← MISSING
───────────────────────────────────────────────────────────────────────
Total: 5/8 behaviors covered (62.5%)
       15 tests | 12 pass | 1 fail | 0 skip
Threshold: 95%    FAIL

INVARIANT VIOLATION TESTS
═══════════════════════════════════════════════════════════════════════
ID          Title                 Behaviors  Violation Tests   Status
───────────────────────────────────────────────────────────────────────
INV-MS-1    Data Persistence      5          1 pass            ok
INV-MS-2    Email Uniqueness      2          1 pass            ok
INV-MS-3    Audit Integrity       3          0                 MISSING
───────────────────────────────────────────────────────────────────────

FAILING BEHAVIORS
═══════════════════════════════════════════════════════════════════════
BEH-MS-003 "Update User Email"
  FAIL  tests/user-crud.test.ts:52 "concurrent updates — exactly one wins"
        AssertionError: expected 1, got 2 (both succeeded)
        Duration: 230ms

ORPHANS (defined in .spec but not referenced by any feature)
═══════════════════════════════════════════════════════════════════════
BEH-MS-008 "Soft Delete User" — no feature references it
```

### Key Differences from Comment Scanning

| Aspect                  | Comment scanning           | Framework plugins                       |
| ----------------------- | -------------------------- | --------------------------------------- |
| Knows if test passes    | No — just "comment exists" | Yes — per-behavior pass/fail/skip       |
| Duration tracking       | No                         | Yes — per test and per behavior         |
| Validates IDs           | No — typos are invisible   | Yes — unknown ID = test failure         |
| Multi-runner merge      | Grep across files          | Merge `specforge-report.json` files     |
| Failing behavior detail | No                         | Yes — shows assertion error + file:line |
| CI integration          | Fragile grep               | Standard JSON report                    |
| Invariant violations    | Cannot distinguish         | First-class `violation()` primitive     |
| Runtime overhead        | Zero                       | Minimal (decorator + reporter)          |

### Project Configuration

```spec
// specforge.spec

spec "my-service" {
  infix   "MS"
  version "1.0"

  coverage {
    threshold     95           // minimum % of behaviors covered
    reports [                  // paths to specforge-report.json files
      "specforge-report.json",                    // default
      "services/auth/specforge-report.json",      // monorepo subproject
    ]
    require_violation_tests  true     // every invariant needs a violation() test
    fail_on_unknown_ids      true     // spec("BEH-XX-999") fails if ID not in .spec
  }
}
```

### CI Pipeline

```yaml
# .github/workflows/spec.yml
jobs:
  spec-check:
    steps:
      - run: specforge check --strict

  test-ts:
    steps:
      - run: pnpm vitest run # emits specforge-report.json via reporter
      - uses: actions/upload-artifact@v4
        with: { name: report-ts, path: specforge-report.json }

  test-py:
    steps:
      - run: pytest # emits specforge-report.json via plugin
      - uses: actions/upload-artifact@v4
        with: { name: report-py, path: specforge-report.json }

  test-go:
    steps:
      - run: go test -json ./... | specforge collect go
      - uses: actions/upload-artifact@v4
        with: { name: report-go, path: specforge-report.json }

  coverage:
    needs: [spec-check, test-ts, test-py, test-go]
    steps:
      - uses: actions/download-artifact@v4 # download all reports
      - run: specforge coverage --min=95 # merge + validate
```

---

## Traceability: Auto-Generated

Traceability is NOT a file you write. It's a graph traversal the compiler performs.

```bash
$ specforge trace

TRACEABILITY CHAIN
══════════════════
UX-MS-001 "Create a New User"
  └─ FEAT-MS-001 "User Management"
      ├─ BEH-MS-001 "Create User"
      │   ├─ INV-MS-1 "Data Persistence"
      │   ├─ INV-MS-2 "Email Uniqueness"
      │   ├─ ADR-001 "PostgreSQL over MongoDB"
      │   └─ tests: 3 (go, ts, py)  ✓
      ├─ BEH-MS-002 "Read User by ID"
      │   ├─ INV-MS-1 "Data Persistence"
      │   └─ tests: 0  ✗ MISSING
      └─ BEH-MS-003 "Update User Email"
          ├─ INV-MS-1 "Data Persistence"
          ├─ INV-MS-2 "Email Uniqueness"
          └─ tests: 0  ✗ MISSING
```

### Trace a Single Entity

```bash
$ specforge trace BEH-MS-001

BEH-MS-001 "Create User"
  ▲ upstream
  │ └─ FEAT-MS-001 "User Management"
  │     └─ UX-MS-001 "Create a New User"
  │
  ▼ downstream
  ├─ INV-MS-1 "Data Persistence"
  ├─ INV-MS-2 "Email Uniqueness"
  ├─ ADR-001 "PostgreSQL over MongoDB"
  ├─ FM-MS-001 "Write Acknowledged but Lost" (RPN: 48)
  └─ tests:
      ├─ tests/user_test.go::TestCreateUser
      ├─ tests/user.test.ts:45
      └─ tests/test_user.py::test_create_user
```

---

## What You Don't Write Anymore

| Before (markdown + YAML + bash)    | After (.spec compiler)                              |
| ---------------------------------- | --------------------------------------------------- |
| `index.yaml` per directory         | **Generated** by `specforge render`                 |
| `TRACE-SF-*.md` traceability files | **Generated** by `specforge trace`                  |
| `overview.md` document map         | **Generated** — compiler knows all files            |
| 10 bash validation scripts         | **Gone** — compiler validates by construction       |
| Manual cross-reference maintenance | **Gone** — `use` imports + typed IDs                |
| 25 Claude skills for authoring     | **Optional** — compiler enforces structure directly |

## What You Still Write

| Document                        | Why                                                          |
| ------------------------------- | ------------------------------------------------------------ |
| `.spec` files                   | Source of truth — behaviors, invariants, features, decisions |
| Test files (any language)       | Using `spec()` / `violation()` from framework plugin         |
| `specforge.spec` project config | Coverage thresholds, gen targets, infix                      |

---

## Implementation Plan

### Technology: Rust CLI

A Rust crate producing three binaries:

```
specforge-parser     tree-sitter grammar → AST
specforge-cli        check, trace, coverage, render
specforge-lsp        Language Server Protocol
```

### Distribution

- `npx specforge` (npm wrapper around binary)
- `brew install specforge`
- `cargo install specforge`
- GitHub releases (prebuilt binaries for mac/linux/windows)

### Build Order

1. **Tree-sitter grammar** — defines the `.spec` syntax
2. **Parser** — `.spec` → AST
3. **Resolver** — AST → in-memory graph (nodes + edges)
4. **Validator** — graph → diagnostics (errors, warnings)
5. **CLI** — `check`, `trace`, `coverage`, `render`
6. **LSP** — diagnostics, go-to-def, references, hover, autocomplete
7. **Emitters** — markdown, JSON, DOT graph

Steps 1–5 = usable tool. Step 6 = great DX. Step 7 = complete.

---

## Migration Path

### Phase 1: YAML fallback (optional)

Before the custom parser is ready, support structured YAML with JSON Schema:

```yaml
# behaviors/user-crud.spec.yaml
kind: behavior-group
id_range: [1, 8]
invariants: [INV-MS-1, INV-MS-2]
adrs: [ADR-001]
behaviors:
  - id: BEH-MS-001
    title: Create User
    contract: |
      MUST create a user record with unique email.
    verification:
      unit: "insert user, retrieve by ID"
    tests:
      - "tests/user_test.go::TestCreateUser"
```

The same linker/resolver backend works for both YAML and `.spec` inputs.

### Phase 2: `.spec` format

Once the tree-sitter grammar and parser are ready, migrate from YAML to `.spec`:

```bash
specforge migrate ./spec/  # auto-convert .spec.yaml → .spec
```

Both formats can coexist during transition.

---

## Comparison: Before vs. After

| Aspect           | Before                         | After                                                                        |
| ---------------- | ------------------------------ | ---------------------------------------------------------------------------- |
| Source of truth  | 700 markdown files             | `.spec` files                                                                |
| Storage          | Filesystem + Neo4j             | In-memory graph (rebuilt on compile)                                         |
| Validation       | 62 bash rules, post-hoc        | Compiler, instant, as-you-type                                               |
| Navigation       | grep / manual search           | LSP: go-to-def, find refs, rename                                            |
| Traceability     | 10 hand-written TRACE files    | `specforge trace` — auto-generated                                           |
| Test coverage    | None                           | Framework plugins: `@specforge/vitest`, `@specforge/pytest`, `@specforge/go` |
| Cross-references | YAML strings                   | Typed imports + compiler-checked IDs                                         |
| Index files      | Manual `index.yaml`            | Generated                                                                    |
| Learning curve   | 25 Claude skills + conventions | One syntax, one CLI                                                          |
| Dependencies     | Node.js + bash + yq + sed      | One binary                                                                   |
| Language lock-in | TypeScript ecosystem           | Universal — works with any project                                           |

---

## Language Integration: Code Generation

Coverage plugins tell you **which behaviors have tests**. Code generation goes further — it produces **types, ports, and test scaffolds** from `.spec` files, like protobuf generates stubs for gRPC.

### New DSL Concept: `type` and `port` Blocks

```spec
// types/user.spec

type User {
  id        string      @readonly
  email     string      @unique
  name      string
  role      UserRole
  createdAt timestamp   @readonly
  updatedAt timestamp   @readonly
}

type UserRole = admin | editor | viewer

type CreateUserCommand {
  email  string
  name   string
  role   UserRole
}

type DuplicateEmailError {
  _tag   "DuplicateEmailError"   @literal
  email  string
  message string
}

type UserNotFoundError {
  _tag    "UserNotFoundError"    @literal
  userId  string
  message string
}
```

```spec
// ports/user-repository.spec

use types/user

port UserRepository {
  direction outbound
  category  "persistence/user"

  method create(cmd: CreateUserCommand) -> Result<User, DuplicateEmailError>
  method findById(id: string) -> Result<User, UserNotFoundError>
  method findByEmail(email: string) -> Result<User?, never>
  method update(id: string, cmd: UpdateUserCommand) -> Result<User, DuplicateEmailError | UserNotFoundError>
  method delete(id: string) -> Result<void, UserNotFoundError>
}
```

### `specforge gen`

```bash
specforge gen typescript ./src/generated/
specforge gen python ./src/generated/
specforge gen go ./internal/generated/
specforge gen json-schema ./schemas/
```

### Generated: TypeScript (using hex-di stack)

```typescript
// src/generated/types/user.ts  (auto-generated — do not edit)

export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: UserRole;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type UserRole = "admin" | "editor" | "viewer";

export interface CreateUserCommand {
  readonly email: string;
  readonly name: string;
  readonly role: UserRole;
}

export interface DuplicateEmailError {
  readonly _tag: "DuplicateEmailError";
  readonly email: string;
  readonly message: string;
}

export interface UserNotFoundError {
  readonly _tag: "UserNotFoundError";
  readonly userId: string;
  readonly message: string;
}
```

```typescript
// src/generated/ports/user-repository.ts  (auto-generated — do not edit)

import type { ResultAsync } from "@hex-di/core";
import type {
  User,
  CreateUserCommand,
  UpdateUserCommand,
  DuplicateEmailError,
  UserNotFoundError,
} from "../types/user";

export interface UserRepository {
  create(cmd: CreateUserCommand): ResultAsync<User, DuplicateEmailError>;
  findById(id: string): ResultAsync<User, UserNotFoundError>;
  findByEmail(email: string): ResultAsync<User | null, never>;
  update(
    id: string,
    cmd: UpdateUserCommand
  ): ResultAsync<User, DuplicateEmailError | UserNotFoundError>;
  delete(id: string): ResultAsync<void, UserNotFoundError>;
}
```

```typescript
// src/generated/tests/user-crud.stubs.ts  (auto-generated — do not edit)
import { spec, violation } from "@specforge/vitest";

spec("BEH-MS-001", () => {
  it.todo("Create User — insert user, retrieve by ID, assert equal");
});

spec("BEH-MS-002", () => {
  it.todo("Read User by ID — insert then get by ID");
});

spec("BEH-MS-003", () => {
  it.todo("Update User Email — update to unique email succeeds");
  it.todo("Update User Email — update to taken email fails with DuplicateEmailError");
});

violation("INV-MS-2", () => {
  it.todo("Email Uniqueness — concurrent inserts with same email, exactly one wins");
});
```

### Generated: Python

```python
# src/generated/types/user.py  (auto-generated — do not edit)
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Literal


class UserRole(Enum):
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"


@dataclass(frozen=True)
class User:
    id: str
    email: str
    name: str
    role: UserRole
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True)
class DuplicateEmailError:
    _tag: Literal["DuplicateEmailError"] = "DuplicateEmailError"
    email: str = ""
    message: str = ""
```

```python
# src/generated/ports/user_repository.py  (auto-generated — do not edit)
from abc import ABC, abstractmethod
from result import Result
from ..types.user import *


class UserRepository(ABC):
    @abstractmethod
    async def create(self, cmd: CreateUserCommand) -> Result[User, DuplicateEmailError]: ...

    @abstractmethod
    async def find_by_id(self, id: str) -> Result[User, UserNotFoundError]: ...

    @abstractmethod
    async def find_by_email(self, email: str) -> Result[User | None, None]: ...

    @abstractmethod
    async def update(self, id: str, cmd: UpdateUserCommand) -> Result[User, DuplicateEmailError | UserNotFoundError]: ...

    @abstractmethod
    async def delete(self, id: str) -> Result[None, UserNotFoundError]: ...
```

```python
# src/generated/tests/test_user_crud_stubs.py  (auto-generated — do not edit)
import pytest
from specforge.pytest import spec, violation


@spec("BEH-MS-001")
class TestCreateUser:
    @pytest.mark.skip(reason="stub — implement this test")
    async def test_create_user(self): ...


@spec("BEH-MS-002")
class TestReadUser:
    @pytest.mark.skip(reason="stub — implement this test")
    async def test_read_user_by_id(self): ...


@violation("INV-MS-2")
class TestEmailUniquenessInvariant:
    @pytest.mark.skip(reason="stub — implement this test")
    async def test_concurrent_duplicate_emails(self): ...
```

### Generated: Go

```go
// internal/generated/types/user.go  (auto-generated — do not edit)
package types

import "time"

type UserRole string

const (
    UserRoleAdmin  UserRole = "admin"
    UserRoleEditor UserRole = "editor"
    UserRoleViewer UserRole = "viewer"
)

type User struct {
    ID        string    `json:"id"`
    Email     string    `json:"email"`
    Name      string    `json:"name"`
    Role      UserRole  `json:"role"`
    CreatedAt time.Time `json:"createdAt"`
    UpdatedAt time.Time `json:"updatedAt"`
}

type DuplicateEmailError struct {
    Tag     string `json:"_tag"`
    Email   string `json:"email"`
    Message string `json:"message"`
}

func (e *DuplicateEmailError) Error() string { return e.Message }
```

```go
// internal/generated/ports/user_repository.go  (auto-generated — do not edit)
package ports

import (
    "context"
    "myservice/internal/generated/types"
)

type UserRepository interface {
    Create(ctx context.Context, cmd types.CreateUserCommand) (types.User, error)
    FindByID(ctx context.Context, id string) (types.User, error)
    FindByEmail(ctx context.Context, email string) (*types.User, error)
    Update(ctx context.Context, id string, cmd types.UpdateUserCommand) (types.User, error)
    Delete(ctx context.Context, id string) error
}
```

### Project Configuration

```spec
// specforge.spec

spec "my-service" {
  infix   "MS"
  version "1.0"

  coverage {
    threshold                 95
    reports                   ["specforge-report.json"]
    require_violation_tests   true
    fail_on_unknown_ids       true
  }

  gen typescript {
    out       "src/generated/"
    result    "hex-di"              // ResultAsync from @hex-di/core
    readonly  true
    naming    "camelCase"
    tests     "@specforge/vitest"   // use spec() / violation() from vitest plugin
  }

  gen python {
    out       "src/generated/"
    result    "result"
    frozen    true
    naming    "snake_case"
    tests     "@specforge/pytest"
  }

  gen go {
    out       "internal/generated/"
    module    "myservice"
    naming    "PascalCase"
    tests     "@specforge/go"
  }

  gen json_schema {
    out       "schemas/"
    draft     "2020-12"
  }
}
```

### Drift Detection

When `.spec` files change, generated code becomes stale:

```bash
$ specforge gen typescript --check   # exits 1 if output would differ from current files

error: generated code is stale
  types/user.spec changed at 2026-03-01 14:30
  src/generated/types/user.ts last generated at 2026-02-28 10:00

  Run `specforge gen typescript` to regenerate.
```

### Adapter Verification

The compiler can verify that hand-written adapters implement generated ports:

```bash
$ specforge verify typescript

PORT IMPLEMENTATION CHECK
═══════════════════════════════════════════════════════════════
Port                 Adapter                         Status
───────────────────────────────────────────────────────────────
UserRepository       src/adapters/pg-user-repo.ts    ok
EmailService         src/adapters/sendgrid.ts        ok
PaymentGateway       —                               MISSING
───────────────────────────────────────────────────────────────
```

### Full Chain: Spec -> Code -> Test -> Report

```
types/user.spec            --gen-->  src/generated/types/user.ts
ports/user-repo.spec       --gen-->  src/generated/ports/user-repository.ts
                                         ^ implements
                                     src/adapters/pg-user-repo.ts        (hand-written)
                                         ^ tested by
behaviors/user-crud.spec   --gen-->  src/generated/tests/user-crud.stubs.ts
                                         ^ developer fills in
                                     tests/user-crud.test.ts             (hand-written)
                                         uses spec("BEH-MS-001") from @specforge/vitest
                                         ^ reporter emits
                                     specforge-report.json               (auto-generated)
                                         ^ read by
                                     specforge coverage --min=95         (CI gate)
```

### Language Plugin Architecture

Each generator and test plugin is a standalone package:

| Package                     | Role                                                     | Language   |
| --------------------------- | -------------------------------------------------------- | ---------- |
| `@specforge/vitest`         | Test runner plugin (reporter + `spec()` / `violation()`) | TypeScript |
| `@specforge/jest`           | Test runner plugin for Jest                              | TypeScript |
| `@specforge/pytest`         | Pytest plugin (decorator + reporter)                     | Python     |
| `@specforge/go`             | Test helper + JSON output collector                      | Go         |
| `@specforge/gen-typescript` | Code generator (built-in)                                | TypeScript |
| `@specforge/gen-python`     | Code generator (built-in)                                | Python     |
| `@specforge/gen-go`         | Code generator (built-in)                                | Go         |
| `@specforge/gen-rust`       | Code generator (community)                               | Rust       |
| `@specforge/gen-kotlin`     | Code generator (community)                               | Kotlin     |

Custom plugins read the in-memory graph as JSON from stdin and write files to stdout. Write a plugin in any language.

### Integration Depth by Language

| Level | What                       | TypeScript                                       | Python                                   | Go                          |
| ----- | -------------------------- | ------------------------------------------------ | ---------------------------------------- | --------------------------- |
| **0** | `specforge check` only     | yes                                              | yes                                      | yes                         |
| **1** | Type generation            | interfaces (readonly)                            | frozen dataclasses                       | structs                     |
| **2** | Port generation            | interface + ResultAsync                          | ABC + Result                             | interface                   |
| **3** | Test stub generation       | `spec()` / `violation()` via `@specforge/vitest` | decorators via `@specforge/pytest`       | helpers via `@specforge/go` |
| **4** | Runtime coverage reporting | vitest reporter -> `specforge-report.json`       | pytest plugin -> `specforge-report.json` | `go test -json` collector   |
| **5** | Adapter verification       | tsc type-check                                   | mypy check                               | go vet                      |
| **6** | Drift detection            | `specforge gen --check`                          | `specforge gen --check`                  | `specforge gen --check`     |

Every project gets Level 0 for free. Deeper integration is opt-in via `gen` and `coverage` blocks in `specforge.spec`.
