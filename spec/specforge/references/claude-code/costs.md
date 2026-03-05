# Claude Code — Costs

**Source:** [Manage Costs Effectively](https://code.claude.com/docs/en/costs)
**Captured:** 2026-02-27

---

## Average Costs

| Metric                          | Value               |
| ------------------------------- | ------------------- |
| Average per developer per day   | ~$6                 |
| 90th percentile daily           | < $12               |
| Monthly average with Sonnet 4.6 | ~$100–200/developer |

Costs vary based on codebase size, query complexity, and conversation length.

---

## Token Tracking

### `/cost` Command

Shows API token usage for current session (relevant for API users, not subscribers):

```
Total cost:            $0.55
Total duration (API):  6m 19.7s
Total duration (wall): 6h 33m 10.2s
Total code changes:    0 lines added, 0 lines removed
```

### Budget Cap

```bash
claude -p --max-budget-usd 5.00 "query"
```

Stops API calls when budget is reached (print mode only).

---

## Token Optimization

### Prompt Caching (Automatic)

Claude Code automatically uses prompt caching to reduce costs for repeated content (system prompts, CLAUDE.md). Disable per-model:

| Variable                        | Purpose             |
| ------------------------------- | ------------------- |
| `DISABLE_PROMPT_CACHING`        | Disable all caching |
| `DISABLE_PROMPT_CACHING_HAIKU`  | Haiku only          |
| `DISABLE_PROMPT_CACHING_SONNET` | Sonnet only         |
| `DISABLE_PROMPT_CACHING_OPUS`   | Opus only           |

### Auto-Compaction

When approaching context limits, Claude Code automatically summarizes conversation history. Customize:

- `/compact [focus]` — manual compaction with focus directive
- "Compact Instructions" section in CLAUDE.md — control what is preserved
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` — trigger earlier (default: ~95%)

---

## Cost Reduction Strategies

| Strategy                                 | Impact                                       |
| ---------------------------------------- | -------------------------------------------- |
| Clear between tasks (`/clear`)           | Prevents stale context waste                 |
| Use Sonnet for most tasks                | Reserve Opus for complex reasoning           |
| Reduce MCP server count                  | Each server adds tool definitions to context |
| Specific prompts                         | Avoid broad scanning from vague requests     |
| Plan mode for complex tasks              | Prevent expensive re-work                    |
| Delegate verbose operations to subagents | Keep main context clean                      |
| Use Haiku for subagents                  | `model: haiku` in subagent config            |
| Move specialized instructions to skills  | Load on-demand, not at startup               |
| Install code intelligence plugins        | Precise navigation vs. text search           |

---

## Agent Team Costs

- ~7x more tokens than standard sessions (plan mode)
- Each teammate maintains its own context window
- Token usage proportional to team size
- Recommendations: use Sonnet for teammates, keep teams small, clean up when done

---

## Rate Limit Recommendations

| Team Size | TPM per User | RPM per User |
| --------- | ------------ | ------------ |
| 1–5       | 200k–300k    | 5–7          |
| 5–20      | 100k–150k    | 2.5–3.5      |
| 20–50     | 50k–75k      | 1.25–1.75    |
| 50–100    | 25k–35k      | 0.62–0.87    |
| 100–500   | 15k–20k      | 0.37–0.47    |
| 500+      | 10k–15k      | 0.25–0.35    |

TPM per user decreases as team size grows due to lower concurrent usage.

---

## Background Token Usage

Small amount (~$0.04 per session) for:

- Conversation summarization (for `--resume`)
- Command processing (`/cost`, etc.)

---

## SpecForge Relevance

SpecForge tracks costs via:

- **Stream-json events** — extract `inputTokens` and `outputTokens` per message
- **Per-session aggregation** — `TokenUsage` type tracks cumulative usage
- **Budget enforcement** — `--max-budget-usd` per agent, flow-level budget via orchestrator
- **Model selection** — route simple tasks to Sonnet/Haiku, complex to Opus

See [BEH-SF-155](../../behaviors/BEH-SF-151-claude-code-adapter.md) (token tracking) and [BEH-SF-156](../../behaviors/BEH-SF-151-claude-code-adapter.md) (model selection).
