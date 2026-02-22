# 13 - Glossary

> **Document Control**
>
> | Property | Value |
> |----------|-------|
> | Document ID | GXP-CC-13 |
> | Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/cross-cutting/gxp/13-glossary.md` |
> | Status | Effective |
> | Classification | Cross-Cutting GxP Framework |

---

## Purpose

This glossary defines the technical and regulatory terms used throughout the `@hex-di` GxP compliance documentation. It is intended for non-technical regulatory reviewers, auditors, and quality assurance personnel who may not be familiar with the software-specific terminology.

Per-package compliance documents may define additional package-specific terms.

---

## Technical Terms

| Term | Definition |
|------|-----------|
| **Adapter** | A concrete implementation of a port interface. For example, `SystemClockAdapter` implements `ClockPort` using platform timing APIs. Multiple adapters may exist for the same port (e.g., production vs. testing). |
| **Branded type (phantom)** | A TypeScript pattern where a plain type (e.g., `number`) is intersected with a unique symbol brand to create a nominally distinct type at compile time with zero runtime cost. Used to prevent cross-domain type misuse. |
| **DI container** | Dependency Injection container. A runtime system that manages the creation and distribution of objects (services, adapters) in an application. |
| **Frozen object** | A JavaScript object on which `Object.freeze()` has been called. Properties cannot be added, removed, or modified at runtime. Provides runtime immutability (not cryptographic tamper-evidence). |
| **Hexagonal architecture** | A software architecture pattern (also called Ports and Adapters) where the application core communicates with the outside world through defined interfaces (ports), with concrete implementations (adapters) plugged in at runtime. |
| **Injectable** | A design pattern where dependencies are provided to a component from the outside rather than being hard-coded. |
| **ISO 8601** | International standard for date and time representation (e.g., `2026-02-14T12:00:00.000Z`). The `Z` suffix denotes UTC timezone. |
| **Monotonic time** | A time source that only moves forward and is never adjusted backward. Immune to NTP corrections or manual clock adjustments. |
| **Mutation testing** | A software testing technique that introduces small changes (mutations) to source code and verifies that existing tests detect and fail on each mutation. Measured as a mutation score (percentage of mutations killed). |
| **Port** | An interface that defines a contract for a capability without specifying how it is implemented. Ports are the boundary between the application's core logic and its external dependencies. |
| **Result type** | A discriminated union type (`Result<T, E>`) that represents either success (`ok(value)`) or failure (`err(error)`). All fallible operations return `Result` instead of throwing exceptions. |
| **Schema version** | A version field included in serialized records enabling forward-compatible deserialization across library upgrades. |
| **SHA-256** | A cryptographic hash function producing a 256-bit digest. Used for per-record tamper-evidence hashing. |
| **Wall-clock time** | Calendar time as displayed on a wall clock, representing the current date and time. Subject to NTP corrections and manual adjustments. |

---

## Regulatory Terms

| Term | Definition | Reference |
|------|-----------|-----------|
| **21 CFR Part 11** | US FDA regulation governing electronic records and electronic signatures in pharmaceutical and medical device industries. | FDA, Code of Federal Regulations Title 21 Part 11 |
| **ALCOA+** | Data integrity framework: Attributable, Legible, Contemporaneous, Original, Accurate (ALCOA) plus Complete, Consistent, Enduring, Available. | WHO, PIC/S, FDA guidance documents |
| **CAPA** | Corrective and Preventive Action. A systematic process for investigating non-conformances and implementing corrective/preventive actions. | 21 CFR 820.90, ICH Q10 |
| **CSV** | Computerized System Validation. The documented process of establishing evidence that a computerized system meets its intended purpose. | EU GMP Annex 11, GAMP 5 |
| **DQ** | Deployment Qualification. Verification that infrastructure meets requirements for correct system operation. | Local convention per GAMP 5 |
| **Electronic record** | Any digital information created, modified, maintained, archived, retrieved, or distributed by a computer system. | 21 CFR 11.3(b)(6) |
| **Electronic signature** | A computer data compilation executed, adopted, or authorized by an individual to be the legally binding equivalent of a handwritten signature. | 21 CFR 11.3(b)(7) |
| **EU GMP Annex 11** | European Union Good Manufacturing Practice guideline for computerised systems in pharmaceutical manufacturing. | European Commission, EudraLex Volume 4 Annex 11 |
| **FMEA** | Failure Mode and Effects Analysis. A systematic method for identifying potential failure modes and prioritizing them by Risk Priority Number (RPN = S x O x D). | ICH Q9, GAMP 5 |
| **GAMP 5** | Good Automated Manufacturing Practice, version 5. A risk-based framework for computerized system validation. Categorizes software into Categories 1-5. | ISPE GAMP 5 Guide |
| **GxP** | General abbreviation for "Good x Practice" regulations and guidelines (GMP, GLP, GCP, GDP, etc.) governing pharmaceutical, biotechnology, and medical device industries. | FDA, EMA, WHO |
| **ICH Q7** | International Council for Harmonisation guideline on GMP for Active Pharmaceutical Ingredients. Section 6.5 covers equipment calibration. | ICH Q7 |
| **ICH Q9** | International Council for Harmonisation guideline on Quality Risk Management. Defines principles and tools for assessing and managing quality risks. | ICH Q9 |
| **IQ** | Installation Qualification. Documented verification that a system is installed correctly and according to specification. | GAMP 5, EU GMP Annex 11 |
| **OQ** | Operational Qualification. Documented verification that a system operates correctly under representative conditions. | GAMP 5, EU GMP Annex 11 |
| **PQ** | Performance Qualification. Documented verification that a system performs acceptably under sustained real-world conditions. | GAMP 5, EU GMP Annex 11 |
| **RFC 2119** | IETF standard defining requirement-level keywords (MUST, SHOULD, MAY, etc.) in specification documents. | IETF RFC 2119 |
| **RPN** | Risk Priority Number. A numerical score (1-1000) calculated as Severity x Occurrence x Detection in an FMEA. | ICH Q9 |
| **RTM** | Requirements Traceability Matrix. A document mapping regulatory requirements to specifications, implementations, and tests. | EU GMP Annex 11 §4, GAMP 5 Appendix M4 |
| **SOP** | Standard Operating Procedure. A documented procedure for performing a specific task consistently. | 21 CFR 211, EU GMP |
| **SQA** | Supplier Quality Agreement. A bilateral agreement between a GxP organization and a software supplier defining quality commitments. | EU GMP Annex 11 §5 |
| **Validation plan** | A documented strategy for establishing that a computerized system meets its intended use, including IQ/OQ/PQ scope and regulatory evidence collection. | EU GMP Annex 11 §4, GAMP 5 |
