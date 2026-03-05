---
id: PROD-SF-002
kind: product
title: SpecForge
status: active
---

# SpecForge

**Specs that verify themselves. Zero setup.**

---

## The Problem Nobody Admits

Every engineering team has a dirty secret: their specs are lies.

The auth spec says the API returns 401 on expired tokens. The code returns 403. Nobody caught it because nobody re-reads specs after sprint 2. Three months later, a junior dev builds a client against the spec, ships it, and the team burns a week debugging a "mystery auth bug" that was documented incorrectly from day one.

The real cost isn't the bug. It's the trust erosion. Once a team stops trusting their specs, they stop writing them. And once they stop writing them, every architectural decision lives in someone's head -- someone who might leave next quarter.

AI coding assistants made this worse, not better. Copilot and Claude generate code fast, but they generate it _against nothing_. No requirements to trace. No coverage to measure. No way to know if what was built matches what was intended. Speed without direction is just faster rework.

## The Idea

What if your spec was a living database -- not a markdown file -- and AI agents continuously verified that your code actually implements it?

SpecForge is a specification platform built on two primitives:

1. **A Neo4j knowledge graph** where every requirement, decision, task, test, and agent conversation is a node with typed relationships. Specs are queried, not parsed. Drift is detected by hash comparison, not by hoping someone reads the diff.

2. **Persistent AI agent sessions** that remember. When a reviewer flags an issue in iteration 2, the author remembers what it wrote in iteration 1 and why it made that choice. Context accumulates across iterations instead of resetting every prompt.

Everything else -- the flows, the convergence loops, the traceability matrix -- follows from these two primitives.

## Zero Config

```
1. npm install -g specforge
2. specforge login          <- browser OAuth, 10 seconds
3. specforge reverse .      <- runs immediately, no setup
4. See results              <- graph populated, reverse spec ready
```

No Neo4j to provision. No environment variables. No infrastructure. Login and start.

SpecForge runs as a **unified local server** -- the same binary in two deployment modes. Solo self-hosted for individual devs (local Neo4j, all features, zero payment). SaaS for managed graph infrastructure with zero setup. Claude Code CLI runs locally on your machine. SpecForge provides the graph and orchestration — Claude Code CLI handles all LLM interaction internally.

## How It Works

You run a flow. SpecForge orchestrates 8 specialist agent roles through phases until convergence:

**Discovery** -- An agent interviews you to extract requirements. You approve a brief. You can inject feedback at any point via `specforge feedback` or the web dashboard.

**Spec Forge** -- The spec-author creates structure and fills it in. The reviewer (architecture + traceability) flags issues. The feedback-synthesizer prioritizes feedback -- including any human feedback, which always ranks highest. The author revises. This loops until zero critical findings and 80%+ coverage. Not once -- _until convergence_.

**Task Master** -- The spec is decomposed into implementation tasks with acceptance criteria and dependency ordering.

**Dev Forge** -- A dev-agent writes code and tests. A coverage-agent verifies everything against the spec. This is where persistent sessions earn their keep.

We built SpecForge on top of hex-di, a 15-package TypeScript monorepo with ports, adapters, and compile-time dependency graph validation. Here's what a Dev Forge iteration cycle looked like when implementing the `@hex-di/guard` authorization policy engine:

> **Iteration 1**: dev-agent implements the policy evaluation engine -- `hasRole`, `hasPermission`, `allOf`, `anyOf`, `not`. Coverage-agent runs the test suite: 14/19 pass. Five failures. `hasAttribute` returns `Result.ok` when the attribute key doesn't exist on the subject (should return `PolicyDenied`). `labeled` policies lose their label in the serialization round-trip. Three `allOf` edge cases fail on empty policy arrays.
>
> **Iteration 2**: Same agent session. It reads the five failures from the ACP session -- structured findings with assertion messages, expected vs actual, stack traces. It _remembers_ its iteration 1 implementation choices. It fixes `hasAttribute` (adds a key-existence check before evaluation), patches the serialization codec to preserve labels, and adds the empty-array guard to `allOf`. Coverage-agent re-runs: 19/19. Convergence in 2 iterations.

Two iterations because the agent debugged its own work with full memory. A stateless approach would have re-generated the entire module blind.

