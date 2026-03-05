---
id: UX-SF-040
kind: capability
title: "Configure Notification Preferences"
status: active
features: [FEAT-SF-026, FEAT-SF-028]
behaviors: [BEH-SF-133, BEH-SF-273, BEH-SF-330]
persona: [developer]
surface: [desktop, dashboard, cli]
---

# Configure Notification Preferences

## Use Case

A developer opens the Notification Settings in the desktop app. This prevents notification fatigue while ensuring critical events are never missed. The same operation is accessible via CLI (`specforge config notifications`) for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌───────────┐ ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
│ Developer │ │   Desktop App   │ │ ConfigMgr   │ │ NotificationSvc │
└─────┬─────┘ └────────┬────────┘ └──────┬──────┘ └────────┬────────┘
      │           │           │                 │
      │ config    │           │                 │
      │ notifs    │           │                 │
      │──────────►│           │                 │
      │           │ getNotif  │                 │
      │           │ Settings()│                 │
      │           │──────────►│                 │
      │           │ NotifCfg  │                 │
      │           │◄──────────│                 │
      │ Current   │           │                 │
      │  prefs    │           │                 │
      │◄──────────│           │                 │
      │           │           │                 │
      │ Configure  │           │                 │
      │ flow.     │           │                 │
      │ complete  │           │                 │
      │──────────►│           │                 │
      │           │ setEvent  │                 │
      │           │ Filters() │                 │
      │           │──────────►│                 │
      │           │ Filters   │                 │
      │           │  Updated  │                 │
      │           │◄──────────│                 │
      │ Event     │           │                 │
      │ filters   │           │                 │
      │  set      │           │                 │
      │◄──────────│           │                 │
      │           │           │                 │
      │ Set│           │                 │
      │ desktop,  │           │                 │
      │ dashboard │           │                 │
      │──────────►│           │                 │
      │           │ setChannels()               │
      │           │────────────────────────────►│
      │           │ ChannelsConfigured          │
      │           │◄────────────────────────────│
      │ Channels  │           │                 │
      │  config'd │           │                 │
      │◄──────────│           │                 │
      │           │           │                 │
      │ Click    │           │                 │
      │──────────►│           │                 │
      │           │ sendTest()                  │
      │           │────────────────────────────►│
      │           │ TestSent                    │
      │           │◄────────────────────────────│
      │ Test      │           │                 │
      │ notif     │           │                 │
      │  sent     │           │                 │
      │◄──────────│           │                 │
      │           │           │                 │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant DesktopApp as Desktop App (Notification Settings)
    participant Config as ConfigManager
    participant Notif as NotificationService

    Dev->>+DesktopApp: Open Notification Settings
    DesktopApp->>+Config: getNotificationSettings()
    Config-->>-DesktopApp: NotifConfig{events, channels, quietHours}
    DesktopApp-->>-Dev: Current notification preferences

    Dev->>+DesktopApp: Configure event filters
    DesktopApp->>+Config: setEventFilters(events) (BEH-SF-330)
    Config-->>-DesktopApp: FiltersUpdated
    DesktopApp-->>-Dev: Event filters set

    Dev->>+DesktopApp: Set delivery channels
    DesktopApp->>+Notif: setChannels(channels) (BEH-SF-273)
    Notif-->>-DesktopApp: ChannelsConfigured
    DesktopApp-->>-Dev: Channels configured

    Dev->>+DesktopApp: Click "Test"
    DesktopApp->>+Notif: sendTest()
    Notif-->>-DesktopApp: TestSent
    DesktopApp-->>-Dev: Test notification sent (BEH-SF-133)
```

### CLI

```text
┌───────────┐ ┌─────┐ ┌─────────────┐ ┌─────────────────┐
│ Developer │ │ CLI │ │ ConfigMgr   │ │ NotificationSvc │
└─────┬─────┘ └──┬──┘ └──────┬──────┘ └────────┬────────┘
      │           │           │                 │
      │ config    │           │                 │
      │ notifs    │           │                 │
      │──────────►│           │                 │
      │           │ getNotif  │                 │
      │           │ Settings()│                 │
      │           │──────────►│                 │
      │           │ NotifCfg  │                 │
      │           │◄──────────│                 │
      │ Current   │           │                 │
      │  prefs    │           │                 │
      │◄──────────│           │                 │
      │           │           │                 │
      │ --events  │           │                 │
      │ flow.     │           │                 │
      │ complete  │           │                 │
      │──────────►│           │                 │
      │           │ setEvent  │                 │
      │           │ Filters() │                 │
      │           │──────────►│                 │
      │           │ Filters   │                 │
      │           │  Updated  │                 │
      │           │◄──────────│                 │
      │ Event     │           │                 │
      │ filters   │           │                 │
      │  set      │           │                 │
      │◄──────────│           │                 │
      │           │           │                 │
      │ --channels│           │                 │
      │ desktop,  │           │                 │
      │ dashboard │           │                 │
      │──────────►│           │                 │
      │           │ setChannels()               │
      │           │────────────────────────────►│
      │           │ ChannelsConfigured          │
      │           │◄────────────────────────────│
      │ Channels  │           │                 │
      │  config'd │           │                 │
      │◄──────────│           │                 │
      │           │           │                 │
      │ --test    │           │                 │
      │──────────►│           │                 │
      │           │ sendTest()                  │
      │           │────────────────────────────►│
      │           │ TestSent                    │
      │           │◄────────────────────────────│
      │ Test      │           │                 │
      │ notif     │           │                 │
      │  sent     │           │                 │
      │◄──────────│           │                 │
      │           │           │                 │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant CLI
    participant Config as ConfigManager
    participant Notif as NotificationService

    Dev->>+CLI: specforge config notifications
    CLI->>+Config: getNotificationSettings()
    Config-->>-CLI: NotifConfig{events, channels, quietHours}
    CLI-->>-Dev: Current notification preferences

    Dev->>+CLI: specforge config notifications --events flow.complete,approval.needed
    CLI->>+Config: setEventFilters(events) (BEH-SF-330)
    Config-->>-CLI: FiltersUpdated
    CLI-->>-Dev: Event filters set

    Dev->>+CLI: specforge config notifications --channels desktop,dashboard
    CLI->>+Notif: setChannels(channels) (BEH-SF-273)
    Notif-->>-CLI: ChannelsConfigured
    CLI-->>-Dev: Channels configured

    Dev->>+CLI: specforge config notifications --test
    CLI->>+Notif: sendTest()
    Notif-->>-CLI: TestSent
    CLI-->>-Dev: Test notification sent (BEH-SF-133)
```

## Steps

1. Open the Notification Settings in the desktop app
2. Configure event filters: `specforge config notifications --events flow.complete,approval.needed`
3. Set channels: `specforge config notifications --channels desktop,dashboard` (BEH-SF-330)
4. Configure quiet hours: `specforge config notifications --quiet 22:00-08:00`
5. Desktop app respects native notification settings (BEH-SF-273)
6. Desktop app shows unread notification count badge (BEH-SF-133)
7. Test notifications: `specforge config notifications --test`

## Traceability

| Behavior   | Feature     | Role in this capability         |
| ---------- | ----------- | ------------------------------- |
| BEH-SF-133 | FEAT-SF-026 | Dashboard notification display  |
| BEH-SF-273 | FEAT-SF-026 | Desktop native notifications    |
| BEH-SF-330 | FEAT-SF-028 | Notification preference storage |
