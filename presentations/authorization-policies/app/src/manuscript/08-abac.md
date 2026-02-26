# 08 — Attribute-Based Access Control (ABAC)

## Core Concept

Access decisions based on attributes of the subject, resource, action, and environment. Policies evaluate combinations of these attributes at runtime.

## The Four Attribute Categories

```
Subject Attributes:    role, department, clearance, location
Resource Attributes:   type, classification, owner, department
Action Attributes:     read, write, approve, delete
Environment:           time, ip_address, device_type, risk_score
```

## XACML Architecture

```
       Request
         │
    ┌────▼────┐
    │   PEP   │  Policy Enforcement Point (intercepts request)
    └────┬────┘
         │
    ┌────▼────┐
    │   PDP   │  Policy Decision Point (evaluates policies)
    └────┬────┘
       ┌─┴─┐
  ┌────▼┐ ┌▼────┐
  │ PIP │ │ PAP │
  └─────┘ └─────┘
  Policy    Policy
  Info      Admin
  Point     Point
```

## Policy Example

```
Rule: "Department editors can edit their own department's documents during business hours"

IF   subject.role == "editor"
AND  resource.type == "document"
AND  subject.department == resource.department
AND  environment.time BETWEEN "09:00" AND "18:00"
THEN PERMIT
```

## Code Example

```typescript
interface Attributes {
  subject: Record<string, unknown>;
  resource: Record<string, unknown>;
  action: string;
  environment: Record<string, unknown>;
}

type Policy = (attrs: Attributes) => "permit" | "deny" | "not-applicable";

const departmentEditPolicy: Policy = attrs => {
  if (attrs.action !== "edit") return "not-applicable";
  if (attrs.subject.role !== "editor") return "deny";
  if (attrs.subject.department !== attrs.resource.department) return "deny";
  const hour = new Date().getHours();
  if (hour < 9 || hour > 18) return "deny";
  return "permit";
};
```

## Strengths

- Fine-grained: any attribute combination
- Eliminates role explosion
- Dynamic: evaluates at runtime with current context
- Standardized (XACML)

## Weaknesses

- Complex policy authoring and debugging
- Performance: attribute fetching at request time
- Difficult to answer "What can user X access?" (reverse queries)
- XACML is notoriously verbose
