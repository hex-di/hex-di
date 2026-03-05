# Claude Code — Model Configuration

**Source:** [Model Configuration](https://code.claude.com/docs/en/model-config)
**Captured:** 2026-02-27

---

## Model Aliases

| Alias        | Current Model                  | Description                                     |
| ------------ | ------------------------------ | ----------------------------------------------- |
| `default`    | Depends on account type        | Recommended model setting                       |
| `sonnet`     | Sonnet 4.6                     | Daily coding tasks                              |
| `opus`       | Opus 4.6                       | Complex reasoning tasks                         |
| `haiku`      | Haiku 4.5                      | Fast, simple tasks                              |
| `sonnet[1m]` | Sonnet with 1M context         | Long sessions with large codebases              |
| `opusplan`   | Opus (plan) + Sonnet (execute) | Hybrid: Opus for planning, Sonnet for execution |

Aliases always point to the latest version. Pin with full model names (e.g., `claude-opus-4-6`).

---

## Setting the Model

Priority order:

1. During session: `/model <alias|name>`
2. At startup: `claude --model <alias|name>`
3. Environment variable: `ANTHROPIC_MODEL=<alias|name>`
4. Settings file: `model` field

---

## Default Model Behavior

| Account Type          | Default                            |
| --------------------- | ---------------------------------- |
| Max and Team Premium  | Opus 4.6                           |
| Pro and Team Standard | Sonnet 4.6                         |
| Enterprise            | Opus 4.6 available but not default |

Claude Code may automatically fall back to Sonnet if Opus usage threshold is hit.

---

## Effort Levels

Controls Opus 4.6's adaptive reasoning — dynamically allocates thinking based on task complexity.

| Level            | Behavior                                |
| ---------------- | --------------------------------------- |
| `low`            | Faster, cheaper — straightforward tasks |
| `medium`         | Balanced                                |
| `high` (default) | Deeper reasoning — complex problems     |

Set via:

- `/model` slider in session
- `CLAUDE_CODE_EFFORT_LEVEL=low|medium|high`
- `effortLevel` in settings file

Currently supported on Opus 4.6 only.

---

## Extended Thinking

Adaptive by default — Claude dynamically allocates thinking budget based on complexity.

| Variable                                | Purpose                                                          |
| --------------------------------------- | ---------------------------------------------------------------- |
| `MAX_THINKING_TOKENS`                   | Override thinking budget (default: 31999, max: depends on model) |
| `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` | Revert to fixed thinking budget                                  |

---

## 1M Context Window

Opus 4.6 and Sonnet 4.6 support 1 million token context windows (beta).

- Standard rates up to 200K tokens
- Long-context pricing beyond 200K
- Disable with `CLAUDE_CODE_DISABLE_1M_CONTEXT=1`
- Use `sonnet[1m]` alias or append `[1m]` to model names

---

## Environment Variable Overrides

| Variable                         | Description                  |
| -------------------------------- | ---------------------------- |
| `ANTHROPIC_MODEL`                | Model to use                 |
| `ANTHROPIC_DEFAULT_OPUS_MODEL`   | Override Opus alias target   |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Override Sonnet alias target |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL`  | Override Haiku alias target  |
| `CLAUDE_CODE_SUBAGENT_MODEL`     | Model for subagents          |

---

## SpecForge Model Mapping

| SpecForge `ModelSelection` | Claude Code Mapping                   |
| -------------------------- | ------------------------------------- |
| `"opus"`                   | `opus` alias (currently Opus 4.6)     |
| `"sonnet"`                 | `sonnet` alias (currently Sonnet 4.6) |
| `"haiku"`                  | `haiku` alias (currently Haiku 4.5)   |

Model escalation (BEH-SF-080) uses `--model` override per `sendTask()` call.

See [BEH-SF-156](../../behaviors/BEH-SF-151-claude-code-adapter.md).
