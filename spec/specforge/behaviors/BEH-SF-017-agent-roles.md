---
id: BEH-SF-017
kind: behavior
title: Agent Roles
status: active
id_range: 017--024
invariants: [INV-SF-2, INV-SF-5]
adrs: [ADR-018]
types: [agent, agent, acp, acp]
ports: [AgentRegistryPort, ToolRegistryPort]
---

# 03 — Agent Roles

**ADR:** [ADR-018](../decisions/ADR-018-acp-agent-protocol.md)

## BEH-SF-017: Discovery Agent — Interactive Conversation to Gather Requirements, Produces Brief

The `discovery-agent` role conducts interactive requirements gathering through conversation with the user. It uses web search, file access, and code search tools to research the problem domain. Its output is a requirements brief document, research notes, and web source references. Uses the `opus` model for complex reasoning. This role is used in the Discovery phase of the `spec-writing` flow.

### Contract

REQUIREMENT (BEH-SF-017): When the `discovery-agent` is invoked in a conversational phase, the system MUST create an ACP run with the discovery system prompt, web search + file access + code search tools, and the `opus` model. The agent MUST produce a requirements brief document yielded as an ACP message artifact. The phase MUST NOT complete until the user explicitly approves the brief.

### Verification

- Tool set test: verify `ToolRegistryPort.getToolsForRole('discovery-agent')` returns web search, file access, code search, ACP message read/write.
- Output test: run a discovery phase and verify a requirements brief document exists as an ACP message artifact.
- Approval test: verify the phase does not advance until `ConversationLayerPort.approveBrief()` is called.

---

## BEH-SF-018: Spec Author — Scaffolds, Authors, Revises, Finalizes, and Reverse-Generates Specs

The `spec-author` role is the consolidated authoring agent that handles the full spec document lifecycle. It absorbs the former `spec-scaffolder` (initial skeleton creation), `spec-author` (detailed content writing), and `reverse-spec-author` (spec generation from extracted codebase data) responsibilities. In the forward `spec-writing` flow it creates the initial spec skeleton from the requirements brief, writes detailed spec content (behaviors, constraints, port definitions, error types), revises specs based on synthesized reviewer feedback, and finalizes the spec for handoff. In the `reverse` and `onboarding` flows it generates spec documents from codebase analysis data produced by the `codebase-analyzer`. Uses the `opus` model. It has access to file access, code search, and ACP message read/write tools. Its persistent session retains context across the Scaffold, Author, Revise, and Finalize stages within a single flow run.

### Contract

REQUIREMENT (BEH-SF-018): When the `spec-author` is invoked in a scaffolding stage, it MUST read the requirements brief from the ACP session history and MUST produce spec skeleton documents with section headers and requirement ID placeholders covering all requirements in the brief. When invoked in an authoring stage, it MUST read the current spec state and MUST produce detailed spec content. When invoked in a revision stage (after review), it MUST read synthesized feedback and revise the spec to address all critical and major findings. When invoked in a finalization stage, it MUST produce the final spec documents. When invoked in a reverse engineering or onboarding context, it MUST read codebase analysis data from the ACP session history (topology, classification, semantic, and dependency outputs) and MUST produce spec documents or onboarding documentation from that data. The agent's persistent session MUST retain context across all stages within a flow run.

### Verification

- Scaffolding test: invoke in a scaffolding stage with a requirements brief; verify skeleton documents are produced with section headers and requirement ID placeholders.
- Coverage test: verify every requirement in the brief has a corresponding placeholder in the skeleton.
- Authoring test: invoke in an authoring stage with skeleton; verify detailed content is written.
- Revision test: invoke in a revision stage with feedback; verify content is updated to address all critical and major findings.
- Finalization test: invoke in a finalization stage; verify final spec documents are produced.
- Reverse spec test: invoke with codebase analysis data; verify spec documents are generated from the extracted data.
- Persistence test: verify the agent's second invocation demonstrates awareness of its prior output from earlier stages.

---

## BEH-SF-019: Reviewer — Reviews Specs for Architecture, Traceability, and Quality

The `reviewer` role is the consolidated review agent that handles both architectural review and traceability checking. It absorbs the former `arch-reviewer` (architectural soundness, coupling, API design) and `traceability-checker` (requirement-to-implementation traceability validation) responsibilities. It reads spec documents, the existing codebase, and queries the knowledge graph for traceability gaps. Its output is findings with severity ratings covering both architectural concerns and traceability gaps. Uses the `opus` model. It has access to file access, code search, graph query, and ACP message read/write tools. This role is used in the Review stage of the `spec-writing` flow's Spec Forge phase, in the `code-review` flow, in the `risk-assessment` flow, in the Validation phase of the `reverse` flow, and in the Documentation phase of the `onboarding` flow.

