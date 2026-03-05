# ACP — Sessions & Stateful Agents

**Source:** [Stateful Agents](https://agentcommunicationprotocol.dev/core-concepts/stateful-agents), [Distributed Sessions](https://agentcommunicationprotocol.dev/core-concepts/distributed-sessions)
**Captured:** 2026-02-28

---

## Stateful Agents

Stateful agents maintain conversational context and data across multiple interactions using sessions. The ACP SDK implements this through session descriptors stored at resource servers.

---

## Client-Side Session Management

The SDK provides a `session()` context manager that automatically handles session ID management:

```python
async with Client(base_url="http://localhost:8000") as client, client.session() as session:
    # First interaction
    run1 = await session.run_sync(agent="echo", input=[Message(...)])
    # Second interaction — same session, agent sees history
    run2 = await session.run_sync(agent="echo", input=[Message(...)])
```

All runs within a session share the same session ID automatically.

---

## Server-Side Session Access

On the agent side, the `context` parameter provides access to session data:

```python
@server.agent()
async def stateful_agent(input: list[Message], context: Context):
    # Load full conversation history
    history = [message async for message in context.session.load_history()]

    # Load/store large state objects
    state = await context.session.load_state()
    state["counter"] = state.get("counter", 0) + 1
    await context.session.store_state(state)

    yield Message(parts=[MessagePart(
        content=f"Interaction #{state['counter']}",
        content_type="text/plain"
    )])
```

### Session Data Types

| Data        | Management | Description                                    |
| ----------- | ---------- | ---------------------------------------------- |
| **History** | Automatic  | Updated by SDK based on agent yields           |
| **State**   | Manual     | Agent loads, modifies, and stores between runs |

---

## Distributed Sessions

ACP enables session continuity across independent servers through session descriptors that reference content via HTTP URLs rather than storing data inline.

### Session Descriptor Structure

```
Session {
    id: string              // Unique session identifier
    history: URL[]          // HTTP URLs to messages on resource servers
    state: URL              // URL to agent-managed state content
}
```

### Cross-Server Continuation

When a client forwards a session from Server A to Server B:

1. Only the lightweight descriptor moves — actual data stays at resource servers
2. Receiving server resolves URL references to access historical context
3. SDK handles URL resolution transparently via HTTP GET

```python
# Start on Server A
async with Client(base_url="http://server-a:8000") as client_a, client_a.session() as session:
    await session.run_sync(agent="analyst", input=[...])

# Continue on Server B with the same session
async with Client(base_url="http://server-b:8000") as client_b:
    await client_b.run_sync(agent="summarizer", input=[...], session=session)
```

### URL Resolution

1. Agent requests history via `context.session.load_history()`
2. SDK identifies URL references in the session descriptor
3. HTTP GET retrieves content from resource servers
4. Retrieved data parses into Message objects
5. Optional caching reduces repeated network calls

---

## Distributed Session Benefits

| Benefit                         | Description                                                  |
| ------------------------------- | ------------------------------------------------------------ |
| **Infrastructure Independence** | Servers operate without shared databases or queues           |
| **Fault Tolerance**             | Sessions survive individual server outages                   |
| **Scalability**                 | Horizontal expansion without coordination overhead           |
| **Flexibility**                 | Different server implementations and geographic distribution |

### Considerations

- Network latency increases with cross-server content fetching
- Historical content becomes inaccessible if source servers go offline
- Cross-server communication requires appropriate authentication

---

## SpecForge Relevance

ACP's session model directly informs SpecForge's agent session architecture:

- **Agent Sessions** (`behaviors/BEH-SF-025-agent-sessions.md`): ACP's session context manager with automatic history tracking maps to SpecForge's session concept — both maintain conversational state across multiple agent interactions within a workflow.
- **SessionSnapshotManager** (`c3-agent-system.md`): ACP's session state (load/store pattern) aligns with SpecForge's snapshot manager that persists agent state between flow steps.
- **Distributed Sessions**: ACP's URL-based session descriptors provide a concrete protocol for SpecForge's future distributed deployment — sessions can span multiple SpecForge server instances without shared infrastructure.
