---
sidebar_position: 1
title: Introduction
---

# Guard

A policy-based authorization library for TypeScript applications, featuring composable policies, audit trails, and deep integration with dependency injection.

## Overview

`@hex-di/guard` provides a comprehensive authorization solution that goes beyond simple role-based access control. With 10 composable policy kinds, full audit trail support, and seamless DI integration, it's designed for applications that need fine-grained, auditable authorization decisions.

Key features:

- **Branded nominal permissions** using `Symbol.for()` for cross-boundary identity
- **DAG-based role inheritance** with automatic permission flattening and cycle detection
- **Serializable policies** that can be stored, transmitted, and introspected
- **Full evaluation traces** for debugging and audit compliance
- **GxP-ready infrastructure** including write-ahead logging and meta-audit trails
- **React integration** with Suspense-aware hooks

## Installation

```bash
npm install @hex-di/guard
```

For testing utilities:

```bash
npm install --save-dev @hex-di/guard-testing
```

For React integration:

```bash
npm install @hex-di/guard-react
```

## Quick Start

Here's a complete example showing permissions, roles, policies, and evaluation:

```typescript
import {
  createPermission,
  createRole,
  hasPermission,
  hasRole,
  allOf,
  anyOf,
  not,
  hasAttribute,
  evaluate,
  createAuthSubject,
} from "@hex-di/guard";

// 1. Define permissions - branded nominal tokens
const ReadUsers = createPermission("ReadUsers");
const WriteUsers = createPermission("WriteUsers");
const DeleteUsers = createPermission("DeleteUsers");

// 2. Create roles with inheritance
const ViewerRole = createRole("Viewer", {
  permissions: [ReadUsers],
});

const EditorRole = createRole("Editor", {
  permissions: [WriteUsers],
  inherits: [ViewerRole], // Inherits ReadUsers
});

const AdminRole = createRole("Admin", {
  permissions: [DeleteUsers],
  inherits: [EditorRole], // Inherits ReadUsers + WriteUsers
});

// 3. Compose policies using combinators
const canEditActiveUsers = allOf(
  hasPermission(WriteUsers),
  not(hasAttribute("status", "suspended"))
);

const canAccessAsStaff = anyOf(hasRole(AdminRole), hasRole(EditorRole));

// 4. Create a subject with permissions, roles, and attributes
const subject = createAuthSubject({
  id: "user-123",
  roles: [EditorRole],
  permissions: [], // EditorRole provides permissions
  attributes: {
    department: "engineering",
    status: "active",
  },
});

// 5. Evaluate policies against the subject
const decision = evaluate(canEditActiveUsers, subject);

if (decision.granted) {
  console.log("Access granted!");
  // Use decision.visibleFields if field-level visibility is configured
} else {
  console.log("Access denied:", decision.reason);
  // Inspect decision.trace to understand why
}

// The decision includes full debugging information
console.log("Evaluation took:", decision.durationMs, "ms");
console.log("Trace:", decision.trace); // Recursive tree of all checks
```

## Core Concepts

The library is organized into five layers:

1. **[Permissions](concepts/permissions)** - Branded nominal tokens for atomic authorization units
2. **[Roles](concepts/roles)** - Permission aggregation with DAG-based inheritance
3. **[Policies](concepts/policies)** - Composable constraints using algebraic combinators
4. **[Evaluation](concepts/evaluation)** - Pure functions that produce traceable decisions
5. **[Subjects](concepts/subjects)** - Identity carriers with permissions, roles, and attributes

## Next Steps

- Explore [Core Concepts](concepts/permissions) to understand the foundational patterns
- Learn about [DI Integration](guides/di-integration) for automatic policy enforcement
- Set up [Testing](testing) with memory adapters and conformance suites
- Add [React Integration](react) for UI-level authorization
- Review [GxP Infrastructure](advanced/gxp) for regulated environments
