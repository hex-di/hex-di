# Documentation Map

This page explains where documentation lives, which source is canonical, and the recommended reading order for different personas.

## Documentation Locations

| Location                | Purpose                                                               | Canonical for                              |
| ----------------------- | --------------------------------------------------------------------- | ------------------------------------------ |
| `docs/`                 | User-facing guides, API reference, architecture overview, runbook     | Prose documentation and contributor guides |
| `spec/`                 | Per-package specifications, ADRs, behaviors, invariants, traceability | Formal contracts and design decisions      |
| `websites/hexdi/docs/`  | Rendered Docusaurus site for the HexDI product                        | Published user docs (may extend `docs/`)   |
| `websites/result/docs/` | Rendered Docusaurus site for the Result package                       | Published Result docs (may extend `docs/`) |
| `README.md`             | Project overview, package map, quick-start                            | Entry point for all audiences              |
| `CONTRIBUTING.md`       | Setup, standards, PR process                                          | Contributor workflow                       |
| `AGENTS.md`             | AI agent bootstrap, CI parity commands                                | Agent/automation onboarding                |
| `CLAUDE.md`             | Project rules for AI coding assistants                                | AI coding constraints                      |

## Source-of-Truth Hierarchy

- **Specifications and ADRs** — `spec/` directories are canonical. If `docs/` or `websites/` contain the same information, `spec/` wins on design rationale.
- **User guides and API docs** — `docs/` is canonical for prose content. `websites/` renders and may extend it.
- **Code standards and workflow** — `CONTRIBUTING.md` and `CLAUDE.md` are canonical. `AGENTS.md` summarizes key rules but defers to these.

## Recommended Reading Paths

### New user

1. [README.md](https://github.com/leaderiop/hex-di/blob/main/README.md) — install, quick start, package map
2. [docs/getting-started/](./getting-started/README.md) — installation, core concepts, first application
3. [docs/api/](./api/README.md) — API reference for published packages

### Contributor

1. [README.md](https://github.com/leaderiop/hex-di/blob/main/README.md) — project overview
2. [CONTRIBUTING.md](https://github.com/leaderiop/hex-di/blob/main/CONTRIBUTING.md) — setup, standards, PR process
3. [docs/architecture.md](./architecture.md) — layer diagram, boundaries, tooling index
4. [docs/glossary.md](./glossary.md) — domain terminology
5. [docs/decisions/README.md](./decisions/README.md) — ADR navigator
6. [docs/new-package-checklist.md](./new-package-checklist.md) — when adding packages

### AI agent

1. [AGENTS.md](https://github.com/leaderiop/hex-di/blob/main/AGENTS.md) — bootstrap sequence, CI parity, test matrix
2. [CLAUDE.md](https://github.com/leaderiop/hex-di/blob/main/CLAUDE.md) — coding rules (no `any`, no casts, errors as values)
3. [docs/architecture.md](./architecture.md) — package boundaries and enforcement tools
4. [docs/runbook.md](./runbook.md) — operational procedures
5. [docs/debug-playbook.md](./debug-playbook.md) — troubleshooting