**Verification** -- Coverage tracking confirms every requirement traces to a task, code, and test. Gaps are flagged. Nothing slips through.

## Human in the Loop

SpecForge is not fire-and-forget. You stay in control:

- **Inject feedback** -- `specforge feedback <flow-run-id> "focus on error handling"` posts to the ACP session with highest priority. The feedback-synthesizer ranks human feedback above all agent findings.
- **Force convergence** -- `specforge converge <flow-run-id>` force-converges the current phase when you're satisfied.
- **Force iteration** -- `specforge iterate <flow-run-id>` forces another iteration even if convergence criteria are met.
- **Approval gates** -- Phases can require human sign-off via `specforge approve` before proceeding.

All intervention commands work from the CLI, the web dashboard, or VS Code extension.

## Cost Estimation

Before running a flow, know what it will cost:

```bash
specforge estimate spec-writing --package @example/pkg
# Token estimate: 180K-320K (min/avg/max)
# Estimated cost: $2.70-$4.80 (opus model)
```

Budget controls exist at three levels: per-flow, per-phase, and per-agent. When a budget is exceeded, agents wrap up gracefully instead of crashing.

## Flow Presets

Each flow supports presets that trade quality for speed and cost:

```bash
specforge run spec-writing --preset quick      # Fewer iterations, sonnet model
specforge run spec-writing --preset standard   # Default settings
specforge run spec-writing --preset thorough   # More iterations, opus model, stricter convergence
```

## Collaboration

In SaaS mode, teams share an **org graph** via the web dashboard:

- **Shared flow observation** -- multiple users view the same active flow run in real time via the web dashboard
- **Comment threads** -- comment on findings and spec sections, visible in both the web dashboard and VS Code extension
- **Approval workflows** -- phase completion can require sign-off from designated approvers (multi-user)
- **Org roles** -- owners, admins, members, and viewers with appropriate access controls
- **Session composition across the team** -- a reviewer's findings from last week are available as context for this week's spec-author
- **Presence indicators** -- see who else is viewing the same flow run

Personal graphs for individual work. Org graphs for team collaboration.

## Ask Your Graph

```bash
specforge ask "what requirements are untested?"
specforge ask "what changed since last week?"
specforge ask "what depends on the AuthPort?"
```

Natural language queries against the knowledge graph. SpecForge translates your question into Cypher, executes it, and returns human-readable results. Available in all deployment modes -- the NLQ engine runs locally.

## Pricing

Solo self-hosted is free with all features. SaaS tiers gate **cloud infrastructure** (managed Neo4j size, backup retention, SSO), not features. You pay for Claude Code CLI usage separately — SpecForge never touches your LLM costs.

| Mode                 | What You Get                                              | Price       |
| -------------------- | --------------------------------------------------------- | ----------- |
| **Solo Self-Hosted** | All features, local Neo4j, manage your own infra          | Free        |
| **SaaS Starter**     | All features, 100MB managed graph, 1 project              | $0          |
| **SaaS Pro**         | All features, 5GB managed graph, 5 projects               | $29/mo      |
| **SaaS Team**        | All features, 50GB managed graph, unlimited projects, SSO | $19/seat/mo |
| **SaaS Enterprise**  | All features, custom storage, data residency, SLA         | Custom      |

The free tier is the wedge: `specforge reverse .` and `specforge check` work with zero payment in any mode. Experience value before any billing decision.

## Why Not Just Use Claude Code Directly?

Fair question. Claude Code is the runtime -- SpecForge agents _are_ Claude Code sessions. You could prompt Claude Code manually to write a spec, then implement it, then review it.

But you'd lose:

- **Convergence guarantees** -- SpecForge loops review/revise cycles until criteria are met. Manual prompting is one-shot.
- **Traceability** -- Every requirement-to-test link is a graph edge. Manual prompting produces disconnected artifacts.
- **Accumulated knowledge** -- Agent conversations are chunked, embedded, and stored in the graph. Next month's flow bootstraps from this month's reasoning. Manual prompting starts cold every time.
- **Multi-agent specialization** -- 8 agent roles with distinct expertise. A reviewer that only reviews catches things an author agent won't. Role separation produces better output than a single generalist prompt.
- **Human-in-the-loop** -- Inject feedback, force convergence, approve phases. You stay in control of the process.
- **Cost visibility** -- Estimate costs before running. Track token usage per agent, phase, and flow. Budget controls prevent runaway spending.

