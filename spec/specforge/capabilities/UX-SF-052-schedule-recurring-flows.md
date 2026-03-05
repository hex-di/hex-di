---
id: UX-SF-052
kind: capability
title: "Schedule Recurring Verification Flows"
status: active
features: [FEAT-SF-030, FEAT-SF-028]
behaviors: [BEH-SF-057, BEH-SF-161, BEH-SF-330]
persona: [devops]
surface: [cli]
---

# Schedule Recurring Verification Flows

## Use Case

A DevOps engineer sets up scheduled flows that run automatically on a recurring basis — for example, a nightly drift check, a weekly compliance verification, or a monthly cost analysis. Scheduled flows use the hook pipeline's cron-like scheduling and operate in batch mode.

## Interaction Flow

```text
┌────────┐ ┌─────┐ ┌───────────────┐ ┌───────────┐
│ DevOps │ │ CLI │ │ScheduleManager│ │FlowEngine │
└───┬────┘ └──┬──┘ └──────┬────────┘ └─────┬─────┘
    │          │           │                │
    │ schedule create --cron "0 2 * * *"    │
    │─────────►│           │                │
    │          │ createSchedule(flow, cron)  │
    │          │──────────►│                │
    │          │ ScheduleCreated{id}        │
    │          │◄──────────│                │
    │ next run at 02:00    │                │
    │◄─────────│           │                │
    │          │           │                │
    │ schedule config --notify ops-team     │
    │─────────►│           │                │
    │          │ setNotification()          │
    │          │──────────►│                │
    │          │ NotificationConfigured     │
    │          │◄──────────│                │
    │ recipients set       │                │
    │◄─────────│           │                │
    │          │           │                │
    │          │    [At scheduled time]     │
    │          │           │ triggerFlow()  │
    │          │           │───────────────►│
    │          │           │ FlowComplete   │
    │          │           │◄───────────────│
    │ Notification with results             │
    │◄─────────────────────│                │
    │          │           │                │
```

```mermaid
sequenceDiagram
    actor Ops as DevOps
    participant CLI
    participant Scheduler as ScheduleManager
    participant Engine as FlowEngine

    Ops->>+CLI: specforge schedule create --flow drift-check --cron "0 2 * * *"
    CLI->>+Scheduler: createSchedule(flow, cron) (BEH-SF-330)
    Scheduler-->>-CLI: ScheduleCreated{id, nextRun}
    CLI-->>-Ops: Schedule created, next run at 02:00

    Ops->>+CLI: specforge schedule config <id> --notify ops-team
    CLI->>+Scheduler: setNotification(scheduleId, recipients) (BEH-SF-161)
    Scheduler-->>-CLI: NotificationConfigured
    CLI-->>-Ops: Notification recipients set

    Note over Scheduler: At scheduled time:
    Scheduler->>+Engine: triggerFlow(flowId, batchMode) (BEH-SF-057)
    Engine-->>-Scheduler: FlowComplete{results}
    Scheduler->>Ops: Notification with results
```

## Steps

1. Create a schedule: `specforge schedule create --flow drift-check --cron "0 2 * * *"` (BEH-SF-330)
2. Configure flow parameters for the scheduled run (BEH-SF-161)
3. Set notification recipients for schedule completion
4. System triggers the flow at the configured times (BEH-SF-057)
5. Results are stored in flow history with schedule metadata
6. View schedule status: `specforge schedule list`
7. Disable/enable schedules: `specforge schedule disable <schedule-id>`

## Traceability

| Behavior   | Feature     | Role in this capability            |
| ---------- | ----------- | ---------------------------------- |
| BEH-SF-057 | FEAT-SF-030 | Flow execution for scheduled runs  |
| BEH-SF-161 | FEAT-SF-030 | Hook pipeline scheduling           |
| BEH-SF-330 | FEAT-SF-028 | Schedule configuration persistence |
