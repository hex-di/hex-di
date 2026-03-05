_Previous: [11-interactions.md](11-interactions.md) | Next: [13-filter-and-search.md](13-filter-and-search.md)_

# 12. Educational Features

The Guard Panel integrates educational content to help developers understand authorization concepts, policy patterns, and debugging techniques. Every policy kind, evaluation pattern, and access control paradigm has built-in explanations accessible through the educational sidebar and contextual prompts.

## 12.1 Educational Sidebar

The `[?]` button in the toolbar toggles the educational sidebar overlay. The sidebar width is 320px and slides in from the right.

### Sidebar Structure

```
+-- Educational Sidebar (320px) ---------+
|                                         |
|  [X Close]                              |
|                                         |
|  ┌── Sections ──────────────────────┐  |
|  │ [Glossary]  [Patterns]  [Tours]  │  |
|  └──────────────────────────────────┘  |
|                                         |
|  (Active section content below)         |
|                                         |
+-----------------------------------------+
```

## 12.2 Policy Kind Glossary

Each of the 10 policy kinds has a glossary entry:

### HasPermission (RBAC)

```
┌── hasPermission ──────────────────────────┐
│                                            │
│  🔑 HasPermission                          │
│  Category: RBAC (Role-Based Access Control)│
│                                            │
│  Checks whether the subject has a specific │
│  permission in their permission set.       │
│                                            │
│  Example:                                  │
│    hasPermission(UserPermissions.read)     │
│                                            │
│  Evaluates to:                             │
│    allow — if subject.permissions          │
│            contains "user:read"            │
│    deny  — otherwise                       │
│                                            │
│  Common patterns:                          │
│    • Fine-grained action control           │
│    • Resource-scoped permissions           │
│    • Combined with hasRole for layered ACL │
│                                            │
│  Related:                                  │
│    → hasRole (coarser-grained)             │
│    → allOf(hasRole, hasPermission)         │
└────────────────────────────────────────────┘
```

### Glossary Entries for All 10 Kinds

| Kind                 | Category   | One-Line Description                             |
| -------------------- | ---------- | ------------------------------------------------ |
| hasPermission        | RBAC       | Subject must have a specific permission          |
| hasRole              | RBAC       | Subject must have a specific role                |
| hasAttribute         | ABAC       | Subject attribute must match a condition         |
| hasResourceAttribute | ABAC       | Resource attribute must match a condition        |
| hasSignature         | Compliance | Validated electronic signature required          |
| hasRelationship      | ReBAC      | Subject must have a relationship to the resource |
| allOf                | Compound   | ALL child policies must allow (logical AND)      |
| anyOf                | Compound   | ANY child policy must allow (logical OR)         |
| not                  | Compound   | Inverts child policy result (logical NOT)        |
| labeled              | Wrapper    | Wraps a policy with a human-readable label       |

### Context-Aware Glossary

When the user selects a node in the Policy Evaluation Tree, the glossary auto-scrolls to the relevant entry. The entry header highlights with accent color.

## 12.3 Access Control Pattern Cards

Educational cards explaining common authorization patterns:

### Pattern Card: RBAC (Role-Based Access Control)

```
┌── RBAC Pattern ───────────────────────────┐
│                                            │
│  Role-Based Access Control assigns         │
│  permissions to roles, then roles to       │
│  users. Permissions are never assigned     │
│  directly to users.                        │
│                                            │
│  Policy pattern:                           │
│    hasRole("admin")                        │
│    // or more granular:                    │
│    allOf(hasRole("editor"),                │
│          hasPermission(docs.write))        │
│                                            │
│  Advantages:                               │
│    • Simple mental model                   │
│    • Easy to audit (who has what role?)    │
│    • Scales with organization structure    │
│                                            │
│  When to use:                              │
│    • Static organizational hierarchies     │
│    • Coarse-grained access decisions       │
│    • Compliance requirements (SOX, HIPAA)  │
│                                            │
│  hex-di types:                             │
│    createRole(), createPermission(),       │
│    hasRole(), hasPermission()              │
└────────────────────────────────────────────┘
```

### Available Pattern Cards

