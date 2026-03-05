---
id: BEH-SF-113
kind: behavior
title: CLI
status: active
id_range: "113--120"
invariants: [INV-SF-9]
adrs: [ADR-007]
types: [flow, flow]
ports: [OrchestratorPort, GraphQueryPort]
---

# 16 — CLI

---

## Constraints

The CLI operates **independently of the Desktop App**. It connects to a running SpecForge Server (discovered via `SPECFORGE_SERVER_URL` env var, `.specforge/server.lock` file, or default `http://localhost:7654`) or auto-starts one. CI/CD pipelines MUST be able to use the CLI without any Desktop App dependency.

## BEH-SF-113: Flow Execution Commands — `specforge run` and `specforge estimate`

The CLI provides `specforge run <flow-name>` for executing flows and `specforge estimate <flow-name>` for predicting token usage and cost before running. Both commands support presets and model overrides.

### Contract

REQUIREMENT (BEH-SF-113): `specforge run <flow-name>` MUST invoke `OrchestratorPort.startFlow(flowName, input)` with the specified flow name and options. The command MUST support: `--batch` (skip phase pauses), `--max-iterations N` (override max iterations), `--model <model>` (override model), `--budget <tokens>` (token budget), `--compose-from <id>` (bootstrap from prior run), `--preset <quick|standard|thorough>` (apply flow preset). `specforge estimate <flow-name>` MUST predict token usage and cost based on flow definition, package size, and model pricing. The estimate MUST output min/avg/max ranges for token usage and estimated cost. Both commands MUST exit with the appropriate error code on completion.

### Verification

- Run test: execute `specforge run spec-writing --package @example/pkg`; verify the flow starts.
- Batch test: execute with `--batch`; verify no phase pauses occur.
- Preset test: execute with `--preset quick`; verify the quick preset is applied.
- Estimate test: execute `specforge estimate spec-writing`; verify min/avg/max token and cost ranges are output.
- Exit code test: verify exit code 0 on success, 1 on failure, 2 on warnings.

---

## BEH-SF-114: NLQ Queries — `specforge ask` Translates Natural Language to Cypher

`specforge ask` translates natural language questions into Cypher queries via a Claude Code session, executes them against the knowledge graph, and returns human-readable results.

### Contract

REQUIREMENT (BEH-SF-114): `specforge ask "<question>"` MUST spawn a Claude Code session to translate the natural language question into a Cypher query, MUST execute the query against the knowledge graph via `GraphStorePort.executeCypher()`, and MUST format the results as human-readable output (default: markdown). `--format json` MUST output raw JSON. `--verbose` MUST show the generated Cypher query alongside results. The NLQ engine MUST run locally in the SpecForge Server in all modes.

### Verification

- Translation test: ask "what requirements are untested?"; verify a Cypher query is generated and executed.
- Format test: use `--format json`; verify JSON output.
- Verbose test: use `--verbose`; verify the Cypher query is displayed.
- All modes test: verify `specforge ask` works in solo and SaaS modes.

---

## BEH-SF-115: Graph Analytical Queries — Impact, Coverage, Orphans, Gaps, Deps

The CLI provides dedicated commands for analytical graph queries: `specforge query impact <node-id>`, `specforge query coverage`, `specforge query orphans`, `specforge query gaps`, `specforge query deps <node-id>`, and ad-hoc Cypher via `specforge query cypher`.

### Contract

REQUIREMENT (BEH-SF-115): The CLI MUST provide the following query commands: `query impact <node-id>` (calls `GraphQueryPort.impactAnalysis()`), `query coverage` (calls `SpecCoveragePort.computeCoverage()`), `query orphans` (calls `GraphQueryPort.orphans()`), `query gaps` (calls `GraphQueryPort.traceabilityGaps()`), `query deps <node-id>` (calls `GraphQueryPort.dependencyChain()`), `query cypher "<cypher>"` (calls `GraphStorePort.executeCypher()`). All commands MUST support `--format json|markdown`.

### Verification

- Impact test: run `query impact <id>`; verify results include affected nodes with distances.
- Coverage test: run `query coverage`; verify a coverage report is output.
- Orphan test: run `query orphans`; verify orphan nodes are listed.
- Gaps test: run `query gaps`; verify traceability gaps are listed.
- Cypher test: run `query cypher "MATCH (n) RETURN count(n)"`; verify the result is returned.

---

## BEH-SF-116: Flow Run Management — List, Pause, Resume, Cancel, Show, Feedback, Intervention

The CLI provides commands to manage flow runs including lifecycle control and human intervention commands.

### Contract

REQUIREMENT (BEH-SF-116): The CLI MUST provide: `run list [--status <status>]` (lists flow runs filtered by status), `run pause <flow-run-id>` (pauses a running flow), `run resume <flow-run-id>` (resumes a paused flow), `run cancel <flow-run-id>` (cancels a flow), `run show <flow-run-id>` (shows flow run details including agent sessions, token usage, and phase progress). Human intervention commands: `specforge feedback <flow-run-id> "<message>"` (injects human feedback), `specforge converge <flow-run-id>` (force-converges current phase), `specforge iterate <flow-run-id>` (forces another iteration), `specforge approve <flow-run-id>` (approves an approval gate), `specforge reject <flow-run-id> --reason "<reason>"` (rejects with reason). Each command MUST call the corresponding port method.

### Verification

