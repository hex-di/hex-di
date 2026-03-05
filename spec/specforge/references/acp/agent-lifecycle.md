# ACP — Agent Run Lifecycle

**Source:** [Agent Run Lifecycle](https://agentcommunicationprotocol.dev/core-concepts/agent-run-lifecycle), [Await External Response](https://agentcommunicationprotocol.dev/how-to/await-external-response)
**Captured:** 2026-02-28

---

## Run States

ACP manages individual agent executions through a structured state machine with seven states:

| State         | Description                                              |
| ------------- | -------------------------------------------------------- |
| `created`     | Run initiated but not yet started processing             |
| `in-progress` | Agent actively processing the request                    |
| `awaiting`    | Agent paused, waiting for client-supplied information    |
| `completed`   | Successful task completion (terminal)                    |
| `cancelling`  | Cancellation request received, being processed           |
| `cancelled`   | Run successfully terminated (terminal)                   |
| `failed`      | Error encountered, processing cannot continue (terminal) |

---

## State Transitions

```
created ──► in-progress ──┬──► completed
                          ├──► failed
                          ├──► awaiting ──┬──► in-progress (resumed)
                          │               ├──► failed (timeout)
                          │               └──► cancelling
                          └──► cancelling ──► cancelled
```

Key transition rules:

- Normal completion flows `in-progress → completed`
- Errors transition `in-progress → failed`
- Agents can pause in `awaiting` for external input
- Cancellation requires two-step confirmation (`cancelling → cancelled`)
- Timeouts in `awaiting` state result in `failed`

---

## API Endpoints

| Method | Endpoint                | Purpose                                 |
| ------ | ----------------------- | --------------------------------------- |
| `POST` | `/runs`                 | Create a new agent run                  |
| `GET`  | `/runs/{run_id}`        | Retrieve current run state and results  |
| `POST` | `/runs/{run_id}`        | Resume an awaiting run with new input   |
| `POST` | `/runs/{run_id}/cancel` | Request cancellation of a running agent |

---

## Execution Patterns

### Synchronous

Client executes an agent and waits for the complete response:

```python
async with Client(base_url="http://localhost:8000") as client:
    run = await client.run_sync(
        agent="echo",
        input=[Message(parts=[MessagePart(content="Hello", content_type="text/plain")])]
    )
```

### Asynchronous

Client receives a `run_id` immediately, then polls for terminal state:

```python
async with Client(base_url="http://localhost:8000") as client:
    run = await client.run_async(agent="analyzer", input=[...])
    # Poll for completion
    while run.status not in ("completed", "failed", "cancelled"):
        run = await client.get_run(run.id)
```

### Streaming

Real-time incremental updates delivered as processing occurs:

```python
async with Client(base_url="http://localhost:8000") as client:
    async for event in client.run_stream(agent="writer", input=[...]):
        # Process incremental updates
        pass
```

---

## Await Mechanism (Human-in-the-Loop)

The Await mechanism enables agents to pause execution and request external input from humans, other agents, or external systems.

### Use Cases

| Category                  | Description                                                         |
| ------------------------- | ------------------------------------------------------------------- |
| **Approval & Feedback**   | Request explicit approval, qualitative feedback, or present options |
| **Data Collection**       | Request supplemental information when initial input is insufficient |
| **Frontend Interactions** | Engage with environments requiring user-level capabilities          |

### Flow

1. Agent sends a `MessageAwaitRequest` containing a prompt
2. Agent yields control and enters `awaiting` state
3. Client detects `run.awaiting` event
4. Client responds with `MessageAwaitResume` containing external input
5. Agent resumes processing with the new input

```python
@server.agent()
async def approval_agent(input: list[Message], context: Context):
    # Generate a proposal
    proposal = generate_proposal(input)

    # Pause and ask for approval
    response = yield MessageAwaitRequest(
        message="Do you approve this proposal? (yes/no)"
    )

    if "yes" in response.lower():
        yield Message(parts=[MessagePart(content=proposal, content_type="text/plain")])
    else:
        yield Message(parts=[MessagePart(content="Proposal declined.", content_type="text/plain")])
```

---

## SpecForge Relevance

ACP's lifecycle model maps closely to SpecForge's flow execution:

- **Flow Execution** (`behaviors/BEH-SF-057-flow-execution.md`): ACP's 7 run states map to SpecForge's flow step states. The `created → in-progress → completed/failed` progression mirrors a flow step's lifecycle.
- **Flow Lifecycle** (`behaviors/BEH-SF-065-flow-lifecycle.md`): ACP's await mechanism (pause for human input, then resume) directly corresponds to SpecForge's human-in-the-loop review gates — agents pause for user approval before proceeding.
- **Dynamic Flow Execution** (`dynamic-flow-execution.md`): ACP's async execution pattern (submit, poll, resume) enables non-blocking flow orchestration where multiple agent runs execute concurrently across distributed servers.
- **Cancellation**: ACP's two-step cancellation (`cancelling → cancelled`) provides a graceful shutdown pattern applicable to SpecForge's flow interruption requirements.
