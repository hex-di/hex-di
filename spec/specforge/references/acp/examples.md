# ACP — Example Agents

**Source:** [Example Agents](https://agentcommunicationprotocol.dev/introduction/example-agents)
**Captured:** 2026-02-28

---

## Overview

The ACP repository includes reference implementations demonstrating how to build agents with the protocol across multiple frameworks. All examples are available at [github.com/i-am-bee/acp/tree/main/examples/python](https://github.com/i-am-bee/acp/tree/main/examples/python).

---

## Basic Examples

| Agent                                                                                    | Framework | Description                                                                                         |
| ---------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------- |
| [Basic Server & Client](https://github.com/i-am-bee/acp/tree/main/examples/python/basic) | ACP SDK   | Standalone implementations of the various types of ACP clients and servers — sync, async, streaming |

---

## BeeAI Framework Examples

| Agent                                                                                              | Framework   | Description                                                                           |
| -------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------- |
| [Chat Agent](https://github.com/i-am-bee/acp/tree/main/examples/python/beeai-chat)                 | BeeAI       | ReAct agent with tools, memory, and structured output connected to ACP                |
| [Slack Agent](https://github.com/i-am-bee/acp/tree/main/examples/python/beeai-slack-mcp)           | BeeAI + MCP | Slack agent using BeeAI's tool-calling agent integrated with MCP Server for Slack API |
| [Prompt Chaining](https://github.com/i-am-bee/acp/tree/main/examples/python/beeai-prompt-chaining) | BeeAI       | Chains two ReAct agents — one generates marketing copy, another translates to Spanish |
| [Dynamic Routing](https://github.com/i-am-bee/acp/tree/main/examples/python/beeai-routing)         | BeeAI       | Translation router that dispatches to specialized Spanish or French agents            |
| [Handoff Pattern](https://github.com/i-am-bee/acp/tree/main/examples/python/beeai-handoff)         | BeeAI       | Multi-agent handoff delegating multilingual tasks to specialists by input language    |
| [Canvas Agent](https://github.com/i-am-bee/acp/tree/main/examples/python/beeai-canvas)             | BeeAI       | LLM with custom output parsing using ACP's artifact functionality for generated files |

---

## Third-Party Framework Examples

| Agent                                                                                          | Framework      | Description                                                                 |
| ---------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------- |
| [RAG Agent](https://github.com/i-am-bee/acp/tree/main/examples/python/llama-index-rag)         | LlamaIndex     | Document retrieval and synthesis via RAG pipeline                           |
| [Song Writer](https://github.com/i-am-bee/acp/tree/main/examples/python/crewai-song-writer)    | CrewAI         | Crew that generates songs from user-provided websites                       |
| [GPT Researcher](https://github.com/i-am-bee/acp/tree/main/examples/python/gpt-researcher)     | GPT Researcher | Structured ACP messages with real-time progress updates from GPT Researcher |
| [Greeting Agent](https://github.com/i-am-bee/acp/tree/main/examples/python/langgraph-greeting) | LangGraph      | Context-aware time-of-day greeting agent                                    |
| [Story Writer](https://github.com/i-am-bee/acp/tree/main/examples/python/openai-story-writer)  | OpenAI Agent   | Generates imaginative short stories from user prompts                       |

---

## Advanced Examples

| Agent                                                                                                    | Framework | Description                                             |
| -------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------- |
| [Dynamic Agent Generator](https://github.com/i-am-bee/acp/tree/main/examples/python/acp-agent-generator) | ACP SDK   | Agents that dynamically generate other agents using ACP |

---

## Framework Coverage

| Framework          | Example Count | Patterns Demonstrated                                        |
| ------------------ | ------------- | ------------------------------------------------------------ |
| **ACP SDK**        | 2             | Basic client/server, dynamic agent generation                |
| **BeeAI**          | 6             | Chat, MCP integration, chaining, routing, handoff, artifacts |
| **LlamaIndex**     | 1             | RAG pipeline                                                 |
| **CrewAI**         | 1             | Multi-agent crew                                             |
| **GPT Researcher** | 1             | Research with progress streaming                             |
| **LangGraph**      | 1             | Graph-based agent with state                                 |
| **OpenAI Agent**   | 1             | Simple generation agent                                      |

---

## SpecForge Relevance

The example agents demonstrate practical patterns applicable to SpecForge's agent architecture:

- **Prompt Chaining** → SpecForge's sequential flow steps (spec-writer → reviewer → implementer)
- **Dynamic Routing** → SpecForge's role-based agent dispatch (route to specialist based on task type)
- **Handoff Pattern** → SpecForge's agent delegation (coordinator hands off to specialized agents)
- **Dynamic Agent Generator** → SpecForge's dynamic agent spawning for custom workflows
- **Canvas Agent (Artifacts)** → SpecForge's structured output (specs, code files, test results as typed artifacts)
