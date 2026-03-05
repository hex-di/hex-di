# Claude Code — Memory

**Source:** [Manage Claude's Memory](https://code.claude.com/docs/en/memory)
**Captured:** 2026-02-27

---

## Memory Types

| Memory Type        | Location                                                    | Purpose                                      | Shared With                |
| ------------------ | ----------------------------------------------------------- | -------------------------------------------- | -------------------------- |
| **Managed policy** | `/Library/Application Support/ClaudeCode/CLAUDE.md` (macOS) | Organization-wide instructions               | All users in organization  |
| **Project memory** | `./CLAUDE.md` or `./.claude/CLAUDE.md`                      | Team-shared project instructions             | Team via source control    |
| **Project rules**  | `./.claude/rules/*.md`                                      | Modular, topic-specific project instructions | Team via source control    |
| **User memory**    | `~/.claude/CLAUDE.md`                                       | Personal preferences for all projects        | Just you (all projects)    |
| **Project local**  | `./CLAUDE.local.md`                                         | Personal project-specific preferences        | Just you (current project) |
| **Auto-memory**    | `~/.claude/projects/<project>/memory/`                      | Claude's automatic notes and learnings       | Just you (per project)     |

---

## Memory Precedence

More specific instructions take precedence over broader ones:

1. CLAUDE.md files in the directory hierarchy above cwd are loaded in full at launch
2. CLAUDE.md files in child directories load on demand when Claude reads files there
3. Auto-memory loads only the first 200 lines of `MEMORY.md`

---

## Auto-Memory

Persistent directory where Claude records learnings: project patterns, debugging insights, architecture notes, user preferences.

### Structure

```
~/.claude/projects/<project>/memory/
├── MEMORY.md          # Concise index (first 200 lines loaded at startup)
├── debugging.md       # Detailed notes
├── api-conventions.md # Topic files
└── ...
```

The `<project>` path is derived from the git repository root. Git worktrees get separate memory directories.

### Controls

- Toggle: `/memory` command
- Setting: `autoMemoryEnabled: false` in settings
- Environment: `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` (overrides all)

---

## CLAUDE.md Imports

```markdown
See @README for project overview and @package.json for available commands.

# Additional Instructions

- git workflow @docs/git-instructions.md
```

- Both relative and absolute paths allowed
- Relative paths resolve relative to the file containing the import
- Not evaluated inside code spans/blocks
- Recursive imports supported (max depth: 5)
- First-time external imports require approval

---

## Modular Rules: `.claude/rules/`

Organize instructions into focused files:

```
.claude/rules/
├── code-style.md
├── testing.md
└── security.md
```

All `.md` files in `.claude/rules/` are automatically loaded as project memory.

### Path-Specific Rules

Scope rules to specific files using YAML frontmatter:

```yaml
---
paths:
  - "src/api/**/*.ts"
---
# API Development Rules
- All API endpoints must include input validation
```

Rules without `paths` apply unconditionally.

### Glob Patterns

| Pattern             | Matches                               |
| ------------------- | ------------------------------------- |
| `**/*.ts`           | All TypeScript files in any directory |
| `src/**/*`          | All files under `src/`                |
| `src/**/*.{ts,tsx}` | Both `.ts` and `.tsx` files           |

### Subdirectories

Rules in subdirectories are discovered recursively:

```
.claude/rules/
├── frontend/
│   ├── react.md
│   └── styles.md
├── backend/
│   ├── api.md
│   └── database.md
└── general.md
```

### User-Level Rules

`~/.claude/rules/` — personal rules for all projects. Loaded before project rules (lower priority).

---

## SpecForge Relevance

SpecForge can leverage Claude Code's memory system for:

- **CLAUDE.md** — inject project-wide instructions (coding standards, architecture decisions)
- **`.claude/rules/`** — per-module instructions for domain-specific agents
- **System prompt** — role-specific instructions override CLAUDE.md for agent sessions

The `ClaudeCodeAdapter` uses `--system-prompt` or `--append-system-prompt` to compose role instructions with CLAUDE.md context.