### Contract

REQUIREMENT (BEH-SF-019): When the `reviewer` is invoked in a review stage, it MUST read the current spec documents from the ACP session history, MUST evaluate them for architectural soundness (coupling, cohesion, API design quality), and MUST query the knowledge graph for traceability gaps (requirements without tasks, tasks without code, code without tests). It MUST produce findings categorized by severity (`critical`, `major`, `minor`, `observation`). Each finding MUST reference the relevant requirement IDs and spec sections. Each traceability gap finding MUST identify the specific node and the missing link type.

### Verification

- Architecture finding test: provide a spec with known architectural issues; verify findings are produced with appropriate severities.
- Traceability gap test: create a graph with known traceability gaps; verify findings identify each gap with the specific node and missing link type.
- Complete chain test: create a fully traced requirement; verify no traceability finding is produced for it.
- Reference test: verify each finding contains `requirementIds` and `specFile` references.
- Tool access test: verify the reviewer has access to code search and graph query tools.

---

## BEH-SF-020: Feedback Synthesizer — Aggregates Findings into Prioritized Action Items

The `feedback-synthesizer` role aggregates all reviewer findings into a single prioritized action list. It reads findings from the `reviewer` agent in the ACP session and produces a synthesized feedback document. Uses the `sonnet` model. It has access to ACP message read/write tools. This role is used in the Synthesize stage of the `spec-writing` flow's Spec Forge phase, in the Synthesis phase of the `code-review` flow, and in the Assessment phase of the `risk-assessment` flow.

### Contract

REQUIREMENT (BEH-SF-020): When the `feedback-synthesizer` is invoked, it MUST read all findings from the ACP session history (from the `reviewer` agent), MUST deduplicate overlapping findings, and MUST produce a synthesized feedback document with prioritized action items ordered by severity. The synthesized document MUST be written as ACP message artifacts.

### Verification

- Aggregation test: produce findings from the reviewer; verify the synthesizer reads and consolidates all of them.
- Priority test: verify the output document lists critical findings before major, major before minor.
- Deduplication test: produce overlapping findings across iterations; verify they are merged in the synthesis.

---

## BEH-SF-021: Task Decomposer — Breaks Spec into Ordered, Dependency-Aware Task Groups

The `task-decomposer` role breaks a finalized spec into ordered, dependency-aware task groups suitable for implementation by the `dev-agent`. It reads the finalized spec documents and produces task groups with dependency ordering, estimated complexity, and assigned file scopes. Uses the `sonnet` model. It has access to file access, code search, and ACP message read/write tools. This role is used in the Task Master phase of the `spec-writing` flow.

### Contract

REQUIREMENT (BEH-SF-021): When the `task-decomposer` is invoked, it MUST read the finalized spec documents from the ACP session history and MUST produce `TaskGroup` entries with dependency ordering, estimated complexity, and file scopes. Task groups MUST be ordered such that no group depends on a group that comes after it. Each task MUST trace back to at least one requirement ID from the spec.

### Verification

- Decomposition test: provide a finalized spec; verify task groups are produced with dependencies, complexity estimates, and file scopes.
- Ordering test: verify no task group depends on a later task group in the ordering.
- Traceability test: verify every task references at least one requirement ID.
- Completeness test: verify every requirement in the spec is covered by at least one task.

---

## BEH-SF-022: Dev Agent — Implements Code, Runs Tests, and Verifies in One Session

The `dev-agent` role is the consolidated implementation agent that handles code implementation, test execution, and implementation verification in a single persistent session. It absorbs the former `dev-agent` (code implementation and test running) and `impl-verifier` (implementation correctness verification) responsibilities. It has access to file access, code search, test runner, and scoped bash tools. It reads task groups, spec documents, and existing codebase. Its persistent session enables iterative repair cycles: it reads test failure findings from the ACP session history on subsequent iterations, fixes them, and verifies the fixes. Uses the `opus` model. This role is used in the Dev Forge phase of the `spec-writing` flow.

### Contract

