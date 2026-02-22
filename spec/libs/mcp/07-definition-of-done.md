# 07 - Definition of Done

_Previous: [06 - Appendices](./06-appendices.md)_

---

Test suites for `@hex-di/mcp` in `packages/mcp/tests/`. Each DoD section maps to a test file. Tests use `vitest` and follow the project's testing conventions.

---

## DoD 1: Port Creation

**File:** `packages/mcp/tests/ports/resource-port.test.ts`, `tool-port.test.ts`, `prompt-port.test.ts`, `resource-port.test-d.ts`, `tool-port.test-d.ts`, `prompt-port.test-d.ts`

### Runtime Tests (~12 tests)

| #   | Test                                                                    | Assertion                                               |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | `createMcpResourcePort()` returns a port with `"mcp-resource"` category | `port.category === "mcp-resource"`                      |
| 2   | Resource port carries URI metadata                                      | Metadata includes the URI string from config            |
| 3   | Resource port carries description metadata                              | Metadata includes the description string from config    |
| 4   | Resource port carries MIME type (default)                               | MIME type defaults to `"application/json"` when omitted |
| 5   | Resource port carries custom MIME type                                  | MIME type matches the config value when provided        |
| 6   | `createMcpToolPort()` returns a port with `"mcp-tool"` category         | `port.category === "mcp-tool"`                          |
| 7   | Tool port carries tool name metadata                                    | Metadata includes the toolName string from config       |
| 8   | Tool port carries input schema metadata                                 | Metadata includes the inputSchema object from config    |
| 9   | `createMcpPromptPort()` returns a port with `"mcp-prompt"` category     | `port.category === "mcp-prompt"`                        |
| 10  | Prompt port carries prompt name metadata                                | Metadata includes the promptName string from config     |
| 11  | Prompt port carries argument definitions                                | Metadata includes the arguments array from config       |
| 12  | Invalid URI in resource port throws                                     | URI without `://` produces an error                     |

### Type Tests (~6 tests)

| #   | Test                                                          | Assertion                                                          |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | `McpResourcePort<T>` adapter must return `ResourceHandler<T>` | `expectTypeOf` adapter factory return matches `ResourceHandler<T>` |
| 2   | `McpToolPort<I,O>` adapter must return `ToolHandler<I,O>`     | `expectTypeOf` adapter factory return matches `ToolHandler<I,O>`   |
| 3   | `McpPromptPort<A>` adapter must return `PromptHandler<A>`     | `expectTypeOf` adapter factory return matches `PromptHandler<A>`   |
| 4   | Resource port with wrong response type is a compile error     | `// @ts-expect-error` on mismatched adapter                        |
| 5   | Tool port with wrong input type is a compile error            | `// @ts-expect-error` on mismatched adapter                        |
| 6   | Prompt port with wrong args type is a compile error           | `// @ts-expect-error` on mismatched adapter                        |

---

## DoD 2: Resource Adapters

**File:** `packages/mcp/tests/handlers/resource-handler.test.ts`

| #   | Test                                              | Assertion                                         |
| --- | ------------------------------------------------- | ------------------------------------------------- |
| 1   | Resource adapter handler receives empty params    | `handle({})` returns expected data                |
| 2   | Resource adapter handler receives query params    | `handle({ limit: "10" })` passes params correctly |
| 3   | Async resource handler resolves                   | `await handle(params)` returns expected data      |
| 4   | Resource adapter with injected dependencies works | Handler uses injected service to produce response |
| 5   | Resource handler error is propagated              | Thrown error is catchable by the framework        |

---

## DoD 3: Tool Adapters

**File:** `packages/mcp/tests/handlers/tool-handler.test.ts`

| #   | Test                                                       | Assertion                                                    |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | Tool adapter handler receives validated input              | `execute(input)` receives the input object                   |
| 2   | Async tool handler resolves                                | `await execute(input)` returns expected output               |
| 3   | Tool adapter with injected dependencies works              | Handler uses injected service to perform action              |
| 4   | Tool handler error is propagated                           | Thrown error is catchable by the framework                   |
| 5   | Tool opt-in enforcement: tools not discovered without flag | Server created without `enableTools` has 0 registered tools  |
| 6   | Tool opt-in enforcement: tools discovered with flag        | Server created with `enableTools: true` has registered tools |