| Pattern    | Title                                   | Key Concepts                        |
| ---------- | --------------------------------------- | ----------------------------------- |
| RBAC       | Role-Based Access Control               | Roles, permissions, inheritance     |
| ABAC       | Attribute-Based Access Control          | Attributes, matchers, conditions    |
| ReBAC      | Relationship-Based Access Control       | Graph traversal, ownership, sharing |
| Compound   | Composing Policies with AllOf/AnyOf/Not | Boolean algebra, short-circuiting   |
| Field Mask | Field-Level Visibility                  | visibleFields, intersection, union  |
| Compliance | Electronic Signatures & Audit           | 21 CFR Part 11, signatures, audit   |
| SoD        | Separation of Duties                    | Mutually exclusive roles, conflicts |

## 12.4 Guided Walkthroughs

Interactive tutorials that guide users through panel features:

### Walkthrough 1: "Understanding a Deny Decision"

```
Step 1/5: Find the denial
  → Look at the Decision Log. Click a red "Deny" entry.
  [Highlight: Decision Log tab]

Step 2/5: Read the subject
  → Who was denied? Check the Subject section.
  [Highlight: Subject panel in detail]

Step 3/5: Trace the evaluation
  → Which policy node caused the denial? Look at the Evaluation Trace.
  [Highlight: Trace section, red nodes]

Step 4/5: View in tree
  → Click "View in Tree" to see the full policy tree with this evaluation.
  [Highlight: "View in Tree" button]

Step 5/5: Understand the tree
  → The red node is where denial occurred. Green nodes passed.
  Gray dashed nodes were short-circuited.
  [Highlight: deny node in tree]
```

### Available Walkthroughs

| #   | Title                          | Steps | Views Used       |
| --- | ------------------------------ | ----- | ---------------- |
| 1   | Understanding a Deny Decision  | 5     | Log, Tree        |
| 2   | How Compound Policies Work     | 4     | Tree, Paths      |
| 3   | Analyzing Access Patterns      | 5     | Sankey, Overview |
| 4   | Debugging Slow Evaluations     | 4     | Timeline         |
| 5   | Understanding Role Inheritance | 5     | Roles            |
| 6   | Simulating "What-If" Scenarios | 4     | Paths            |
| 7   | Auditing Access Decisions      | 5     | Log, Overview    |

### Walkthrough UI

```
┌── Walkthrough ────────────────────────────┐
│  Understanding a Deny Decision             │
│  Step 2 of 5                               │
│                                            │
│  Who was denied? Check the Subject section │
│  in the detail panel. The subject's roles  │
│  and permissions determine which policies  │
│  evaluate to allow or deny.                │
│                                            │
│  ┌────────────────────────┐               │
│  │ [<< Back]  [Next >>]  │               │
│  │ [Skip tour]           │               │
│  └────────────────────────┘               │
└────────────────────────────────────────────┘
```

### Walkthrough Highlights

During a walkthrough, relevant UI elements are highlighted:

- Target element gets a pulsing accent border
- Rest of UI dims to 40% opacity
- Arrow pointer from walkthrough step to target element
- Click anywhere outside the target dismisses the highlight

## 12.5 Contextual Learning Prompts

Non-intrusive learning prompts triggered by user actions:

| Trigger                                | Prompt                                                                                        |
| -------------------------------------- | --------------------------------------------------------------------------------------------- |
| First deny decision viewed             | "Denials trace back to a specific policy node. Click 'View in Tree' to see which one."        |
| First compound policy tree viewed      | "AllOf requires ALL children to allow. AnyOf requires ANY. Click a node to learn more."       |
| First short-circuited node seen        | "Gray dashed nodes were short-circuited -- AnyOf found an allow, so remaining nodes skipped." |
| First async evaluation timeline viewed | "Blue bars show async resolver time. This is often the bottleneck in evaluations."            |
| First role with inheritance viewed     | "Roles inherit permissions from parent roles. Click to see the flattened permission list."    |
| High deny rate detected (> 20%)        | "This port has a high deny rate. Consider reviewing the policy or subject configuration."     |
| Circular inheritance detected          | "Circular role inheritance detected. This will cause ACL002 errors. Review the role DAG."     |

### Prompt Display

```
┌── Did you know? ────────────────────────────────────────┐
│ 💡 AllOf requires ALL children to allow. AnyOf requires │
│    ANY child to allow. Click a node to learn more.      │
│                                          [Got it] [?]   │
└──────────────────────────────────────────────────────────┘
```

