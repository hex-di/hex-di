---
id: UX-SF-080
kind: capability
title: "Define Skill Workflows"
status: active
features: [FEAT-SF-037, FEAT-SF-004, FEAT-SF-007]
behaviors: [BEH-SF-574, BEH-SF-575, BEH-SF-580, BEH-SF-581, BEH-SF-133]
persona: [developer, team-lead]
surface: [desktop, dashboard, cli]
---

# Define Skill Workflows

## Use Case

A developer opens the Workflow Builder in the desktop app. Workflows can be created from scratch or instantiated from predefined templates. The workflow composer validates references, dependency order, and condition expressions before allowing execution. The same operation is accessible via CLI (`specforge workflows create`) for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌───────────┐     ┌───────────┐     ┌─────────────────┐
│ Developer │     │   Desktop App   │     │ SkillWorkflow   │
└─────┬─────┘     └─────┬─────┘     └───────┬─────────┘
      │ New workflow    │                    │
      │────────────────►│                    │
      │                 │                    │
      │ Choose template │                    │
      │ or blank        │                    │
      │────────────────►│                    │
      │                 │ listTemplates()   │
      │                 │───────────────────►│
      │                 │  Templates[]      │
      │                 │◄───────────────────│
      │ Templates shown │                    │
      │ (580)           │                    │
      │◄────────────────│                    │
      │                 │                    │
      │ Select          │                    │
      │ "security-      │                    │
      │  review"        │                    │
      │────────────────►│                    │
      │                 │ instantiate       │
      │                 │ Template(id)      │
      │                 │───────────────────►│
      │                 │  Workflow created  │
      │                 │◄───────────────────│
      │ Workflow with   │                    │
      │ steps (574)     │                    │
      │◄────────────────│                    │
      │                 │                    │
      │ Validate        │                    │
      │────────────────►│                    │
      │                 │ validateWorkflow   │
      │                 │ (id)              │
      │                 │───────────────────►│
      │                 │  ValidationResult │
      │                 │◄───────────────────│
      │ Valid / errors  │                    │
      │ (575)           │                    │
      │◄────────────────│                    │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant DesktopApp as Desktop App (Workflow Builder)
    participant WF as SkillWorkflow

    Dev->>+DesktopApp: Create new workflow
    DesktopApp->>+WF: listTemplates() (BEH-SF-580)
    WF-->>-DesktopApp: Templates[security-review, onboarding, ...]
    DesktopApp-->>-Dev: Template picker shown (BEH-SF-133)

    Dev->>+DesktopApp: Select "security-review" template
    DesktopApp->>+WF: instantiateTemplate("security-review") (BEH-SF-580)
    WF-->>-DesktopApp: SkillWorkflow with pre-configured steps
    DesktopApp-->>-Dev: Workflow composer with steps (BEH-SF-574)

    Dev->>+DesktopApp: Modify steps and parameters
    DesktopApp->>+WF: updateWorkflow(id, patch) (BEH-SF-574)
    WF-->>-DesktopApp: Updated (version created)
    DesktopApp-->>-Dev: Steps updated (BEH-SF-581)

    Dev->>+DesktopApp: Validate workflow
    DesktopApp->>+WF: validateWorkflow(id) (BEH-SF-575)
    WF-->>-DesktopApp: WorkflowValidationResult
    DesktopApp-->>-Dev: Valid or errors displayed
```

### CLI

```text
┌───────────┐     ┌───────────┐     ┌─────────────────┐
│ Developer │     │ CLI │     │ SkillWorkflow   │
└─────┬─────┘     └─────┬─────┘     └───────┬─────────┘
      │ New workflow    │                    │
      │────────────────►│                    │
      │                 │                    │
      │ Choose template │                    │
      │ or blank        │                    │
      │────────────────►│                    │
      │                 │ listTemplates()   │
      │                 │───────────────────►│
      │                 │  Templates[]      │
      │                 │◄───────────────────│
      │ Templates shown │                    │
      │ (580)           │                    │
      │◄────────────────│                    │
      │                 │                    │
      │ Select          │                    │
      │ "security-      │                    │
      │  review"        │                    │
      │────────────────►│                    │
      │                 │ instantiate       │
      │                 │ Template(id)      │
      │                 │───────────────────►│
      │                 │  Workflow created  │
      │                 │◄───────────────────│
      │ Workflow with   │                    │
      │ steps (574)     │                    │
      │◄────────────────│                    │
      │                 │                    │
      │ Validate        │                    │
      │────────────────►│                    │
      │                 │ validateWorkflow   │
      │                 │ (id)              │
      │                 │───────────────────►│
      │                 │  ValidationResult │
      │                 │◄───────────────────│
      │ Valid / errors  │                    │
      │ (575)           │                    │
      │◄────────────────│                    │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant CLI
    participant WF as SkillWorkflow

    Dev->>+CLI: specforge workflows create
    CLI->>+WF: listTemplates() (BEH-SF-580)
    WF-->>-CLI: Templates[security-review, onboarding, ...]
    CLI-->>-Dev: Template picker shown (BEH-SF-133)

    Dev->>+CLI: specforge workflows create --template security-review
    CLI->>+WF: instantiateTemplate("security-review") (BEH-SF-580)
    WF-->>-CLI: SkillWorkflow with pre-configured steps
    CLI-->>-Dev: Workflow composer with steps (BEH-SF-574)

    Dev->>+CLI: specforge workflows edit <workflow-id>
    CLI->>+WF: updateWorkflow(id, patch) (BEH-SF-574)
    WF-->>-CLI: Updated (version created)
    CLI-->>-Dev: Steps updated (BEH-SF-581)

    Dev->>+CLI: specforge workflows validate <workflow-id>
    CLI->>+WF: validateWorkflow(id) (BEH-SF-575)
    WF-->>-CLI: WorkflowValidationResult
    CLI-->>-Dev: Valid or errors displayed
```

## Steps

1. Open the Workflow Builder in the desktop app
2. Choose to start from a template or create a blank workflow (BEH-SF-580)
3. If using a template, select from: security-review, onboarding, compliance-check, code-quality (BEH-SF-580)
4. Add, remove, or reorder skill steps in the workflow (BEH-SF-574)
5. Configure each step: skill reference, condition expression, parameters, failure policy (BEH-SF-574)
6. Validate the workflow — check references, order, dependencies, and conditions (BEH-SF-575)
7. Fix any validation errors before the workflow can be executed
8. View version history of step changes and rollback if needed (BEH-SF-581)

## Traceability

| Behavior   | Feature     | Role in this capability                             |
| ---------- | ----------- | --------------------------------------------------- |
| BEH-SF-574 | FEAT-SF-037 | Workflow creation with ordered steps and parameters |
| BEH-SF-575 | FEAT-SF-037 | Validation of references, order, and conditions     |
| BEH-SF-580 | FEAT-SF-037 | Predefined workflow templates                       |
| BEH-SF-581 | FEAT-SF-037 | Workflow versioning and rollback                    |
| BEH-SF-133 | FEAT-SF-007 | Dashboard workflow composer UI                      |
