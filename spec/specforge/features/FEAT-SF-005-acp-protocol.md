---
id: FEAT-SF-005
kind: feature
title: "ACP Protocol"
status: active
behaviors:
  [
    BEH-SF-033,
    BEH-SF-034,
    BEH-SF-035,
    BEH-SF-036,
    BEH-SF-037,
    BEH-SF-038,
    BEH-SF-039,
    BEH-SF-040,
    BEH-SF-209,
    BEH-SF-210,
    BEH-SF-211,
    BEH-SF-212,
    BEH-SF-213,
    BEH-SF-214,
    BEH-SF-215,
    BEH-SF-216,
    BEH-SF-217,
    BEH-SF-218,
    BEH-SF-219,
    BEH-SF-220,
    BEH-SF-221,
    BEH-SF-222,
    BEH-SF-223,
    BEH-SF-224,
    BEH-SF-225,
    BEH-SF-226,
    BEH-SF-227,
    BEH-SF-228,
    BEH-SF-229,
    BEH-SF-230,
    BEH-SF-231,
    BEH-SF-232,
    BEH-SF-233,
    BEH-SF-234,
    BEH-SF-235,
    BEH-SF-236,
    BEH-SF-237,
    BEH-SF-238,
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
    BEH-SF-395,
    BEH-SF-496,
    BEH-SF-497,
    BEH-SF-498,
    BEH-SF-499,
    BEH-SF-500,
    BEH-SF-501,
    BEH-SF-502,
    BEH-SF-503,
    BEH-SF-512,
    BEH-SF-513,
    BEH-SF-514,
    BEH-SF-515,
    BEH-SF-516,
    BEH-SF-517,
    BEH-SF-518,
    BEH-SF-519,
  ]
adrs: [ADR-018]
roadmap_phases: [RM-02]
---

# ACP Protocol

## Problem

SpecForge needs a standardized way to communicate with AI agent backends (like Claude Code), manage run lifecycles, exchange structured messages, and handle human-in-the-loop escalations. The original blackboard + ClaudeCodeAdapter approach was ad-hoc and tightly coupled.

## Solution

The Agent Communication Protocol (ACP) provides a unified layer for agent interaction. It comprises four sublayers: the ACP server (lifecycle management with 7 run states), ACP client (run creation, polling, resume, cancellation), ACP messaging (document artifacts, findings, inter-agent messages, clarification via await), and the agent backend (Claude Code registration, execution, output translation, session continuity). ACP supersedes both the blackboard pattern (ADR-003) and the direct Claude Code adapter (ADR-004).

## Constituent Behaviors

| ID             | Summary                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------- |
| BEH-SF-033–040 | Blackboard architecture (superseded — mapped to ACP messaging)                              |
| BEH-SF-209     | ACP server startup and initialization                                                       |
| BEH-SF-210     | Agent manifest registration                                                                 |
| BEH-SF-211     | Handler registration for message types                                                      |
| BEH-SF-212     | Run lifecycle — 7 states (created, running, awaiting, paused, completed, failed, cancelled) |
| BEH-SF-213–218 | Run state transitions, cleanup, error handling                                              |
| BEH-SF-219     | Run creation via ACP client                                                                 |
| BEH-SF-220     | Status polling                                                                              |
| BEH-SF-221     | Resume from await (HITL)                                                                    |
| BEH-SF-222     | Run cancellation                                                                            |
| BEH-SF-223–228 | Client error handling, reconnection, timeout                                                |
| BEH-SF-229     | Document artifact messages                                                                  |
| BEH-SF-230     | Finding messages                                                                            |
| BEH-SF-231     | Inter-agent coordination messages                                                           |
| BEH-SF-232     | Clarification via await pattern                                                             |
| BEH-SF-233–238 | Message validation, routing, persistence                                                    |
| BEH-SF-239     | Claude Code backend registration                                                            |
| BEH-SF-240     | Backend execution dispatch                                                                  |
| BEH-SF-241     | Output translation to ACP messages                                                          |
| BEH-SF-242     | Session continuity across runs                                                              |
| BEH-SF-243–248 | Backend health, reconnection, multi-backend support                                         |
| BEH-SF-320–324 | ACP server authentication                                                                   |
| BEH-SF-325–329 | Connection/session separation                                                               |
| BEH-SF-395–396 | Clarification timeout handling                                                              |

## Acceptance Criteria

- [ ] ACP server starts and registers agent manifests
- [ ] Run lifecycle transitions through all 7 states correctly
- [ ] Client can create, poll, resume, and cancel runs
- [ ] Messaging layer delivers documents, findings, and inter-agent messages
- [ ] Clarification await pattern pauses runs until human input arrives
- [ ] Claude Code backend executes and translates output to ACP format
- [ ] Authentication secures server-client communication