---

## DoD 4: Prompt Adapters

**File:** `packages/mcp/tests/handlers/prompt-handler.test.ts`

| #   | Test                                                | Assertion                                                                |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | Prompt handler generates text messages              | `generate(args)` returns `[{ role: "user", content: { type: "text" } }]` |
| 2   | Prompt handler generates resource-embedded messages | Response includes `content.type === "resource"` with URI                 |
| 3   | Async prompt handler resolves                       | `await generate(args)` returns expected messages                         |
| 4   | Prompt adapter with injected dependencies works     | Handler uses injected services to enrich prompt context                  |
| 5   | Prompt handler error is propagated                  | Thrown error is catchable by the framework                               |

---

## DoD 5: Server Creation

**File:** `packages/mcp/tests/server/create-server.test.ts`

| #   | Test                                            | Assertion                                             |
| --- | ----------------------------------------------- | ----------------------------------------------------- |
| 1   | `createMcpServer()` returns an McpServer handle | Handle has `start`, `stop`, `getCapabilities` methods |
| 2   | Server name defaults to "HexDI MCP Server"      | `getCapabilities()` reports default name              |
| 3   | Custom server name is used                      | `getCapabilities()` reports custom name               |
| 4   | Server version defaults to "0.1.0"              | Reported version matches default                      |
| 5   | Server state is "created" before start          | `server.state === "created"`                          |
| 6   | Empty graph produces server with 0 capabilities | `getRegisteredResources()` returns empty array        |
| 7   | Server with no transport does not auto-start    | `server.state === "created"` after construction       |

---

## DoD 6: Capability Discovery

**File:** `packages/mcp/tests/server/discovery.test.ts`

| #   | Test                                        | Assertion                                                                |
| --- | ------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | Discovers resource ports by category        | Graph with 2 resource adapters yields 2 registered resources             |
| 2   | Discovers prompt ports by category          | Graph with 1 prompt adapter yields 1 registered prompt                   |
| 3   | Does not discover tool ports without opt-in | Graph with tool adapters, `enableTools: false`, yields 0 tools           |
| 4   | Discovers tool ports with opt-in            | Graph with tool adapters, `enableTools: true`, yields correct tool count |
| 5   | Mixed graph discovers all categories        | Graph with resources + tools + prompts yields correct counts             |
| 6   | Duplicate resource URI throws               | Two ports with same URI produce `McpDiscoveryError`                      |
| 7   | Duplicate tool name throws                  | Two ports with same toolName produce `McpDiscoveryError`                 |
| 8   | Duplicate prompt name throws                | Two ports with same promptName produce `McpDiscoveryError`               |
| 9   | Merged graphs combine capabilities          | `graph.merge(a).merge(b)` yields combined resource/tool/prompt counts    |

---

## DoD 7: Transport

**File:** `packages/mcp/tests/transport/stdio.test.ts`, `sse.test.ts`

| #   | Test                                                  | Assertion                                    |
| --- | ----------------------------------------------------- | -------------------------------------------- |
| 1   | `createStdioTransport()` returns a valid McpTransport | Has `connect` and `disconnect` methods       |
| 2   | StdioTransport defaults to process.stdin/stdout       | Transport connects without custom streams    |
| 3   | StdioTransport accepts custom streams                 | Transport uses provided input/output streams |
| 4   | `createSseTransport()` returns a valid McpTransport   | Has `connect` and `disconnect` methods       |
| 5   | SseTransport defaults to port 3001                    | Transport configuration has default port     |
| 6   | SseTransport accepts custom port                      | Transport uses provided port number          |

---

## DoD 8: Server Lifecycle

**File:** `packages/mcp/tests/integration/lifecycle.test.ts`

