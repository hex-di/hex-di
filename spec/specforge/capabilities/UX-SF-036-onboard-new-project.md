---
id: UX-SF-036
kind: capability
title: "Onboard a New Project"
status: active
features: [FEAT-SF-028, FEAT-SF-001, FEAT-SF-004]
behaviors: [BEH-SF-001, BEH-SF-113, BEH-SF-330]
persona: [developer]
surface: [desktop, cli]
---

# Onboard a New Project

## Use Case

A developer opens the Project Setup in the desktop app. The onboarding wizard scans the codebase, creates the initial knowledge graph, generates a default configuration, and optionally runs an initial spec-generation flow. This is the first-time setup experience. The same operation is accessible via CLI (`specforge init`) for scripted/CI workflows.

## Related Capabilities

| Capability                                            | Relationship                              |
| ----------------------------------------------------- | ----------------------------------------- |
| [UX-SF-037](./UX-SF-037-configure-deployment-mode.md) | Follows — configure deployment after init |
| [UX-SF-038](./UX-SF-038-set-token-budgets.md)         | Follows — set budgets after init          |
| [UX-SF-039](./UX-SF-039-manage-cli-settings.md)       | Follows — customize CLI after init        |

## Interaction Flow

### Desktop App

```text
┌───────────┐  ┌─────────────────┐  ┌────────────┐  ┌────────────┐
│ Developer │  │   Desktop App   │  │ InitWizard │  │ GraphStore │
└─────┬─────┘  └────────┬────────┘  └─────┬──────┘  └─────┬──────┘
      │            │           │               │
      │ Open Project Setup
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant DesktopApp as Desktop App (Project Setup)
    participant Wizard as InitWizard
    participant Graph as GraphStore

    Dev->>+DesktopApp: Open Project Setup
    DesktopApp->>+Wizard: startOnboarding() (BEH-SF-113)
    Wizard-->>-DesktopApp: Prompt: project name, description, mode
    DesktopApp-->>-Dev: Configuration prompts

    Dev->>+DesktopApp: Enter project details
    DesktopApp->>+Wizard: scanCodebase(projectRoot) (BEH-SF-330)
    Wizard->>+Graph: createInitialGraph(artifacts) (BEH-SF-001)
    Graph-->>-Wizard: GraphCreated{nodeCount}
    Wizard-->>-DesktopApp: OnboardingComplete{summary}
    DesktopApp-->>-Dev: Summary with next steps

    opt Run initial flow
        Dev->>+DesktopApp: Open Project Setup → Click "New"
        DesktopApp-->>-Dev: Flow started
    end
```

### CLI

```text
┌───────────┐  ┌─────┐  ┌────────────┐  ┌────────────┐
│ Developer │  │ CLI │  │ InitWizard │  │ GraphStore │
└─────┬─────┘  └──┬──┘  └─────┬──────┘  └─────┬──────┘
      │            │           │               │
      │ specforge  │           │               │
      │  init      │           │               │
      │───────────►│           │               │
      │            │ start     │               │
      │            │ Onboard() │               │
      │            │──────────►│               │
      │            │ Prompt:   │               │
      │            │ name,desc │               │
      │            │◄──────────│               │
      │ Config     │           │               │
      │  prompts   │           │               │
      │◄───────────│           │               │
      │            │           │               │
      │ Enter      │           │               │
      │  details   │           │               │
      │───────────►│           │               │
      │            │ scan      │               │
      │            │ Codebase()│               │
      │            │──────────►│               │
      │            │           │ createInitial │
      │            │           │  Graph()      │
      │            │           │──────────────►│
      │            │           │ GraphCreated  │
      │            │           │◄──────────────│
      │            │ Onboard   │               │
      │            │ Complete  │               │
      │            │◄──────────│               │
      │ Summary    │           │               │
      │◄───────────│           │               │
      │            │           │               │
      │ [opt: Run initial flow]│               │
      │ specforge  │           │               │
      │  run       │           │               │
      │───────────►│           │               │
      │ Flow       │           │               │
      │  started   │           │               │
      │◄───────────│           │               │
      │ [end opt]  │           │               │
      │            │           │               │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant CLI
    participant Wizard as InitWizard
    participant Graph as GraphStore

    Dev->>+CLI: specforge init
    CLI->>+Wizard: startOnboarding() (BEH-SF-113)
    Wizard-->>-CLI: Prompt: project name, description, mode
    CLI-->>-Dev: Configuration prompts

    Dev->>+CLI: Enter project details
    CLI->>+Wizard: scanCodebase(projectRoot) (BEH-SF-330)
    Wizard->>+Graph: createInitialGraph(artifacts) (BEH-SF-001)
    Graph-->>-Wizard: GraphCreated{nodeCount}
    Wizard-->>-CLI: OnboardingComplete{summary}
    CLI-->>-Dev: Summary with next steps

    opt Run initial flow
        Dev->>+CLI: specforge run spec-generate
        CLI-->>-Dev: Flow started
    end
```

## Steps

1. Open the Project Setup in the desktop app
2. Wizard prompts for project name, description, and deployment mode
3. System scans the codebase for existing specs, tests, and documentation (BEH-SF-330)
4. Initial knowledge graph is created from discovered artifacts (BEH-SF-001)
5. Default configuration file (`.specforge.yaml`) is generated
6. Optionally run the initial spec-generation flow
7. CLI displays onboarding summary with next steps

## Related Capabilities

| Capability                                            | Relationship                              |
| ----------------------------------------------------- | ----------------------------------------- |
| [UX-SF-037](./UX-SF-037-configure-deployment-mode.md) | Follows — configure deployment after init |
| [UX-SF-038](./UX-SF-038-set-token-budgets.md)         | Follows — set budgets after init          |
| [UX-SF-039](./UX-SF-039-manage-cli-settings.md)       | Follows — customize CLI after init        |

## Traceability

| Behavior   | Feature     | Role in this capability                     |
| ---------- | ----------- | ------------------------------------------- |
| BEH-SF-001 | FEAT-SF-001 | Initial graph population from codebase scan |
| BEH-SF-113 | FEAT-SF-009 | CLI init wizard                             |
| BEH-SF-330 | FEAT-SF-028 | Configuration generation and project setup  |
