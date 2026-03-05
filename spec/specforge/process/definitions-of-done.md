---
id: PROC-SF-003
kind: process
title: Definitions of Done
status: active
---

# Definitions of Done

Completion criteria per behavior file and document type.

---

## Behavior File DoD

A behavior file is complete when:

- [ ] Every BEH-SF-NNN in its allocation range is defined
- [ ] Each behavior has a **Contract** section with a formal REQUIREMENT statement
- [ ] Each behavior has a **Verification** section describing how to test it
- [ ] File header links to relevant invariants, ADRs, and type files
- [ ] All cross-references resolve to existing files
- [ ] No duplicate BEH-SF-NNN IDs exist across the entire `behaviors/` directory

---

## Architecture Diagram DoD

An architecture file is complete when:

- [ ] Contains a Mermaid diagram in a ` ```mermaid ` code block
- [ ] Contains an ASCII fallback representation
- [ ] **C4 cross-level consistency:** every element that appears at level N also appears at level N-1
  - C2 containers appear in C1 as part of the system boundary
  - C3 components appear in C2 as part of the container
- [ ] Scope and elements are documented in the file header
- [ ] Cross-references to related diagrams and behavior files are present

---

## Type File DoD

A type file is complete when:

- [ ] All TypeScript interfaces use `readonly` fields
- [ ] All error types have a unique `_tag` discriminant
- [ ] Source chapter attribution is present
- [ ] Cross-references to behavior files that use these types
- [ ] No duplicate type definitions across `types/` files

---

## UI View File DoD

A UI view file is complete when:

- [ ] ASCII wireframe shows layout structure
- [ ] Interactions table covers all user actions
- [ ] States table covers all view states with visual indicators
- [ ] Error states table covers relevant failure scenarios
- [ ] Loading states table covers async scenarios
- [ ] Hook and data source attributions are present

---

## Governance File DoD

A governance file (traceability, risk assessment, roadmap) is complete when:

- [ ] All referenced IDs exist in their source files
- [ ] No broken cross-references
- [ ] Consistent formatting with the rest of the spec