- Appears at bottom of the active view
- Auto-dismisses after 10 seconds
- "Got it" marks as seen (won't show again)
- "?" opens the full glossary entry for the topic
- Maximum 1 prompt visible at a time

### Prompt Frequency

- Each prompt shown at most once per session
- Prompts suppressed after user completes the related walkthrough
- User can disable prompts: `hex-guard-prompts-enabled: false` in localStorage

## 12.6 What-If Subject Simulation

The what-if simulation (integrated in the Policy Path Explorer, see [Section 6.6](06-policy-path-explorer.md)) serves as an interactive educational tool:

### Learning Scenarios

| Scenario                              | Setup                               | Teaches                                 |
| ------------------------------------- | ----------------------------------- | --------------------------------------- |
| "What if subject has no roles?"       | Empty roles, empty permissions      | Role-based denial behavior              |
| "What if subject has admin role?"     | Add "admin" role only               | Role inheritance and permission spread  |
| "What if attribute doesn't match?"    | Set attribute to mismatching value  | ABAC evaluation and matcher behavior    |
| "What if relationship doesn't exist?" | No relationship resolver configured | ReBAC denial and missing resolver error |

### Simulation Feedback

When the simulated result differs from the previously observed result:

```
┌── Simulation Result ──────────────────────────────────┐
│ Previous: ○ DENY (with subject bob, roles: ["viewer"])│
│ Simulated: ● ALLOW (with added role "admin")          │
│                                                        │
│ What changed:                                          │
│   + HasRole "admin": deny → allow                     │
│   + Path changed from #4 to #1                        │
│                                                        │
│ Insight: Adding the "admin" role grants access because │
│ the AllOf policy requires hasRole("admin") to pass.    │
└────────────────────────────────────────────────────────┘
```

## 12.7 Matcher Expression Reference

For HasAttribute and HasResourceAttribute policies, the educational sidebar includes a matcher reference:

| Matcher      | Syntax                | Description                       | Example                      |
| ------------ | --------------------- | --------------------------------- | ---------------------------- |
| `eq`         | `eq(value)`           | Exact equality                    | `eq("engineering")`          |
| `neq`        | `neq(value)`          | Not equal                         | `neq("guest")`               |
| `in`         | `inArray(values)`     | Value in array                    | `inArray(["US","EU"])`       |
| `exists`     | `exists()`            | Attribute exists (not null/undef) | `exists()`                   |
| `gte`        | `gte(n)`              | Greater than or equal             | `gte(5)`                     |
| `lt`         | `lt(n)`               | Less than                         | `lt(100)`                    |
| `contains`   | `contains(value)`     | Array/string contains             | `contains("admin")`          |
| `someMatch`  | `someMatch(matcher)`  | Any array element matches         | `someMatch(eq("admin"))`     |
| `everyMatch` | `everyMatch(matcher)` | All array elements match          | `everyMatch(gte(0))`         |
| `fieldMatch` | `fieldMatch(f, m)`    | Nested field matches              | `fieldMatch("org", eq("A"))` |
| `size`       | `size(matcher)`       | Array/string length matches       | `size(gte(1))`               |

## 12.8 Error Code Reference

Quick reference for guard error codes surfaced in the panel:

| Code   | Name                        | Explanation                                   |
| ------ | --------------------------- | --------------------------------------------- |
| ACL001 | AccessDenied                | Policy evaluation resulted in deny            |
| ACL002 | CircularRoleInheritance     | Role inheritance forms a cycle                |
| ACL003 | PolicyEvaluationError       | Unexpected error during evaluation            |
| ACL018 | AttributeResolveError       | Attribute resolver failed                     |
| ACL022 | RelationshipResolveError    | Relationship resolver failed                  |
| ACL023 | CircuitOpen                 | Circuit breaker is open (too many failures)   |
| ACL026 | AttributeResolveTimeout     | Attribute resolver exceeded timeout           |
| ACL028 | RelationshipResolverMissing | No resolver configured for relationship check |

Each error code links to the full documentation in the educational sidebar.

_Previous: [11-interactions.md](11-interactions.md) | Next: [13-filter-and-search.md](13-filter-and-search.md)_
