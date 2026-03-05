---
id: FEAT-SF-019
kind: feature
title: "Tool Isolation & Security"
status: active
behaviors: [BEH-SF-081, BEH-SF-082, BEH-SF-083, BEH-SF-084, BEH-SF-085, BEH-SF-086]
adrs: [ADR-005, ADR-024]
roadmap_phases: [RM-06]
---

# Tool Isolation & Security

## Problem

AI agents with unrestricted tool access pose security risks — a discovery agent doesn't need file write access, and a reviewer shouldn't execute arbitrary commands. Static tool lists don't adapt to dynamic role assignments.

## Solution

Role-based tool filtering restricts each agent role to only the tools it needs. Tool access is resolved at spawn time based on the role's permission profile, ensuring least-privilege access. MCP server discovery dynamically identifies available tools, and the filtering layer enforces which tools each role can invoke, blocking unauthorized access attempts.

## Constituent Behaviors

| ID         | Summary                           |
| ---------- | --------------------------------- |
| BEH-SF-081 | Role-based tool filtering         |
| BEH-SF-082 | Spawn-time tool resolution        |
| BEH-SF-083 | MCP tool discovery                |
| BEH-SF-084 | Tool invocation authorization     |
| BEH-SF-085 | Unauthorized tool access blocking |
| BEH-SF-086 | Tool access audit logging         |

## Acceptance Criteria

- [ ] Each agent role receives only its permitted tools at spawn
- [ ] Tool resolution occurs at spawn time, not runtime
- [ ] MCP discovery finds all available tools from configured servers
- [ ] Unauthorized tool invocations are blocked with clear error messages
- [ ] All tool access decisions are audit-logged
- [ ] Changing role permissions takes effect on next agent spawn
