# Claude Code — Headless Usage

**Source:** [Run Claude Code Programmatically](https://code.claude.com/docs/en/headless)
**Captured:** 2026-02-27

---

## Print Mode (`-p`)

The `-p` (print) flag runs Claude Code non-interactively. This is the primary integration surface for SpecForge.

```bash
claude -p "What does the auth module do?"
```

All CLI flags work with `-p`, including `--continue`, `--allowedTools`, `--output-format`.

---

## Output Formats

### Text (default)

Plain text output to stdout.

### JSON (`--output-format json`)

Structured JSON with result, session ID, and metadata:

```bash
claude -p "Summarize this project" --output-format json
```

The `result` field contains the text response. With `--json-schema`, the `structured_output` field contains schema-validated output.

### Stream JSON (`--output-format stream-json`)

Newline-delimited JSON for real-time streaming. Each line is an event object:

```bash
claude -p "Explain recursion" --output-format stream-json --verbose --include-partial-messages
```

Filter for specific events with jq:

```bash
claude -p "Write a poem" --output-format stream-json --verbose --include-partial-messages | \
  jq -rj 'select(.type == "stream_event" and .event.delta.type? == "text_delta") | .event.delta.text'
```

---

## Structured Output

Use `--json-schema` with `--output-format json` for validated structured output:

```bash
claude -p "Extract the main function names from auth.py" \
  --output-format json \
  --json-schema '{"type":"object","properties":{"functions":{"type":"array","items":{"type":"string"}}},"required":["functions"]}'
```

The response includes metadata with structured output in the `structured_output` field.

---

## Session Continuation

### Continue Most Recent

```bash
claude -p "Review this codebase for performance issues"
claude -p "Now focus on the database queries" --continue
claude -p "Generate a summary of all issues found" --continue
```

### Resume by Session ID

```bash
session_id=$(claude -p "Start a review" --output-format json | jq -r '.session_id')
claude -p "Continue that review" --resume "$session_id"
```

---

## Multi-Turn via Stdin Piping

Process piped content:

```bash
cat logs.txt | claude -p "Explain these errors"
```

---

## CI/CD Integration Patterns

### Auto-approve Tools

```bash
claude -p "Run the test suite and fix any failures" \
  --allowedTools "Bash,Read,Edit"
```

### Create a Commit

```bash
claude -p "Look at my staged changes and create an appropriate commit" \
  --allowedTools "Bash(git diff *),Bash(git log *),Bash(git status *),Bash(git commit *)"
```

### Code Review with Custom Prompt

```bash
gh pr diff "$1" | claude -p \
  --append-system-prompt "You are a security engineer. Review for vulnerabilities." \
  --output-format json
```

---

## SpecForge Integration

SpecForge uses print mode for all agent interactions:

1. **Spawn agent** → `claude -p --system-prompt <role> --allowedTools <tools> --model <model> --output-format stream-json --session-id <uuid>`
2. **Send task** → `claude -p --resume <sessionId> "task description" --output-format stream-json`
3. **Track tokens** → Parse stream-json events for usage metadata
4. **Enforce budget** → `--max-budget-usd` and `--max-turns`
5. **Dispose** → Terminate the subprocess
