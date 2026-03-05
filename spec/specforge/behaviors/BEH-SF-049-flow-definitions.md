---
id: BEH-SF-049
kind: behavior
title: Flow Definitions
status: active
id_range: 049--056
invariants: [INV-SF-9]
adrs: [ADR-007]
types: [flow, flow]
ports: [FlowEnginePort, OrchestratorPort]
---

# 07 — Flow Definitions

## BEH-SF-049: Spec Writing Flow — 5 Phases from Idea to Verified Implementation

The primary forward flow takes a project from idea to verified implementation through five phases. Discovery gathers requirements interactively. Spec Forge iterates through authoring, review, feedback synthesis, revision, and convergence checking. Task Master decomposes the approved spec into task groups. Dev Forge implements code with iterative convergence checking. Verification validates coverage across the final output.

### Contract

REQUIREMENT (BEH-SF-049): The `spec-writing` flow MUST define five phases in order:

1. **Discovery** — `discovery-agent` in conversational mode. The phase MUST NOT complete until the user approves the requirements brief.
2. **Spec Forge** — `spec-author` (author) then `reviewer` (review) then `feedback-synthesizer` (synthesize) then `spec-author` (revise) then convergence check. Convergence criteria: zero critical and major findings, coverage >= 80%. The loop repeats until converged or `maxIterations` is reached.
3. **Task Master** — `task-decomposer` decomposes the approved spec into task groups.
4. **Dev Forge** — `dev-agent` implements code, then convergence check. The loop repeats until all tests pass or `maxIterations` is reached.
5. **Verification** — `coverage-agent` validates requirement-to-implementation coverage.

### Verification

- Definition test: retrieve the `spec-writing` flow definition; verify all 5 phases with correct agent roles and stage ordering.
- Phase ordering test: execute the flow; verify phases run in the specified order.
- Convergence test: in Spec Forge, inject findings with zero critical/major and 80% coverage; verify convergence.
- Dev Forge loop test: inject failing tests; verify `dev-agent` re-enters the loop until convergence or max iterations.
- Verification test: verify the final phase invokes `coverage-agent` and produces a coverage report.

---

## BEH-SF-050: Reverse Engineering Flow — 3 Phases from Codebase to Specs

The reverse engineering flow extracts specs from existing code through three phases. Analysis performs a single `codebase-analyzer` session that covers topology discovery, file classification, semantic extraction, and dependency mapping in one pass. Spec Generation uses `spec-author` to produce spec documents from the analysis output. Validation uses `coverage-agent` and `reviewer` to verify the generated specs are complete and accurate.

### Contract

REQUIREMENT (BEH-SF-050): The `reverse` flow MUST define three phases in order:

1. **Analysis** — `codebase-analyzer` in a single automated session that performs topology discovery, file classification, semantic extraction, and dependency mapping. The agent MUST produce a consolidated codebase context document on the ACP session.
2. **Spec Generation** — `spec-author` generates spec documents from the analysis output. The agent MUST read the codebase context document and MUST produce reverse-engineered spec documents.
3. **Validation** — `coverage-agent` and `reviewer` run concurrently to validate the generated specs. The coverage agent checks requirement completeness; the reviewer checks architectural soundness. Both MUST produce findings on the ACP session.

Each phase MUST have a `maxIterations` of at least 3. The flow MUST persist the codebase context document as a `SpecFile` node (type: `codebase-context`) in the knowledge graph.

### Verification

- Definition test: retrieve the `reverse` flow definition; verify all 3 phases with correct agent roles.
- Analysis test: run against a sample codebase; verify the codebase-analyzer produces a consolidated context document covering topology, classification, extraction, and dependency mapping.
- Spec generation test: verify `spec-author` reads the context document and produces spec documents.
- Validation test: verify `coverage-agent` and `reviewer` run concurrently and produce findings.
- Graph persistence test: verify the codebase context document is persisted as a `SpecFile` node in the graph.

---

## BEH-SF-051: Code Review Flow — 3 Phases from Diff to Review Summary

The code review flow analyzes code changes against spec requirements through three phases. Discovery uses `codebase-analyzer` to gather change context from a diff. Review uses `reviewer` and `feedback-synthesizer` to perform iterative architectural and traceability review. Synthesis uses `feedback-synthesizer` to produce the final review summary.

### Contract

REQUIREMENT (BEH-SF-051): The `code-review` flow MUST define three phases:

