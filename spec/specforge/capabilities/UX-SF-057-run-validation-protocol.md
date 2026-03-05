---
id: UX-SF-057
kind: capability
title: "Run Validation Protocol (IQ/OQ/PQ)"
status: active
features: [FEAT-SF-021]
behaviors: [BEH-SF-370, BEH-SF-375]
persona: [compliance-officer]
surface: [desktop, cli]
---

# Run Validation Protocol (IQ/OQ/PQ)

## Use Case

A compliance officer opens the Validation Protocols in the desktop app. Each protocol runs a predefined set of checks, records results with electronic signatures, and produces a validation report. The same operation is accessible via CLI (`specforge compliance validate --protocol IQ`) for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌──────────────────┐ ┌─────────────────┐ ┌──────────────┐
│Compliance Officer│ │   Desktop App   │ │ProtocolEngine│
└────────┬─────────┘ └────────┬────────┘ └──────┬───────┘
         │               │          │
         │ validate --protocol IQ   │
         │──────────────►│          │
         │               │ loadProtocol("IQ")
         │               │─────────►│
         │               │ Protocol{checks}
         │               │◄─────────│
         │               │          │
         │               │ [loop: each check]
         │               │ executeCheck()
         │               │─────────►│
         │               │ CheckResult
         │               │◄─────────│
         │               │ [end loop]
         │               │          │
         │ 12/14 passed  │          │
         │◄──────────────│          │
         │               │          │
         │ Review + sign off        │
         │──────────────►│          │
         │               │ recordSignature()
         │               │─────────►│
         │               │ Signed   │
         │               │◄─────────│
         │ Report generated         │
         │◄──────────────│          │
         │               │          │
```

```mermaid
sequenceDiagram
    actor CO as Compliance Officer
    participant DesktopApp as Desktop App (Validation Protocols)
    participant Protocol as ProtocolEngine

    CO->>+DesktopApp: specforge compliance validate --protocol IQ
    DesktopApp->>+Protocol: loadProtocol("IQ") (BEH-SF-370)
    Protocol-->>-DesktopApp: Protocol{checks, acceptanceCriteria}

    loop Each check in protocol
        DesktopApp->>+Protocol: executeCheck(check) (BEH-SF-375)
        Protocol-->>-DesktopApp: CheckResult{pass/fail, evidence}
    end

    DesktopApp-->>-CO: Protocol complete: 12/14 checks passed

    CO->>+DesktopApp: Review results and sign off
    DesktopApp->>+Protocol: recordSignature(protocolId, signature)
    Protocol-->>-DesktopApp: Signed
    DesktopApp-->>-CO: Validation report generated
```

### CLI

```text
┌──────────────────┐ ┌─────┐ ┌──────────────┐
│Compliance Officer│ │ CLI │ │ProtocolEngine│
└────────┬─────────┘ └──┬──┘ └──────┬───────┘
         │               │          │
         │ validate --protocol IQ   │
         │──────────────►│          │
         │               │ loadProtocol("IQ")
         │               │─────────►│
         │               │ Protocol{checks}
         │               │◄─────────│
         │               │          │
         │               │ [loop: each check]
         │               │ executeCheck()
         │               │─────────►│
         │               │ CheckResult
         │               │◄─────────│
         │               │ [end loop]
         │               │          │
         │ 12/14 passed  │          │
         │◄──────────────│          │
         │               │          │
         │ Review + sign off        │
         │──────────────►│          │
         │               │ recordSignature()
         │               │─────────►│
         │               │ Signed   │
         │               │◄─────────│
         │ Report generated         │
         │◄──────────────│          │
         │               │          │
```

```mermaid
sequenceDiagram
    actor CO as Compliance Officer
    participant CLI
    participant Protocol as ProtocolEngine

    CO->>+CLI: specforge compliance validate --protocol IQ
    CLI->>+Protocol: loadProtocol("IQ") (BEH-SF-370)
    Protocol-->>-CLI: Protocol{checks, acceptanceCriteria}

    loop Each check in protocol
        CLI->>+Protocol: executeCheck(check) (BEH-SF-375)
        Protocol-->>-CLI: CheckResult{pass/fail, evidence}
    end

    CLI-->>-CO: Protocol complete: 12/14 checks passed

    CO->>+CLI: Review results and sign off
    CLI->>+Protocol: recordSignature(protocolId, signature)
    Protocol-->>-CLI: Signed
    CLI-->>-CO: Validation report generated
```

## Steps

1. Open the Validation Protocols in the desktop app
2. System loads the protocol definition (checks, acceptance criteria) (BEH-SF-370)
3. Each check executes in sequence, recording pass/fail with evidence (BEH-SF-375)
4. Failures are recorded but do not halt the protocol (all checks run)
5. At completion, compliance officer reviews results and signs off
6. Electronic signature is recorded with the validation record
7. Validation report is generated automatically

## Decision Paths

```text
    ┌──────────────────────────┐
    │  Run validation protocol │
    └────────────┬─────────────┘
                 ▼
    ┌──────────────────────────┐
    │   Load protocol checks   │
    └────────────┬─────────────┘
                 ▼
    ┌──────────────────────────┐
    │ Execute all checks       │
    │ sequentially             │
    └────────────┬─────────────┘
                 ▼
          ╱─────────────╲
         ╱ All checks    ╲
        ╱  passed?        ╲
        ╲                 ╱
         ╲               ╱
          ╲─────────────╱
          Yes │     │ No
              ▼     │
  ┌───────────────┐ │
  │Sign off on    │ │
  │protocol       │ │
  └───────┬───────┘ │
          ▼         │
  ┌───────────────┐ │
  │ PASSED        │ │
  └───────────────┘ │
                    ▼
        ┌───────────────────┐
        │Review failed      │
        │checks             │
        └─────────┬─────────┘
                  ▼
           ╱────────────╲
          ╱  Failures    ╲
         ╱   acceptable?  ╲
         ╲                ╱
          ╲              ╱
           ╲────────────╱
     Yes, with  │    │ No
   justification│    │
                ▼    │
  ┌──────────────┐   │
  │Sign off with │   │
  │deviations    │   │
  └──────┬───────┘   │
         ▼           ▼
  ┌──────────────┐ ┌──────────────────┐
  │ PASSED with  │ │ FAILED,          │
  │ deviations   │ │ remediation      │
  └──────────────┘ │ needed           │
                   └──────────────────┘
```

```mermaid
flowchart TD
    A[Run validation protocol] --> B[Load protocol checks]
    B --> C[Execute all checks sequentially]
    C --> D{All checks passed?}
    D -->|Yes| E[Sign off on protocol]
    E --> F([Validation report: PASSED])
    D -->|No| G[Review failed checks]
    G --> H{Failures acceptable?}
    H -->|Yes, with justification| I[Sign off with deviations noted]
    I --> J([Validation report: PASSED with deviations])
    H -->|No| K([Validation report: FAILED, remediation needed])
```

## Traceability

| Behavior   | Feature     | Role in this capability                              |
| ---------- | ----------- | ---------------------------------------------------- |
| BEH-SF-370 | FEAT-SF-021 | GxP validation protocol infrastructure               |
| BEH-SF-375 | FEAT-SF-021 | Protocol execution, evidence recording, and sign-off |
