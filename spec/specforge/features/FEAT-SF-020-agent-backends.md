---
id: FEAT-SF-020
kind: feature
title: "Agent Backends"
status: active
behaviors:
  [
    BEH-SF-151,
    BEH-SF-152,
    BEH-SF-153,
    BEH-SF-154,
    BEH-SF-155,
    BEH-SF-156,
    BEH-SF-157,
    BEH-SF-158,
    BEH-SF-159,
    BEH-SF-160,
    BEH-SF-239,
    BEH-SF-240,
    BEH-SF-241,
    BEH-SF-242,
    BEH-SF-243,
    BEH-SF-244,
    BEH-SF-245,
    BEH-SF-246,
    BEH-SF-247,
    BEH-SF-248,
    BEH-SF-504,
    BEH-SF-505,
    BEH-SF-506,
    BEH-SF-507,
    BEH-SF-508,
    BEH-SF-509,
    BEH-SF-510,
    BEH-SF-511,
  ]
adrs: [ADR-018]
roadmap_phases: [RM-01, RM-02]
---

# Agent Backends

## Problem

SpecForge orchestrates AI agents, but each agent CLI (Claude Code, Codex CLI, Gemini CLI, Qwen CLI, etc.) is an opaque subprocess with its own session management, tool access, output format, and process lifecycle. Hardcoding to a single CLI creates vendor lock-in and prevents teams from choosing the best agent for each role.

## Solution

The agent backend system defines a uniform ACP-compliant adapter contract that any CLI agent can implement. Each backend registers with the ACP server, advertises its capabilities, and translates its native output into ACP messages. The system routes tasks to backends based on capability matching, health status, and cost profile. BEH-SF-151–160 define the shared CLI subprocess mechanics (spawn, parse, retry, kill) that every backend adapter reuses; BEH-SF-239–248 define the ACP-native registration, routing, and observability layer that sits above them. Adding a new agent CLI means implementing one adapter — no core changes required.

## Constituent Behaviors

| ID         | Summary                              |
| ---------- | ------------------------------------ |
| BEH-SF-151 | CLI process spawning (generic)       |
| BEH-SF-152 | CLI argument construction            |
| BEH-SF-153 | Output stream parsing                |
| BEH-SF-154 | Error code mapping                   |
| BEH-SF-155 | Session file management              |
| BEH-SF-156 | Tool permission forwarding           |
| BEH-SF-157 | Structured output extraction         |
| BEH-SF-158 | Process lifecycle management         |
| BEH-SF-159 | Retry on transient failures          |
| BEH-SF-160 | Timeout and kill handling            |
| BEH-SF-239 | Backend registration via ACP         |
| BEH-SF-240 | Backend execution dispatch           |
| BEH-SF-241 | Output translation to ACP messages   |
| BEH-SF-242 | Session continuity across ACP runs   |
| BEH-SF-243 | Backend health monitoring            |
| BEH-SF-244 | Backend reconnection                 |
| BEH-SF-245 | Multi-backend routing                |
| BEH-SF-246 | Backend capability advertisement     |
| BEH-SF-247 | Backend versioning and compatibility |
| BEH-SF-248 | Backend metrics and observability    |

## Acceptance Criteria

- [ ] Any CLI agent can register as an ACP backend via the adapter contract
- [ ] Output streams from heterogeneous CLIs are parsed into uniform ACP messages
- [ ] Multi-backend routing selects the appropriate backend per task and role
- [ ] Backend capability advertisement enables role-to-backend matching
- [ ] Health monitoring detects failures across all registered backends
- [ ] Adding a new agent CLI requires only an adapter — zero core changes