1. **Discovery** — `codebase-analyzer` in automated mode, max 2 iterations. The agent MUST identify the change scope from the `--diff` parameter.
2. **Review** — `reviewer` and `feedback-synthesizer` iterative loop, max 3 iterations. The `reviewer` produces findings; the `feedback-synthesizer` aggregates and prioritizes them. The loop converges when no new critical or major findings are produced.
3. **Synthesis** — `feedback-synthesizer` in automated mode, max 1 iteration. Produces the final review summary document on the ACP session.

The flow MUST accept a `--diff` parameter specifying the git ref for review scope.

### Verification

- Definition test: verify the flow definition has 3 phases with the correct agent roles.
- Diff test: execute with a `--diff` parameter; verify the Discovery phase identifies the change scope.
- Review loop test: inject findings across iterations; verify the Review phase loops through reviewer and synthesizer stages.
- Synthesis test: verify a final review summary document is produced on the ACP session.

---

## BEH-SF-052: Risk Assessment Flow — 3 Phases from Scope to Risk Report

The risk assessment flow analyzes a spec or codebase for risks through three phases. Discovery uses `codebase-analyzer` to gather scope context. Analysis uses `reviewer` and `feedback-synthesizer` in an iterative loop to identify and categorize risks. Assessment uses `feedback-synthesizer` to produce the final risk report with severity matrix and mitigation suggestions.

### Contract

REQUIREMENT (BEH-SF-052): The `risk-assessment` flow MUST define three phases:

1. **Discovery** — `codebase-analyzer` in automated mode, max 2 iterations. The agent MUST identify the assessment boundary from the `--scope` parameter.
2. **Analysis** — `reviewer` and `feedback-synthesizer` iterative loop, max 3 iterations. The `reviewer` identifies risks; the `feedback-synthesizer` categorizes and prioritizes them.
3. **Assessment** — `feedback-synthesizer` in automated mode, max 1 iteration. MUST produce a risk report with severity matrix (critical/major/minor/observation counts), risk descriptions, and mitigation suggestions.

The flow MUST accept a `--scope` parameter defining the assessment boundary.

### Verification

- Definition test: verify the flow definition has 3 phases with correct agent roles.
- Scope test: execute with a `--scope` parameter; verify the Discovery phase identifies the assessment boundary.
- Analysis loop test: verify the Analysis phase loops through reviewer and synthesizer stages.
- Report test: verify the Assessment phase produces a risk report with severity matrix and mitigation suggestions on the ACP session.

---

## BEH-SF-053: Onboarding Flow — 3 Phases from Codebase to Onboarding Documentation

The onboarding flow generates onboarding documentation for a codebase through three phases. Analysis uses `codebase-analyzer` to perform topology, classification, extraction, and dependency mapping in a single session. Documentation uses `spec-author` and `reviewer` in an iterative author-review loop to produce onboarding-oriented documents. Validation uses `coverage-agent` to verify the documentation covers all major modules.

### Contract

REQUIREMENT (BEH-SF-053): The `onboarding` flow MUST define three phases:

1. **Analysis** — `codebase-analyzer` in automated mode. The agent MUST produce a consolidated codebase context document covering topology, classification, extraction, and dependency mapping.
2. **Documentation** — `spec-author` (authoring) and `reviewer` (reviewing) in an iterative loop, max 3 iterations. The `spec-author` writes onboarding documentation; the `reviewer` evaluates completeness and clarity; the loop repeats until converged. Documentation output MUST include a getting-started guide, architecture overview, and module walkthroughs.
3. **Validation** — `coverage-agent` verifies the documentation covers all identified modules and entry points.

### Verification

- Definition test: verify the flow definition has 3 phases with correct agent roles.
- Analysis test: verify `codebase-analyzer` produces a codebase context document.
- Documentation loop test: verify the Documentation phase loops through author-review stages.
- Output test: verify getting-started guide, architecture overview, and module walkthroughs are produced.
- Validation test: verify `coverage-agent` checks documentation coverage against identified modules.

---

## BEH-SF-054: Custom Flow Registration — Declarative Data Registered with Flow Engine

Custom flows are defined as `FlowDefinition` data structures and registered with the flow engine via `FlowEnginePort.registerFlow()`. Once registered, they are invocable by name via CLI or desktop app. Custom flows reference the 8 available agent roles: `discovery-agent`, `spec-author`, `reviewer`, `feedback-synthesizer`, `task-decomposer`, `dev-agent`, `coverage-agent`, `codebase-analyzer`.

### Contract

