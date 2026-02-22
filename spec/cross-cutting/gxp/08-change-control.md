# 08 - Change Control

> **Document Control**
>
> | Property | Value |
> |----------|-------|
> | Document ID | GXP-CC-08 |
> | Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/cross-cutting/gxp/08-change-control.md` |
> | Status | Effective |
> | Classification | Cross-Cutting GxP Framework |

---

## Purpose

EU GMP Annex 11, Section 10 and 21 CFR 11.10(j) require documented change control procedures for computerized systems. This section defines the change control framework applicable to all `@hex-di` packages deployed in GxP environments.

---

## Change Classification

| Change Type | Description | Approval Required | Re-Qualification Scope |
|------------|-----------|-------------------|----------------------|
| **Critical** | Changes affecting data integrity, patient safety, or audit trail behavior | QA Manager + Regulatory Affairs | Full DQ + IQ + OQ + PQ |
| **Major** | Changes affecting functional behavior documented in specifications | QA Reviewer | Full IQ + OQ; PQ if performance-relevant |
| **Minor** | Documentation corrections, non-functional improvements, dependency updates | QA Reviewer | IQ + targeted OQ for affected areas |
| **Administrative** | Typo fixes, comment updates, formatting changes with no behavior impact | Developer peer review | None (but version pin update required) |

---

## Standard Change Control Procedure

### Version Pinning

```
REQUIREMENT: GxP deployments MUST use exact version pinning for all @hex-di packages.
             Caret (^) and tilde (~) ranges are prohibited. The exact version MUST be
             documented in both package.json and the committed lock file.

REQUIREMENT: The lock file (pnpm-lock.yaml or package-lock.json) MUST be committed
             to version control. Any modification to the lock file is a change control
             event.
```

### Change Control Record

```
REQUIREMENT: Every change to a validated @hex-di package in a GxP deployment MUST be
             documented in a change control record containing:

             (a) Change identifier (unique, sequential)
             (b) Date of change request
             (c) Requestor identity
             (d) Change classification (Critical / Major / Minor / Administrative)
             (e) Description of change (what is changing and why)
             (f) Impact assessment (which specifications, tests, and deployment
                 configurations are affected)
             (g) Risk assessment (severity and likelihood of adverse effects)
             (h) Approver identity and approval date
             (i) Implementation evidence (Git commit SHA, PR reference)
             (j) Re-qualification results (IQ/OQ/PQ execution summary)
             (k) Closure date and closure approver
```

### SemVer-to-Revalidation Mapping

| SemVer Change | Implied Impact | Default Re-Qualification |
|--------------|---------------|-------------------------|
| **Patch** (x.y.Z) | Bug fix only, no behavior change | IQ + targeted OQ for fixed behavior |
| **Minor** (x.Y.z) | New features, no breaking changes | Full IQ + OQ |
| **Major** (X.y.z) | Breaking changes, removed APIs | Full DQ + IQ + OQ + PQ |

```
REQUIREMENT: The SemVer-to-revalidation mapping above is the minimum default scope.
             Organizations MUST review the changelog for each version change and
             increase the re-qualification scope if the actual change impact exceeds
             what the SemVer category implies.
```

---

## Emergency Change Control

### Emergency Criteria

An emergency change is justified ONLY when ALL of the following conditions are met:

1. A confirmed defect is actively causing or imminently threatening data integrity compromise, patient safety risk, or regulatory non-compliance in a production GxP environment
2. The standard change control timeline (including QA review and pre-deployment re-qualification) would result in unacceptable continued risk
3. No compensating control (e.g., temporary workaround, manual procedure, system quarantine) can adequately mitigate the risk during the standard change timeline

```
REQUIREMENT: Emergency changes MUST be authorized by the QA Manager (or designated
             authority). The authorization MUST be documented with: the authorizer's
             identity, the date/time of authorization, the specific risk justification,
             and the scope of the emergency change.
```

### Emergency Change Procedure

| Step | Action | Responsible | Timeline |
|------|--------|-------------|----------|
| 1 | Identify and document the emergency condition | Discoverer | Immediate |
| 2 | Notify QA Manager and affected stakeholders | Discoverer | Within 1 hour |
| 3 | QA Manager authorizes emergency change | QA Manager | Within 4 hours |
| 4 | Implement fix with documented rationale | Developer | Per urgency |
| 5 | Execute abbreviated testing (critical paths only) | Validation Engineer | Before deployment |
| 6 | Deploy with temporary risk acceptance | Infrastructure Operator | Per urgency |
| 7 | Retrospective full re-qualification | Validation Engineer | Within 30 days |
| 8 | Post-emergency review and CAPA initiation | QA Manager | Within 14 days |

### Retrospective Qualification

```
REQUIREMENT: Emergency changes that bypass standard re-qualification MUST undergo
             full retrospective IQ/OQ/PQ within 30 calendar days of deployment. If
             retrospective qualification reveals a failure, the emergency fix MUST be
             treated as a deviation and subject to CAPA.

REQUIREMENT: All records generated between the emergency deployment and the
             completion of retrospective qualification MUST be retained and annotated
             with the emergency change context. These records are NOT invalidated by
             the retrospective qualification — they represent the system's actual
             operational state during the emergency period.
```

### Post-Emergency Review

```
REQUIREMENT: A post-emergency review MUST be conducted within 14 calendar days of
             the emergency change. The review MUST address:

             (a) Root cause analysis of the original defect
             (b) Effectiveness of the emergency fix
             (c) Whether the standard change control process has a gap that allowed
                 the defect to reach production
             (d) CAPA items to prevent recurrence
             (e) Training gaps revealed by the emergency (trigger incident-driven
                 re-training per the personnel qualification framework)
```

---

## CAPA Process (Corrective and Preventive Action)

### CAPA Initiation Triggers

| Trigger | CAPA Required | Justification |
|---------|--------------|---------------|
| Emergency change control | Yes | Any emergency change indicates a process gap |
| IQ/OQ/PQ failure | Yes | Qualification failure indicates specification or implementation gap |
| Regulatory audit finding | Yes | External findings require documented corrective action |
| Internal quality deviation | Per risk assessment | QA Reviewer determines based on severity |

### CAPA Record Template

| Field | Description |
|-------|-----------|
| CAPA ID | Unique identifier (CAPA-PKG-YYYY-NNN) |
| Initiation date | Date CAPA was opened |
| Root cause | Documented root cause analysis |
| Corrective action | Actions to address the immediate issue |
| Preventive action | Actions to prevent recurrence |
| Responsible person | Owner of each action item |
| Target completion date | Deadline for each action item |
| Verification evidence | How completion will be verified |
| Closure date | Date CAPA was closed after verification |
| Closure approver | QA authority who approved closure |

### CAPA Deadline Extensions

```
REQUIREMENT: CAPA deadline extensions MUST be authorized by the QA Manager with
             documented justification. The extension record MUST include: the original
             deadline, the new deadline, the reason for extension, and any interim
             compensating controls.
```
