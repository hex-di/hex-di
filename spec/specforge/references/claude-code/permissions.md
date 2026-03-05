# Claude Code — Permissions

**Source:** [Configure Permissions](https://code.claude.com/docs/en/permissions)
**Captured:** 2026-02-27

---

## Permission System

Claude Code uses a tiered permission system:

| Tool Type         | Example          | Approval Required | "Don't ask again" Behavior        |
| ----------------- | ---------------- | ----------------- | --------------------------------- |
| Read-only         | File reads, Grep | No                | N/A                               |
| Bash commands     | Shell execution  | Yes               | Permanently per project + command |
| File modification | Edit/write files | Yes               | Until session end                 |

---

## Permission Modes

| Mode                | Description                                                  |
| ------------------- | ------------------------------------------------------------ |
| `default`           | Standard — prompts for permission on first use               |
| `acceptEdits`       | Auto-accept file edit permissions for the session            |
| `plan`              | Plan Mode — analyze but not modify files or execute commands |
| `dontAsk`           | Auto-deny unless pre-approved via `permissions.allow`        |
| `bypassPermissions` | Skip all permission prompts (containers/VMs only)            |

Set via `--permission-mode` flag or `permissions.defaultMode` in settings.

---

## Rule Evaluation Order

**deny → ask → allow** — the first matching rule wins. Deny rules always take precedence.

---

## Rule Syntax

### Match All Uses

| Rule       | Effect                         |
| ---------- | ------------------------------ |
| `Bash`     | Matches all Bash commands      |
| `WebFetch` | Matches all web fetch requests |
| `Read`     | Matches all file reads         |

### Specifiers

| Rule                           | Effect              |
| ------------------------------ | ------------------- |
| `Bash(npm run build)`          | Exact command match |
| `Read(./.env)`                 | Specific file       |
| `WebFetch(domain:example.com)` | Domain match        |

### Wildcards

| Rule                | Effect                               |
| ------------------- | ------------------------------------ |
| `Bash(npm run *)`   | Commands starting with `npm run `    |
| `Bash(git * main)`  | Commands like `git checkout main`    |
| `Bash(* --version)` | Any command ending with ` --version` |

The space before `*` enforces a word boundary: `Bash(ls *)` matches `ls -la` but not `lsof`.

---

## Tool-Specific Rules

### Bash

Supports wildcard matching. Claude Code is aware of shell operators — `Bash(safe-cmd *)` won't match `safe-cmd && other-cmd`.

### Read and Edit

Follow gitignore specification with four pattern types:

| Pattern            | Meaning                            |
| ------------------ | ---------------------------------- |
| `//path`           | Absolute path from filesystem root |
| `~/path`           | Path from home directory           |
| `/path`            | Relative to project root           |
| `path` or `./path` | Relative to current directory      |

`*` matches single directory, `**` matches recursively.

### WebFetch

`WebFetch(domain:example.com)` — domain-based matching.

### MCP

`mcp__puppeteer__puppeteer_navigate` — server + tool matching.

### Task (Subagents)

`Task(Explore)`, `Task(my-custom-agent)` — control which subagents Claude can use.

---

## Managed Permissions (Enterprise)

| Setting                           | Description                      |
| --------------------------------- | -------------------------------- |
| `disableBypassPermissionsMode`    | Prevent `bypassPermissions` mode |
| `allowManagedPermissionRulesOnly` | Only managed rules apply         |
| `allowManagedHooksOnly`           | Only managed/SDK hooks allowed   |
| `allowManagedMcpServersOnly`      | Only managed MCP servers         |

---

## SpecForge Relevance

SpecForge uses permissions for role-based tool scoping:

- **Discovery agent** → `permissions.allow: ["Read", "Glob", "Grep", "WebFetch"]`, deny all write tools
- **Dev agent** → `permissions.allow: ["Read", "Write", "Edit", "Bash"]`
- **Reviewer** → `permissions.allow: ["Read", "Glob", "Grep"]`, deny Bash/Edit

Permission mode is typically `dontAsk` (auto-deny unspecified tools) or `bypassPermissions` (for sandboxed environments).

See [BEH-SF-152](../../behaviors/BEH-SF-151-claude-code-adapter.md).
