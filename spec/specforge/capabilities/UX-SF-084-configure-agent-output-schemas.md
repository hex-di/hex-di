---
id: UX-SF-084
kind: capability
title: "Configure Agent Output Schemas"
status: active
features: [FEAT-SF-023]
behaviors: [BEH-SF-424, BEH-SF-425, BEH-SF-428, BEH-SF-430, BEH-SF-431]
persona: [developer]
surface: [desktop, dashboard, cli]
---

# Configure Agent Output Schemas

## Use Case

A developer opens the Output Schemas in the desktop app. They define which graph node types, finding categories, and metadata fields each role is allowed to produce, set up schema versioning for backward compatibility, and configure fallback behavior when structured output fails repeatedly. The same operation is accessible via CLI for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌───────────┐     ┌───────────┐     ┌──────────────────┐
│ Developer │     │   Desktop App   │     │ StructuredOutput │
└─────┬─────┘     └─────┬─────┘     └────────┬─────────┘
      │ Open output      │                    │
      │ schema config    │                    │
      │────────────────►│                    │
      │                 │ getSchemas()       │
      │                 │───────────────────►│
      │                 │  RoleSchema[]      │
      │                 │◄───────────────────│
      │ Schema list     │                    │
      │ per role        │                    │
      │◄────────────────│                    │
      │                 │                    │
      │ Edit reviewer   │                    │
      │ schema          │                    │
      │────────────────►│                    │
      │                 │ updateSchema       │
      │                 │ (role, schema)     │
      │                 │───────────────────►│
      │                 │  Validated         │
      │                 │◄───────────────────│
      │ Schema saved    │                    │
      │ (424, 425)      │                    │
      │◄────────────────│                    │
      │                 │                    │
      │ Set fallback    │                    │
      │ to text mode    │                    │
      │────────────────►│                    │
      │                 │ setFallback        │
      │                 │ (role, "text")     │
      │                 │───────────────────►│
      │                 │  Configured        │
      │                 │◄───────────────────│
      │ Fallback saved  │                    │
      │ (431)           │                    │
      │◄────────────────│                    │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant DesktopApp as Desktop App (Output Schemas)
    participant SO as StructuredOutput

    Dev->>+DesktopApp: Open output schema config
    DesktopApp->>+SO: getSchemas() (BEH-SF-424)
    SO-->>-DesktopApp: RoleSchema[] with versions
    DesktopApp-->>-Dev: Schema list per role

    Dev->>+DesktopApp: Edit reviewer schema
    DesktopApp->>+SO: updateSchema(role, schema) (BEH-SF-425)
    SO->>SO: Validate schema structure
    SO-->>-DesktopApp: Validated
    DesktopApp-->>-Dev: Schema saved

    Dev->>+DesktopApp: Set fallback to text mode
    DesktopApp->>+SO: setFallback(role, "text") (BEH-SF-431)
    SO-->>-DesktopApp: Configured
    DesktopApp-->>-Dev: Fallback saved
```

### CLI

```text
┌───────────┐     ┌───────────┐     ┌──────────────────┐
│ Developer │     │ CLI │     │ StructuredOutput │
└─────┬─────┘     └─────┬─────┘     └────────┬─────────┘
      │ Open output      │                    │
      │ schema config    │                    │
      │────────────────►│                    │
      │                 │ getSchemas()       │
      │                 │───────────────────►│
      │                 │  RoleSchema[]      │
      │                 │◄───────────────────│
      │ Schema list     │                    │
      │ per role        │                    │
      │◄────────────────│                    │
      │                 │                    │
      │ Edit reviewer   │                    │
      │ schema          │                    │
      │────────────────►│                    │
      │                 │ updateSchema       │
      │                 │ (role, schema)     │
      │                 │───────────────────►│
      │                 │  Validated         │
      │                 │◄───────────────────│
      │ Schema saved    │                    │
      │ (424, 425)      │                    │
      │◄────────────────│                    │
      │                 │                    │
      │ Set fallback    │                    │
      │ to text mode    │                    │
      │────────────────►│                    │
      │                 │ setFallback        │
      │                 │ (role, "text")     │
      │                 │───────────────────►│
      │                 │  Configured        │
      │                 │◄───────────────────│
      │ Fallback saved  │                    │
      │ (431)           │                    │
      │◄────────────────│                    │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant CLI
    participant SO as StructuredOutput

    Dev->>+CLI: specforge schemas list
    CLI->>+SO: getSchemas() (BEH-SF-424)
    SO-->>-CLI: RoleSchema[] with versions
    CLI-->>-Dev: Schema list per role

    Dev->>+CLI: specforge schemas set reviewer --file ./schema.json
    CLI->>+SO: updateSchema(role, schema) (BEH-SF-425)
    SO->>SO: Validate schema structure
    SO-->>-CLI: Validated
    CLI-->>-Dev: Schema saved

    Dev->>+CLI: specforge schemas set reviewer --fallback text
    CLI->>+SO: setFallback(role, "text") (BEH-SF-431)
    SO-->>-CLI: Configured
    CLI-->>-Dev: Fallback saved
```

## Steps

1. Open the Output Schemas in the desktop app
2. View existing per-role JSON schemas with version history (BEH-SF-430)
3. Edit a role's output schema — constrain allowed node types, finding categories, metadata fields (BEH-SF-424)
4. System validates the schema structure before saving (BEH-SF-425)
5. Configure retry behavior for schema validation failures (BEH-SF-428)
6. Set graceful degradation fallback (text mode) for persistent failures (BEH-SF-431)
7. Publish a new schema version with backward compatibility check (BEH-SF-430)

## Traceability

| Behavior   | Feature     | Role in this capability                         |
| ---------- | ----------- | ----------------------------------------------- |
| BEH-SF-424 | FEAT-SF-023 | Per-role JSON schema definition and editing     |
| BEH-SF-425 | FEAT-SF-023 | Schema validation pipeline for structure checks |
| BEH-SF-428 | FEAT-SF-023 | Retry configuration for validation failures     |
| BEH-SF-430 | FEAT-SF-023 | Schema versioning and backward compatibility    |
| BEH-SF-431 | FEAT-SF-023 | Graceful degradation to text mode fallback      |