REQUIREMENT (BEH-SF-054): When `FlowEnginePort.registerFlow(definition)` is called with a valid `FlowDefinition`, the system MUST register the flow and MUST make it discoverable via `listFlows()` and invocable via `runFlow(name, input)`. The registration MUST validate the definition before accepting it (see BEH-SF-055). All `agentRoles` referenced in the definition MUST be one of the 8 registered roles.

### Verification

- Registration test: register a custom flow; verify it appears in `listFlows()`.
- Invocation test: register and run a custom flow; verify it executes with the defined phases and agents.
- Duplicate test: attempt to register two flows with the same name; verify the behavior is well-defined (error or overwrite).
- Role constraint test: attempt to register a flow referencing a non-existent role; verify validation rejects it.

---

## BEH-SF-055: Flow Validation — Engine Validates Definitions at Registration

> **Invariant:** [INV-SF-9](../invariants/INV-SF-9-flow-determinism.md) — Flow Determinism

The flow engine validates flow definitions at registration time. All referenced agent roles must exist in the set of 8 registered roles, convergence criteria must be provided for each phase, `maxIterations` must be >= 1, and phase names must be unique within a flow.

### Contract

REQUIREMENT (BEH-SF-055): When `registerFlow()` is called, the system MUST validate: (a) all `agentRoles` reference one of the 8 registered agent roles, (b) every phase has a `convergence` criteria, (c) `maxIterations >= 1` for every phase, (d) phase names are unique within the flow. If validation fails, the system MUST return a `FlowValidationError` with `violations` describing each issue. The flow MUST NOT be registered.

### Verification

- Valid flow test: register a well-formed flow; verify it succeeds.
- Invalid role test: reference a non-existent agent role; verify `FlowValidationError` with the invalid role name.
- Missing convergence test: omit convergence from a phase; verify validation failure.
- Zero iterations test: set `maxIterations: 0`; verify validation failure.
- Duplicate phase name test: use the same phase name twice; verify validation failure.

---

## BEH-SF-056: Flow Presets — Quick, Standard, and Thorough Configurations

Each predefined flow (`spec-writing`, `reverse`, `code-review`, `risk-assessment`, `onboarding`) supports three presets that configure iteration limits, model selection, and convergence strictness. Presets provide a one-knob control for trading off speed versus thoroughness.

| Preset     | Max Iterations | Models                   | Convergence                                           |
| ---------- | -------------- | ------------------------ | ----------------------------------------------------- |
| `quick`    | 1-2 per phase  | sonnet everywhere        | Relaxed: zero critical findings only                  |
| `standard` | 3 per phase    | Mixed (per role default) | Default: zero critical + major findings, 80% coverage |
| `thorough` | 5 per phase    | opus everywhere          | Strict: zero findings of any severity, 95% coverage   |

CLI usage: `specforge run spec-writing --preset quick`

When a preset is selected, its `maxIterations`, `modelOverride`, and `convergence` values override the flow definition defaults for all phases. Per-phase overrides in the `FlowDefinition.presets` map take precedence over the flow-level defaults but are themselves overridden by explicit CLI flags (`--max-iterations`, `--model`).

### Contract

REQUIREMENT (BEH-SF-056): Each predefined flow MUST define three presets (`quick`, `standard`, `thorough`) in its `FlowDefinition.presets` map. When `specforge run <flow> --preset <name>` is invoked, the flow engine MUST apply the preset's `maxIterations`, `modelOverride` (if present), and `convergence` criteria to all phases before execution. The `quick` preset MUST use max 1-2 iterations per phase, sonnet for all agents, and relaxed convergence (zero critical findings only). The `standard` preset MUST use max 3 iterations per phase, mixed models per role default, and default convergence (zero critical + major, 80% coverage). The `thorough` preset MUST use max 5 iterations per phase, opus for all agents, and strict convergence (zero findings of any severity, 95% coverage). Explicit CLI flags (`--max-iterations`, `--model`) MUST override preset values.

### Verification

- Preset application test: run `spec-writing` with `--preset quick`; verify all phases use max 1-2 iterations and sonnet model.
- Standard preset test: run with `--preset standard`; verify 3 iterations per phase and mixed models.
- Thorough preset test: run with `--preset thorough`; verify 5 iterations per phase, opus model, and strict convergence.
- CLI override test: run with `--preset quick --model opus`; verify the CLI flag overrides the preset's model selection.
- Convergence quick test: inject a major finding but no critical findings; verify the quick preset converges (relaxed criteria).
- Convergence thorough test: inject a minor finding; verify the thorough preset does NOT converge (strict criteria).
- All flows test: verify all 5 predefined flows have the 3 presets defined in their `FlowDefinition.presets` map.
