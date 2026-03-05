---
id: UX-SF-078
kind: capability
title: "Author Custom Skills"
status: active
features: [FEAT-SF-037, FEAT-SF-007]
behaviors: [BEH-SF-566, BEH-SF-567, BEH-SF-568, BEH-SF-569, BEH-SF-572, BEH-SF-133]
persona: [developer, team-lead]
surface: [desktop, dashboard, cli]
---

# Author Custom Skills

## Use Case

A developer opens the Skill Editor in the desktop app. The authoring interface supports versioning with content-hash tracking, role assignment management, and dependency declaration with cycle detection. The same operation is accessible via CLI (`specforge skills create`) for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌───────────┐     ┌───────────┐     ┌──────────────────┐
│ Developer │     │   Desktop App   │     │ SkillManagement  │
└─────┬─────┘     └─────┬─────┘     └────────┬─────────┘
      │ New skill       │                    │
      │ form            │                    │
      │────────────────►│                    │
      │                 │                    │
      │ Fill name,      │                    │
      │ type, content   │                    │
      │────────────────►│                    │
      │                 │ createSkill(input) │
      │                 │───────────────────►│
      │                 │  Created skill     │
      │                 │◄───────────────────│
      │ Skill created   │                    │
      │ (567)           │                    │
      │◄────────────────│                    │
      │                 │                    │
      │ Assign to role  │                    │
      │ "spec-author"   │                    │
      │────────────────►│                    │
      │                 │ assignToRole       │
      │                 │ (id, role)         │
      │                 │───────────────────►│
      │                 │  Assigned          │
      │                 │◄───────────────────│
      │ Role assigned   │                    │
      │ (572)           │                    │
      │◄────────────────│                    │
      │                 │                    │
      │ Add dependency  │                    │
      │────────────────►│                    │
      │                 │ addDependency      │
      │                 │ (id, depId)        │
      │                 │───────────────────►│
      │                 │  Ok / CycleError   │
      │                 │◄───────────────────│
      │ Dependency set  │                    │
      │ (569)           │                    │
      │◄────────────────│                    │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant DesktopApp as Desktop App (Skill Editor)
    participant SM as SkillManagement

    Dev->>+DesktopApp: Open new skill form
    Dev->>DesktopApp: Fill name, type, content, scope
    DesktopApp->>+SM: createSkill(input) (BEH-SF-567)
    SM-->>-DesktopApp: Created skill with contentHash
    DesktopApp-->>-Dev: Skill created (BEH-SF-566 type badge)

    Dev->>+DesktopApp: Assign to "spec-author" role
    DesktopApp->>+SM: assignToRole(skillId, "spec-author") (BEH-SF-572)
    SM-->>-DesktopApp: ASSIGNED_TO relationship created
    DesktopApp-->>-Dev: Role assignment confirmed

    Dev->>+DesktopApp: Add dependency on another skill
    DesktopApp->>+SM: addDependency(skillId, depSkillId) (BEH-SF-569)
    SM-->>-DesktopApp: Ok (or SkillCyclicDependencyError)
    DesktopApp-->>-Dev: Dependency confirmed (or cycle error shown)

    Dev->>+DesktopApp: Edit skill content
    DesktopApp->>+SM: updateSkill(id, {content}) (BEH-SF-568)
    SM-->>-DesktopApp: Updated with new version
    DesktopApp-->>-Dev: Version history updated