| #   | Test                                                  | Assertion                                        |
| --- | ----------------------------------------------------- | ------------------------------------------------ |
| 1   | `start()` transitions state to "running"              | `server.state === "running"` after start         |
| 2   | `stop()` transitions state to "stopped"               | `server.state === "stopped"` after stop          |
| 3   | `start()` without transport throws                    | Error with descriptive message                   |
| 4   | `connectTransport()` allows late transport attachment | Server starts after connecting transport         |
| 5   | `stop()` disposes the container                       | Singleton instances are cleaned up               |
| 6   | Double `start()` throws                               | Error when starting an already-running server    |
| 7   | Double `stop()` is idempotent                         | No error when stopping an already-stopped server |
| 8   | Lifecycle events fire in order                        | `"started"` fires before `"stopped"`             |
| 9   | Error event fires on handler error                    | `"error"` event includes error details           |

---

## DoD 9: Integration (End-to-End)

**File:** `packages/mcp/tests/integration/e2e.test.ts`

| #   | Test                                                     | Assertion                                                       |
| --- | -------------------------------------------------------- | --------------------------------------------------------------- |
| 1   | Full flow: graph -> server -> resource query -> response | Mock client queries resource, receives typed response           |
| 2   | Full flow: graph -> server -> tool call -> result        | Mock client calls tool, receives typed result                   |
| 3   | Full flow: graph -> server -> prompt request -> messages | Mock client requests prompt, receives message array             |
| 4   | Resource with query params returns filtered data         | Query params flow through to handler and affect response        |
| 5   | Tool input validation rejects invalid input              | Invalid input produces error without calling handler            |
| 6   | Unknown resource URI returns error                       | Non-existent URI produces `RESOURCE_NOT_FOUND` error            |
| 7   | Unknown tool name returns error                          | Non-existent tool name produces `TOOL_NOT_FOUND` error          |
| 8   | Multi-domain merged graph serves all capabilities        | Server with merged graphs responds to queries from both domains |
| 9   | Server capabilities listing matches graph                | `getRegisteredResources()` matches discovered URIs              |
| 10  | Handler error returns MCP error response                 | Handler that throws produces `InternalError` MCP response       |

---

## Test Count Summary

| DoD | Area                 | Runtime Tests | Type Tests | Total  |
| --- | -------------------- | ------------- | ---------- | ------ |
| 1   | Port Creation        | 12            | 6          | 18     |
| 2   | Resource Adapters    | 5             | 0          | 5      |
| 3   | Tool Adapters        | 6             | 0          | 6      |
| 4   | Prompt Adapters      | 5             | 0          | 5      |
| 5   | Server Creation      | 7             | 0          | 7      |
| 6   | Capability Discovery | 9             | 0          | 9      |
| 7   | Transport            | 6             | 0          | 6      |
| 8   | Server Lifecycle     | 9             | 0          | 9      |
| 9   | Integration (E2E)    | 10            | 0          | 10     |
|     | **Total**            | **69**        | **6**      | **75** |

---

## Verification Checklist

- [ ] Section numbering is sequential (1-22) with no gaps across all spec files
- [ ] README ToC links resolve to correct files and anchors
- [ ] No inspection-specific adapters or `hexdi://` URIs in spec/libs/mcp/ framework code (those belong in spec/tooling/devtools/)
  - Appendix D uses `ecommerce://` scheme to demonstrate general-purpose usage
  - `hexdi://` appears only in explanatory text referencing DevTools adapters
- [ ] Framework sections reference `@modelcontextprotocol/sdk` correctly as a peer dependency
- [ ] Appendix D custom example uses non-inspection domain (e-commerce) to prove the framework is general-purpose
- [ ] All three port categories (`mcp-resource`, `mcp-tool`, `mcp-prompt`) are covered in ports, adapters, discovery, and tests
- [ ] Tool opt-in (`enableTools`) is documented in server options, discovery, and tested in DoD 3 and DoD 6
- [ ] Transport port/adapter pattern is documented for stdio, SSE, and custom transports
- [ ] Error codes and classes cover all failure modes (discovery, handler, transport, lifecycle)
- [ ] VISION.md describes `@hex-di/mcp` as framework consistently with this spec
- [ ] vision/phase-4 Section 4.2 references spec/libs/mcp/ and notes inspection adapters in devtools
- [ ] DevTools spec files reference spec/libs/mcp/ for the MCP framework layer

---

_Previous: [06 - Appendices](./06-appendices.md)_