REQUIREMENT (BEH-SF-022): When the `dev-agent` is invoked, it MUST implement code for the assigned task group, run tests via `TestRunnerPort`, verify the implementation against the spec requirements, and write implementation results as ACP message artifacts. On subsequent iterations, it MUST read test failure findings (including exact assertion messages and stack traces) from the ACP session history delta and MUST focus repairs on failing tests. After repairs, it MUST re-verify the implementation. Partial success (N/M tests pass) MUST be tracked. The agent MUST produce a verification report indicating which requirements are satisfied and which have gaps.

### Verification

- Implementation test: provide a task group; verify source files and test files are created.
- Repair cycle test: inject test failure findings; verify the agent's next iteration addresses the failures.
- Partial success test: verify the agent focuses on failing tests when some tests already pass.
- Verification test: verify the agent produces a verification report mapping requirements to implementation status.
- Tool access test: verify the agent has file write, code search, test runner, and scoped bash access.

---

## BEH-SF-023: Codebase Analyzer — Performs All Reverse Engineering Analysis in One Session

The `codebase-analyzer` role is the consolidated reverse engineering analysis agent that performs all codebase analysis in a single persistent session. It absorbs the former `topology-analyzer` (codebase structure analysis), `file-classifier` (file categorization by role), `semantic-extractor` (type signatures and domain concepts), and `dependency-mapper` (dependency relationships and cycles) responsibilities. It reads the target codebase and produces a consolidated codebase context document covering topology, file classification, semantic extraction, and dependency mapping. Uses the `sonnet` model. It has access to file access, code search, and ACP message read/write tools. This role is used in the analysis phases of the `reverse` flow, the `code-review` flow, the `risk-assessment` flow, and the `onboarding` flow.

### Contract

REQUIREMENT (BEH-SF-023): When the `codebase-analyzer` is invoked, it MUST analyze the target codebase and produce a consolidated codebase context document that includes: (a) topology data (directory structure, module boundaries, entry points), (b) file classification (categorization by role: port, adapter, service, test, config, etc.), (c) semantic extraction (type signatures, domain concepts, public API surfaces), and (d) dependency mapping (import relationships, dependency cycles, coupling metrics). The context document MUST be written as ACP message artifacts and MUST be persisted as a `SpecFile` node (type: `codebase-context`) in the knowledge graph. On subsequent runs, the agent MUST incrementally update the context document, re-analyzing only changed files.

### Verification

- Topology test: run against a sample codebase; verify the context document includes directory structure, module boundaries, and entry points.
- Classification test: verify files are categorized by role (port, adapter, service, test, config).
- Semantic test: verify type signatures and domain concepts are extracted.
- Dependency test: verify import relationships and dependency cycles are identified.
- Consolidation test: verify all four analysis aspects are present in a single codebase context document.
- Incremental test: run analysis twice; verify only changed files are re-analyzed on the second run.
- Graph test: verify the codebase context is persisted as a `SpecFile` node with type `codebase-context`.

---

## BEH-SF-024: Coverage Agent — Tracks and Validates Spec-to-Implementation Coverage

The `coverage-agent` role is the consolidated coverage agent that handles both coverage tracking and coverage validation in a single session. It absorbs the former `coverage-tracker` (tracking spec-to-implementation coverage metrics) and `coverage-validator` (validating that coverage meets thresholds) responsibilities. It reads spec documents, implementation results, test results, and the knowledge graph to compute and validate coverage. Uses the `sonnet` model. It has access to file access, code search, graph query, and ACP message read/write tools. This role is used in the Verification phase of the `spec-writing` flow and the Validation phase of the `reverse` flow.

### Contract

REQUIREMENT (BEH-SF-024): When the `coverage-agent` is invoked, it MUST compute spec-to-implementation coverage by querying the knowledge graph for requirement-to-task, task-to-code, and code-to-test traceability chains. It MUST produce a coverage report with per-requirement coverage status and an overall coverage percentage. It MUST then validate the coverage against the configured threshold (default 80%). If coverage is below the threshold, the agent MUST produce findings identifying the specific gaps (uncovered requirements, untested code paths). The coverage report and any gap findings MUST be written as ACP message artifacts.

### Verification

- Tracking test: provide a partially implemented spec; verify the coverage report shows per-requirement coverage status and overall percentage.
- Threshold pass test: provide a fully implemented spec meeting 80% coverage; verify validation passes with no gap findings.
- Threshold fail test: provide a spec below coverage threshold; verify gap findings are produced identifying uncovered requirements.
- Graph query test: verify the agent queries the knowledge graph for traceability chains.
- Combined test: verify both tracking and validation happen in a single agent session without requiring separate invocations.
