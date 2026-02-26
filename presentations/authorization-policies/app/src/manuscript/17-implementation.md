# 17 — Implementation Patterns

## Microservices Authorization

### Sidecar Pattern

```
┌─────────────────────────┐
│ Service Pod              │
│ ┌─────────┐ ┌─────────┐ │
│ │ Service │→│ OPA     │ │
│ │ (app)   │ │ Sidecar │ │
│ └─────────┘ └─────────┘ │
└─────────────────────────┘
```

- Policy engine runs alongside each service
- No network hop for authorization checks
- Policies synced from central policy store

### Gateway Pattern

```
Client → API Gateway (PEP) → Policy Engine (PDP) → Microservice
```

- Centralized enforcement at the edge
- Services trust the gateway's decision
- Simpler service code, single enforcement point

### Embedded Library Pattern

```typescript
import { authorize } from "@acme/authz";

app.put("/documents/:id", async (req, res) => {
  const decision = authorize({
    subject: req.user,
    action: "edit",
    resource: await getDocument(req.params.id),
  });
  if (decision === "deny") return res.status(403).json({ error: "Forbidden" });
  // proceed
});
```

- No external service dependency
- Fastest evaluation (in-process)
- Policies bundled with application

## Policy-as-Code Pipeline

```
Author Policy → Git Push → CI Validates → Test Suite → Deploy to PDP
     │              │            │              │            │
  Cedar/Rego    Version      Syntax +       Unit +        Rolling
  in IDE       Control     Semantic Check  Integration   Update
```

### Testing Policies

```rego
# policy_test.rego
test_viewer_can_read {
  allow with input as {
    "user": {"roles": ["viewer"]},
    "action": "read",
    "resource": {"type": "document"}
  }
}

test_viewer_cannot_write {
  not allow with input as {
    "user": {"roles": ["viewer"]},
    "action": "write",
    "resource": {"type": "document"}
  }
}
```

## Zero Trust Implementation Checklist

1. **Identity everywhere** — Authenticate every request (mTLS, JWT)
2. **Least privilege** — Default deny, grant minimum needed
3. **Continuous verification** — Re-evaluate on every request
4. **Context-aware** — Device, network, behavior signals
5. **Micro-segmentation** — Service-to-service authorization
6. **Assume breach** — Limit blast radius with fine-grained controls
