---
id: UX-SF-029
kind: capability
title: "Create Dynamic Agent Roles from Templates"
status: active
features: [FEAT-SF-003, FEAT-SF-011]
behaviors: [BEH-SF-185, BEH-SF-186, BEH-SF-087]
persona: [developer]
surface: [desktop, cli]
---

# Create Dynamic Agent Roles from Templates

## Use Case

A developer opens the Agent Roles in the desktop app. For example, creating a "security-auditor" role from the "reviewer" template, adding security-specific system prompts and MCP tool access. Dynamic roles are registered alongside built-in roles. The same operation is accessible via CLI (`specforge roles templates`) for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌───────────┐     ┌─────────────────┐     ┌──────────────┐
│ Developer │     │   Desktop App   │     │ RoleRegistry │
└─────┬─────┘     └────────┬────────┘     └──────┬───────┘
      │ roles         │              │
      │  templates    │              │
      │──────────────►│              │
      │               │listTemplates()
      │               │─────────────►│
      │               │TemplateList  │
      │               │◄─────────────│
      │ Templates     │              │
      │◄──────────────│              │
      │               │              │
      │ Open Agent  │              │
      │  --from       │              │
      │──────────────►│              │
      │               │createFrom()  │
      │               │─────────────►│
      │               │RoleCreated   │
      │               │◄─────────────│
      │ Created       │              │
      │◄──────────────│              │
      │               │              │
      │ roles         │              │
      │  configure    │              │
      │──────────────►│              │
      │               │customize()   │
      │               │─────────────►│
      │               │RoleCustomized│
      │               │◄─────────────│
      │ Customized    │              │
      │◄──────────────│              │
      │               │              │
      │ roles         │              │
      │  register     │              │
      │──────────────►│              │
      │               │register()    │
      │               │─────────────►│
      │               │Registered    │
      │               │◄─────────────│
      │ Available     │              │
      │◄──────────────│              │
      │               │              │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant DesktopApp as Desktop App (Agent Roles)
    participant Roles as RoleRegistry

    Dev->>+DesktopApp: Open Agent Roles
    DesktopApp->>+Roles: listTemplates()
    Roles-->>-DesktopApp: TemplateList{templates}
    DesktopApp-->>-Dev: Available role templates

    Dev->>+DesktopApp: Open Agent Roles → Click "Create"
    DesktopApp->>+Roles: createFromTemplate("security-auditor", "reviewer") (BEH-SF-185)
    Roles-->>-DesktopApp: RoleCreated{id: "security-auditor"}
    DesktopApp-->>-Dev: Role created from template

    Dev->>+DesktopApp: Select template → Customize
    DesktopApp->>+Roles: customize(id, config) (BEH-SF-186)
    Roles-->>-DesktopApp: RoleCustomized
    DesktopApp-->>-Dev: Role customized

    Dev->>+DesktopApp: Click "Save"
    DesktopApp->>+Roles: register(id) (BEH-SF-087)
    Roles-->>-DesktopApp: RoleRegistered
    DesktopApp-->>-Dev: Role registered and available
```

### CLI

```text
┌───────────┐     ┌─────┐     ┌──────────────┐
│ Developer │     │ CLI │     │ RoleRegistry │
└─────┬─────┘     └──┬──┘     └──────┬───────┘
      │ roles         │              │
      │  templates    │              │
      │──────────────►│              │
      │               │listTemplates()
      │               │─────────────►│
      │               │TemplateList  │
      │               │◄─────────────│
      │ Templates     │              │
      │◄──────────────│              │
      │               │              │
      │ roles create  │              │
      │  --from       │              │
      │──────────────►│              │
      │               │createFrom()  │
      │               │─────────────►│
      │               │RoleCreated   │
      │               │◄─────────────│
      │ Created       │              │
      │◄──────────────│              │
      │               │              │
      │ roles         │              │
      │  configure    │              │
      │──────────────►│              │
      │               │customize()   │
      │               │─────────────►│
      │               │RoleCustomized│
      │               │◄─────────────│
      │ Customized    │              │
      │◄──────────────│              │
      │               │              │
      │ roles         │              │
      │  register     │              │
      │──────────────►│              │
      │               │register()    │
      │               │─────────────►│
      │               │Registered    │
      │               │◄─────────────│
      │ Available     │              │
      │◄──────────────│              │
      │               │              │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant CLI
    participant Roles as RoleRegistry

    Dev->>+CLI: specforge roles templates
    CLI->>+Roles: listTemplates()
    Roles-->>-CLI: TemplateList{templates}
    CLI-->>-Dev: Available role templates

    Dev->>+CLI: specforge roles create security-auditor --from reviewer
    CLI->>+Roles: createFromTemplate("security-auditor", "reviewer") (BEH-SF-185)
    Roles-->>-CLI: RoleCreated{id: "security-auditor"}
    CLI-->>-Dev: Role created from template

    Dev->>+CLI: specforge roles configure security-auditor --prompt "..."
    CLI->>+Roles: customize(id, config) (BEH-SF-186)
    Roles-->>-CLI: RoleCustomized
    CLI-->>-Dev: Role customized

    Dev->>+CLI: specforge roles register security-auditor
    CLI->>+Roles: register(id) (BEH-SF-087)
    Roles-->>-CLI: RoleRegistered
    CLI-->>-Dev: Role registered and available
```

## Steps

1. Open the Agent Roles in the desktop app
2. Create a role from template: `specforge roles create security-auditor --from reviewer` (BEH-SF-185)
3. Customize the role definition: system prompt, tool access, model preferences (BEH-SF-186)
4. Register the role via the hook pipeline (BEH-SF-087)
5. Role appears in `specforge roles list`
6. Use the role in flow definitions or ad-hoc sessions

## Traceability

| Behavior   | Feature     | Role in this capability              |
| ---------- | ----------- | ------------------------------------ |
| BEH-SF-185 | FEAT-SF-003 | Dynamic role creation from templates |
| BEH-SF-186 | FEAT-SF-003 | Role customization and validation    |
| BEH-SF-087 | FEAT-SF-011 | Hook pipeline for role registration  |
