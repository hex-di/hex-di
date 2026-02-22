# 02 - GAMP 5 Classification

> **Document Control**
>
> | Property | Value |
> |----------|-------|
> | Document ID | GXP-CC-02 |
> | Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/cross-cutting/gxp/02-gamp5-classification.md` |
> | Status | Effective |
> | Classification | Cross-Cutting GxP Framework |

---

## GAMP 5 Software Categories

GAMP 5 (Good Automated Manufacturing Practice, Version 5) provides a risk-based framework for categorizing software used in GxP-regulated environments. The category determines the validation burden — higher categories require more extensive testing and documentation.

### Category Definitions

| Category | Name | Description | Validation Burden |
|----------|------|-------------|-------------------|
| **1** | Infrastructure Software | Operating systems, databases, middleware | Verify installation, confirm version, documented evidence of suitability |
| **2** | _(Retired)_ | Previously "firmware" — merged into other categories in GAMP 5 | N/A |
| **3** | Non-Configured COTS | Commercial off-the-shelf software used as-is without configuration | Verify installation, confirm version, test intended use |
| **4** | Configured COTS | Commercial software configured (not coded) to meet user requirements | Configuration documentation, functional testing of configured behavior |
| **5** | Custom Application | Software developed to meet specific user requirements | Full lifecycle: all specification levels (URS→FS→DS→CS), complete testing (IQ/OQ/PQ) |

### Classification Guidance for @hex-di Libraries

Each `@hex-di` library's GAMP 5 classification depends on how the consuming organization deploys it.

#### Category 3 — Consumed As-Is from npm

When consumed from npm without modification:

- The library has no user-configurable parameters — behavior is fixed by the source code
- All public APIs are documented in behavior specifications
- Runtime invariants are formally specified
- Architecture Decision Records document design rationale
- Zero or minimal production dependencies, minimizing supply chain risk

**Validation burden**: Verify installation, confirm version, test intended use in the consuming system's context.

#### Category 5 — Forked or Modified

When source code is forked or modified:

- The organization assumes full responsibility for the modified code
- All specification levels (URS, FS, DS, CS) apply to the modifications
- Full IQ/OQ/PQ lifecycle required for the modified version
- The organization becomes the de facto supplier for the modified version

#### Category 3 within Parent System

When used as a dependency in a validated system:

- Document the exact library version in the parent system's Configuration Specification
- Verify library behavior in the context of the parent system
- Library version changes are change control events for the parent system

### Category 3 Justification Template

Per-package compliance documents provide a Category 3 justification. The justification MUST address each of the following points:

```
REQUIREMENT: The GAMP 5 Category 3 justification for any @hex-di library MUST include:

             (a) Confirmation that the library is consumed as-is from npm (no source
                 code modifications)
             (b) Identification of all configurable parameters (if any) and confirmation
                 that they do not change the library's fundamental behavior
             (c) Reference to the formal specification suite (behavior specs, invariants,
                 ADRs) as evidence of documented behavior
             (d) The number of production dependencies and supply chain risk assessment
             (e) Reference to the IQ/OQ/PQ protocols that verify intended use
```

### Validation Lifecycle by Category

| Phase | Category 3 | Category 5 |
|-------|-----------|-----------|
| **URS (User Requirements)** | Documented in consuming system's URS | Full URS for the library |
| **FS (Functional Specification)** | Library's behavior specs serve as FS reference | Full FS required |
| **DS (Design Specification)** | Library's architecture documentation serves as DS reference | Full DS required |
| **CS (Configuration Specification)** | Version pin + lock file | Full CS for all parameters |
| **IQ** | Package installation, version, export surface verification | Full IQ per specification |
| **OQ** | Operational behavior in consuming system's context | Full OQ per specification |
| **PQ** | Performance under consuming system's production conditions | Full PQ per specification |

---

## Configuration Specification (CS) Guidance

### Category 3 — No Library-Level CS

Libraries with no configurable parameters have no library-level Configuration Specification. The consumer documents the validated library version and any integration configuration in their system-level CS.

### Consumer CS Template

The following template lists the minimum fields a consumer SHOULD document in their system-level Configuration Specification when integrating an `@hex-di` library:

| Field | Example Value | Notes |
|-------|---------------|-------|
| Library name | `@hex-di/<package>` | npm package name |
| Validated version | `1.2.3` | Exact version (no caret/tilde); matches `package.json` and lock file |
| Lock file committed | Yes / No | `pnpm-lock.yaml` or `package-lock.json` must be committed |
| GAMP 5 category | Category 3 (non-configured COTS) | Category 5 if source code has been modified |
| IQ execution date | _YYYY-MM-DD_ | Date of last IQ execution |
| OQ execution date | _YYYY-MM-DD_ | Date of last OQ execution |
| PQ execution date | _YYYY-MM-DD_ | Date of last PQ execution |

> **Scope**: This template covers the library integration configuration only. The consumer's full system-level CS will include additional fields for other components, infrastructure, and application-specific configuration per their QMS.