- List test: start a flow; run `run list`; verify the flow appears.
- Pause/Resume test: pause and resume a flow; verify state transitions.
- Cancel test: cancel a flow; verify it is cancelled.
- Feedback test: run `specforge feedback <id> "message"`; verify feedback appears on the ACP session.
- Intervention test: run `specforge converge <id>`; verify the phase force-converges.
- Approval test: run `specforge approve <id>`; verify the approval gate is cleared.

---

## BEH-SF-117: Context Composition Commands — Compose-Context by Role, Topic, Similarity

The CLI provides `specforge compose-context` for assembling context from prior session chunks using various composition strategies.

### Contract

REQUIREMENT (BEH-SF-117): `specforge compose-context` MUST support the following options: `--role <role>` (role-based composition), `--topic <keywords>` (topic-based), `--similar "<text>"` (vector similarity), `--flow-run <id>` (flow-based), `--chunks <id1,id2>` (curated). The command MUST output a context ID that can be used with `--compose-from` in subsequent flow runs. `--limit N` MUST control the maximum number of chunks.

### Verification

- Role test: compose by role; verify chunks from the specified role are selected.
- Topic test: compose by topic; verify chunks matching the keywords are selected.
- Similarity test: compose by similarity; verify semantically related chunks are selected.
- Output test: verify the command outputs a context ID.
- Compose-from test: use the output context ID with `specforge run --compose-from`; verify it works.

---

## BEH-SF-118: Import/Export Commands — `specforge import` and `specforge export`

The CLI provides `specforge import <format> <path>` for importing external specifications into the knowledge graph and `specforge export <format> <output-path>` for rendering graph data to files.

### Contract

REQUIREMENT (BEH-SF-118): `specforge import <format> <path>` MUST resolve the import adapter by format name and parse the specified source into graph nodes. Built-in formats: `markdown`, `openapi`. `--dry-run` MUST preview changes without writing. `--force` MUST bypass incremental detection. `specforge export <format> <output-path>` MUST resolve the export adapter and render graph data to files. Built-in formats: `markdown`, `adr`, `coverage-report`. `--spec <spec-id>` MUST filter export to a specific spec. Both commands MUST support `--format json` for structured output.

### Verification

- Markdown import test: run `specforge import markdown ./specs`; verify graph nodes are created.
- OpenAPI import test: run `specforge import openapi api.yaml`; verify endpoint requirements are created.
- Dry run test: run import with `--dry-run`; verify no graph writes occur.
- Export test: run `specforge export markdown ./output`; verify markdown files are generated.
- Format filter test: run export with `--spec <id>`; verify only the specified spec is exported.

---

## BEH-SF-119: CI Integration — GitHub Actions Workflow, Coverage Gates, Reactive Triggers

The CLI integrates with CI/CD pipelines via GitHub Actions workflows, coverage gate commands (`--min --fail-under`), and reactive flow triggers configured in `.specforge/triggers.json`.

### Contract

REQUIREMENT (BEH-SF-119): The CLI MUST support CI integration via: (a) `specforge run code-review --diff <sha> --batch --format github` for PR analysis, (b) `specforge query coverage --min <pct> --fail-under` for coverage gates (exit 0 if >= threshold, exit 1 otherwise), (c) `specforge drift-report --fail-on-drift` for drift checks, (d) `specforge trigger add <event> <flow>` for reactive triggers. Triggered flows MUST run in batch mode by default.

### Verification

- PR analysis test: run code review in batch mode; verify structured output suitable for GitHub.
- Coverage gate test: run with coverage below threshold; verify exit code 1.
- Drift test: edit a rendered file; run drift-report with `--fail-on-drift`; verify exit code indicates drift.
- Trigger test: register a trigger; simulate the event; verify the flow is triggered.

---

## Configuration Management

**BEH-SF-330:** `specforge config view` MUST display the current configuration in JSON format, with sensitive values (API keys, tokens) redacted.

**BEH-SF-331:** `specforge config set <key> <value>` MUST update `.specforge/config.json` with the specified key-value pair. Invalid keys MUST be rejected with a validation error.

**BEH-SF-332:** `specforge config reset` MUST restore `.specforge/config.json` to default values after confirmation.

## Plugin Management

**BEH-SF-333:** `specforge plugin list` MUST display all discovered plugins with their name, version, enabled status, and description.

**BEH-SF-334:** `specforge plugin enable <name>` / `specforge plugin disable <name>` MUST toggle plugin activation. `specforge plugin info <name>` MUST display the plugin's full manifest.

---

## BEH-SF-120: Headless Execution and Error Codes — CLI Works without Display, Consistent Exit Codes

All CLI commands work without a display server (headless) and use consistent exit codes across all commands.

### Contract

REQUIREMENT (BEH-SF-120): All CLI commands MUST work without a display server (no X11, Wayland, or macOS window server required). Claude Code subprocesses MUST be spawnable headlessly. Output MUST be available as structured JSON (`--format json`) or human-readable text (default). All deployment modes MUST be supported in headless environments. Exit codes: 0 = success, 1 = execution failure, 2 = warnings (max iterations exceeded, coverage below target), 3 = configuration error, 4 = validation error. All commands MUST use these exit codes consistently.

### Verification

- Headless test: run CLI commands in a CI environment without a display server; verify they complete successfully.
- JSON output test: run with `--format json`; verify valid JSON is output to stdout.
- All modes test: verify headless execution works in solo and SaaS modes.
- Exit code test: verify each exit code is produced under the documented conditions.