```

### CLI

```text
┌───────────┐     ┌───────────┐     ┌──────────────────┐
│ Developer │     │ CLI │     │ SkillManagement  │
└─────┬─────┘     └─────┬─────┘     └────────┬─────────┘
      │ New skill       │                    │
      │ form            │                    │
      │────────────────►│                    │
      │                 │                    │
      │ Fill name,      │                    │
      │ type, content   │                    │
      │────────────────►│                    │
      │                 │ createSkill(input) │
      │                 │───────────────────►│
      │                 │  Created skill     │
      │                 │◄───────────────────│
      │ Skill created   │                    │
      │ (567)           │                    │
      │◄────────────────│                    │
      │                 │                    │
      │ Assign to role  │                    │
      │ "spec-author"   │                    │
      │────────────────►│                    │
      │                 │ assignToRole       │
      │                 │ (id, role)         │
      │                 │───────────────────►│
      │                 │  Assigned          │
      │                 │◄───────────────────│
      │ Role assigned   │                    │
      │ (572)           │                    │
      │◄────────────────│                    │
      │                 │                    │
      │ Add dependency  │                    │
      │────────────────►│                    │
      │                 │ addDependency      │
      │                 │ (id, depId)        │
      │                 │───────────────────►│
      │                 │  Ok / CycleError   │
      │                 │◄───────────────────│
      │ Dependency set  │                    │
      │ (569)           │                    │
      │◄────────────────│                    │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant CLI
    participant SM as SkillManagement

    Dev->>+CLI: specforge skills create
    Dev->>CLI: specforge skills create --name "code-review" --type prompt --file ./skill.md
    CLI->>+SM: createSkill(input) (BEH-SF-567)
    SM-->>-CLI: Created skill with contentHash
    CLI-->>-Dev: Skill created (BEH-SF-566 type badge)

    Dev->>+CLI: specforge skills assign code-review --role spec-author
    CLI->>+SM: assignToRole(skillId, "spec-author") (BEH-SF-572)
    SM-->>-CLI: ASSIGNED_TO relationship created
    CLI-->>-Dev: Role assignment confirmed

    Dev->>+CLI: specforge skills depend code-review --on base-review
    CLI->>+SM: addDependency(skillId, depSkillId) (BEH-SF-569)
    SM-->>-CLI: Ok (or SkillCyclicDependencyError)
    CLI-->>-Dev: Dependency confirmed (or cycle error shown)

    Dev->>+CLI: specforge skills edit code-review
    CLI->>+SM: updateSkill(id, {content}) (BEH-SF-568)
    SM-->>-CLI: Updated with new version
    CLI-->>-Dev: Version history updated
```

## Steps

1. Open the Skill Editor in the desktop app
2. Set the skill type: system (global) or role (scoped to specific roles) (BEH-SF-566)
3. Enter skill name, content (markdown instructions), and scope pattern (BEH-SF-567)
4. Save the skill — system computes contentHash and persists as `Skill` node (BEH-SF-567)
5. Assign the skill to one or more agent roles (BEH-SF-572)
6. Declare dependencies on other skills with cycle detection (BEH-SF-569)
7. Edit the skill content — a new version is created automatically (BEH-SF-568)
8. View version history and diff between versions (BEH-SF-568)

## Decision Paths

```text
┌─────────────────────────────────┐
│ Developer opens authoring form  │
└────────────────┬────────────────┘
                 ▼
          ╱ Skill type? ╲
         ╱               ╲
        ╱                 ╲
    System               Role
       │                   │
       ▼                   ▼
  Empty roles        Select target
  array (all)        roles
       │                   │
       └─────────┬─────────┘
                 ▼
┌─────────────────────────────────┐
│ Enter name, content, scope      │
└────────────────┬────────────────┘
                 ▼
          ╱ Name unique? ╲
         ╱                ╲
        Yes               No
         │                 │
         ▼                 ▼
┌──────────────┐  ┌────────────────┐
│ Create skill │  │ NameConflict   │
│ (567)        │  │ error shown    │
└──────┬───────┘  └────────────────┘
       ▼
┌─────────────────────────────────┐
│ Optionally assign roles (572)   │
│ and declare dependencies (569)  │
└─────────────────────────────────┘
```

```mermaid
flowchart TD
    A[Developer opens authoring form] --> B{Skill type?}
    B -->|System| C[Empty roles array - applies to all]
    B -->|Role| D[Select target agent roles]
    C --> E[Enter name, content, scope]
    D --> E
    E --> F{Name unique?}
    F -->|Yes| G[Create skill with contentHash]
    F -->|No| H([NameConflict error shown])
    G --> I[Assign roles and declare dependencies]
    I --> J([Skill ready for use])
```

## Traceability

| Behavior   | Feature     | Role in this capability                     |
| ---------- | ----------- | ------------------------------------------- |
| BEH-SF-566 | FEAT-SF-037 | Type classification during creation         |
| BEH-SF-567 | FEAT-SF-037 | CRUD operations for custom skills           |
| BEH-SF-568 | FEAT-SF-037 | Version history on content changes          |
| BEH-SF-569 | FEAT-SF-037 | Dependency declaration with cycle detection |
| BEH-SF-572 | FEAT-SF-037 | Role assignment management                  |
| BEH-SF-133 | FEAT-SF-007 | Dashboard rendering for authoring form      |
