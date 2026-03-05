---
id: UX-SF-048
kind: capability
title: "Publish a Custom Agent Pack"
status: active
features: [FEAT-SF-032]
behaviors: [BEH-SF-087, BEH-SF-091]
persona: [developer]
surface: [desktop, cli]
---

# Publish a Custom Agent Pack

## Use Case

A developer opens the Agent Marketplace in the desktop app to publish a custom agent pack. The same operation is accessible via CLI (`specforge plugins validate ./my-plugin`) for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌───────────┐     ┌─────────────────┐     ┌─────────────┐
│ Developer │     │   Desktop App   │     │ Marketplace │
└─────┬─────┘     └────────┬────────┘     └──────┬──────┘
      │               │              │
      │ plugins       │              │
      │ validate      │              │
      │ ./my-plugin   │              │
      │──────────────►│              │
      │               │ validate     │
      │               │ Package(path)│
      │               │─────────────►│
      │               │ Validation   │
      │               │ Result{passed│
      │               │ ,warnings}   │
      │               │◄─────────────│
      │ Validation    │              │
      │ passed        │              │
      │◄──────────────│              │
      │               │              │
      │ marketplace   │              │
      │ publish       │              │
      │ ./my-plugin   │              │
      │──────────────►│              │
      │               │ runCompliance│
      │               │ Checks       │
      │               │ (package)    │
      │               │─────────────►│
      │               │ Compliance   │
      │               │ Passed       │
      │               │◄─────────────│
      │               │ publish      │
      │               │ (package,    │
      │               │  metadata)   │
      │               │─────────────►│
      │               │ Published    │
      │               │ {listingUrl} │
      │               │◄─────────────│
      │ Published to  │              │
      │ marketplace   │              │
      │◄──────────────│              │
      │               │              │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant DesktopApp as Desktop App (Agent Marketplace)
    participant Market as Marketplace

    Dev->>+DesktopApp: Open Agent Marketplace
    DesktopApp->>+Market: validatePackage(path)
    Market-->>-DesktopApp: ValidationResult{passed, warnings}
    DesktopApp-->>-Dev: Validation passed

    Dev->>+DesktopApp: Open Agent Marketplace → Click "Publish"
    DesktopApp->>+Market: runComplianceChecks(package) (BEH-SF-091)
    Market-->>-DesktopApp: CompliancePassed
    DesktopApp->>+Market: publish(package, metadata)
    Market-->>-DesktopApp: Published{listingUrl}
    DesktopApp-->>-Dev: Published to marketplace
```

### CLI

```text
┌───────────┐     ┌─────┐     ┌─────────────┐
│ Developer │     │ CLI │     │ Marketplace │
└─────┬─────┘     └──┬──┘     └──────┬──────┘
      │               │              │
      │ plugins       │              │
      │ validate      │              │
      │ ./my-plugin   │              │
      │──────────────►│              │
      │               │ validate     │
      │               │ Package(path)│
      │               │─────────────►│
      │               │ Validation   │
      │               │ Result{passed│
      │               │ ,warnings}   │
      │               │◄─────────────│
      │ Validation    │              │
      │ passed        │              │
      │◄──────────────│              │
      │               │              │
      │ marketplace   │              │
      │ publish       │              │
      │ ./my-plugin   │              │
      │──────────────►│              │
      │               │ runCompliance│
      │               │ Checks       │
      │               │ (package)    │
      │               │─────────────►│
      │               │ Compliance   │
      │               │ Passed       │
      │               │◄─────────────│
      │               │ publish      │
      │               │ (package,    │
      │               │  metadata)   │
      │               │─────────────►│
      │               │ Published    │
      │               │ {listingUrl} │
      │               │◄─────────────│
      │ Published to  │              │
      │ marketplace   │              │
      │◄──────────────│              │
      │               │              │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant CLI
    participant Market as Marketplace

    Dev->>+CLI: specforge plugins validate ./my-plugin (BEH-SF-087)
    CLI->>+Market: validatePackage(path)
    Market-->>-CLI: ValidationResult{passed, warnings}
    CLI-->>-Dev: Validation passed

    Dev->>+CLI: specforge marketplace publish ./my-plugin
    CLI->>+Market: runComplianceChecks(package) (BEH-SF-091)
    Market-->>-CLI: CompliancePassed
    CLI->>+Market: publish(package, metadata)
    Market-->>-CLI: Published{listingUrl}
    CLI-->>-Dev: Published to marketplace
```

## Steps

1. Open the Agent Marketplace in the desktop app
2. Validate locally: `specforge plugins validate ./my-plugin` (BEH-SF-087)
3. Run marketplace compliance checks (BEH-SF-091)
4. Publish: `specforge marketplace publish ./my-plugin`
5. System uploads the package and creates the marketplace listing
6. Plugin appears in marketplace search results
7. Track downloads and ratings from the developer dashboard

## Traceability

| Behavior   | Feature     | Role in this capability            |
| ---------- | ----------- | ---------------------------------- |
| BEH-SF-087 | FEAT-SF-032 | Plugin validation and packaging    |
| BEH-SF-091 | FEAT-SF-032 | Marketplace publication compliance |