SpecForge is to Claude Code what a CI pipeline is to running `npm test` manually. The primitives are the same. The orchestration is the value.

## Beyond Spec Writing

SpecForge ships four additional flows -- reverse engineering (3 phases: analysis, generation, validation), code review (PRs analyzed against requirements), risk assessment, and onboarding (3 phases: analysis, documentation, review) -- all using the same convergence loops and graph traceability. Flows can be triggered reactively on PR open, push, build failure, or cron. Custom flows are declarative data. Flow presets let you trade quality for speed.

## Open-Core

SpecForge is one server binary, two deployment modes. Same features everywhere -- mode selection determines which backend adapters are loaded, not which features are available.

- **Solo Self-Hosted:** Local SpecForge Server + local Neo4j. All features, no auth. Perfect for individual developers. Access via CLI, web dashboard (`specforge dashboard`), or VS Code extension.
- **SaaS (default):** Local SpecForge Server connects to SpecForge Cloud for managed Neo4j, OAuth, billing, and agent marketplace. Zero infrastructure setup -- login and start.

All modes run Claude Code CLI locally. SpecForge never touches your Claude Code credentials.

## Honest Tradeoffs

- **Cost**: Two bills -- Claude Code CLI usage (your own account) and SpecForge for graph infrastructure. A full spec-writing flow with opus agents runs serious token volume. Budget controls exist (per-flow, per-phase, per-agent) and `specforge estimate` previews cost before you commit, but this isn't a free lunch. Plan for it.
- **Latency**: End-to-end spec writing is a background workflow, not an interactive tool. Multiple convergence cycles take time. Discovery is conversational; everything after it runs unattended.
- **Cold start**: The knowledge graph is empty on day one. Session composition -- where agents bootstrap from prior reasoning -- only gets valuable after several flow runs. The first run is the least impressive. The tenth is where it clicks.
- **Quality ceiling**: AI-generated specs are bounded by the requirements conversation. A vague brief produces a vague spec, no matter how many review iterations you run. Human feedback helps steer, but garbage in still produces garbage out.

## Why This Couldn't Exist Before 2025

Eighteen months ago, AI agents were stateless function calls. You'd prompt, get a response, and start over. Building a spec required babysitting every step because the agent forgot what it did between turns.

Claude Code changed one thing: persistent sessions with tool access. An agent that can read files, run tests, search code, and _remember what it tried last iteration_. That single capability unlock makes SpecForge possible -- agents that iterate on their own work instead of generating once and hoping.

Two other pieces fell into place at the same time: MCP gave agents a standard protocol for external services (GitHub, Jira, Slack) without custom integration per tool. Neo4j added native vector indexes, so session chunks can be embedded and composed without a separate vector store.

The building blocks arrived. SpecForge is the obvious thing to assemble from them.

## Who This Is For

Engineering leads and tech leads at teams that have outgrown "specs in Notion" but aren't ready to hire a dedicated documentation team. Teams where architectural decisions live in Slack threads and PR comments. Teams that want AI to write code _and_ verify that the code matches intent.

If your team ships code without specs and feels fine about it -- this isn't for you.
If your team writes specs that nobody reads after week one -- this is exactly for you.

Solo developers: start with Solo self-hosted or the free SaaS tier. `specforge reverse .` on your codebase. See what it extracts.
Teams: start with SaaS Team tier. Shared org graph. Web dashboard for real-time collaboration. Everyone sees the same truth.

## Built on Its Own Output

SpecForge was designed inside the hex-di monorepo -- a 15-package TypeScript monorepo for compile-time-validated dependency injection. The full SpecForge spec lives at `spec/specforge/`: 21 behavior files covering the knowledge graph, 8 agent roles, flow orchestration, web dashboard, VS Code extension, CLI, extensibility, and SaaS infrastructure. Ten architecture decision records. A traceability matrix. Every port definition with typed error variants.

That spec is the proof of concept. Read it and decide if the output quality justifies the approach.

Start with [overview.md](../overview.md). If the architecture makes sense, run `specforge reverse` on your own codebase and see what it extracts.
