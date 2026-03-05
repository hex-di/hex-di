# ACP — Agent Composition Patterns

**Source:** [Compose Agents](https://agentcommunicationprotocol.dev/how-to/compose-agents)
**Captured:** 2026-02-28

---

## Philosophy

ACP emphasizes **patterns over frameworks**. Composition is achieved through standardized messaging and remote execution via `run_agent()`, not through proprietary orchestration abstractions.

---

## Four Composition Patterns

### 1. Prompt Chaining

Sequential processing where one agent's output feeds into the next:

```
Input ──► Agent A ──► Agent B ──► Output
```

```python
@server.agent()
async def chained_workflow(input: list[Message], context: Context):
    # Step 1: Generate marketing copy
    copy_result = await run_agent("copywriter", input)

    # Step 2: Translate the copy to Spanish
    translated = await run_agent("translator", copy_result)

    yield translated
```

**Use case:** Multi-step pipelines where each stage refines or transforms the previous output (e.g., generate → translate, analyze → summarize).

### 2. Routing

Dynamic agent selection based on request analysis:

```
              ┌──► Agent A (Spanish)
Input ──► Router ──┤
              └──► Agent B (French)
```

```python
@server.agent()
async def translation_router(input: list[Message], context: Context):
    # Analyze input to determine target language
    language = detect_target_language(input)

    if language == "spanish":
        result = await run_agent("spanish_translator", input)
    elif language == "french":
        result = await run_agent("french_translator", input)

    yield result
```

**Use case:** Intelligent dispatching where request characteristics determine which specialist handles the work (e.g., language detection, complexity routing, domain classification).

### 3. Parallelization

Concurrent execution of independent tasks:

```
         ┌──► Agent A ──┐
Input ──►├──► Agent B ──├──► Aggregator ──► Output
         └──► Agent C ──┘
```

```python
@server.agent()
async def parallel_analysis(input: list[Message], context: Context):
    # Run multiple analyses concurrently
    results = await asyncio.gather(
        run_agent("sentiment_analyzer", input),
        run_agent("topic_classifier", input),
        run_agent("entity_extractor", input),
    )

    # Aggregate results
    combined = aggregate(results)
    yield combined
```

**Use case:** Reducing total processing time when multiple independent analyses are needed (e.g., multi-perspective review, parallel translations, concurrent data enrichment).

### 4. Hierarchical

High-level planning agents coordinate specialized execution agents:

```
                  ┌──► Specialist A
Planner Agent ────┤──► Specialist B
                  └──► Specialist C
```

The planner decomposes complex tasks into subtasks, delegates to specialists, and synthesizes results. This pattern combines routing and chaining — the planner decides both **which** agents to invoke and **in what order**.

**Use case:** Complex workflows requiring strategic decomposition (e.g., research orchestration, multi-step code generation, document production pipelines).

---

## Pattern Comparison

| Pattern             | Execution   | Complexity | Best For                      |
| ------------------- | ----------- | ---------- | ----------------------------- |
| **Prompt Chaining** | Sequential  | Low        | Linear pipelines              |
| **Routing**         | Conditional | Low        | Classification-based dispatch |
| **Parallelization** | Concurrent  | Medium     | Independent parallel tasks    |
| **Hierarchical**    | Mixed       | High       | Complex multi-step workflows  |

---

## `run_agent()` — The Core Primitive

All composition patterns build on `run_agent()`, the standard mechanism for one agent to invoke another:

```python
result = await run_agent(agent_name: str, input: list[Message]) -> list[Message]
```

This function:

- Sends messages to the named agent via ACP protocol
- Handles sync/async execution transparently
- Works across local and remote servers
- Returns structured messages (not raw text)

---

## SpecForge Relevance

ACP's composition patterns map directly to SpecForge's multi-agent orchestration:

- **Dynamic Agents** (`behaviors/BEH-SF-185-dynamic-agents.md`): ACP's hierarchical pattern (planner → specialists) mirrors SpecForge's flow orchestration where a coordinator agent delegates to spec-writer, reviewer, and implementer agents.
- **Agent System** (`c3-agent-system.md`): ACP's `run_agent()` primitive provides a concrete protocol for SpecForge's inter-agent invocation. The pattern-based approach (chaining, routing, parallelization) gives SpecForge well-defined composition strategies.
- **Prompt Chaining**: Maps to SpecForge's sequential flow steps — spec → review → implementation where each step's output feeds the next.
- **Parallelization**: Enables SpecForge's parallel review pattern — multiple reviewers analyzing the same spec concurrently, with results aggregated by the orchestrator.
