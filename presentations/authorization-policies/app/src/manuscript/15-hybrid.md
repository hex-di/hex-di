# 15 — Hybrid Approaches

## Real-World Case Studies

### GitHub — RBAC + ReBAC

```
Organization
  └── Team (RBAC: admin, maintainer, member)
       └── Repository (ReBAC: team → repo relationship)
            └── Branch protection (PBAC: rules as policies)

Models used:
- RBAC: Organization roles (owner, member, billing manager)
- ReBAC: Team → Repository access inheritance
- PBAC: Branch protection rules, CODEOWNERS
```

### AWS IAM — RBAC + ABAC + PBAC

```
IAM User/Role (RBAC)
  └── IAM Policy (PBAC — JSON policy documents)
       └── Conditions (ABAC — tags, source IP, time)
            └── Service Control Policies (MAC — org-level boundaries)

Example policy combining models:
{
  "Effect": "Allow",              // PBAC
  "Action": "s3:GetObject",      // RBAC-style action
  "Resource": "arn:aws:s3:::*",
  "Condition": {                  // ABAC
    "StringEquals": {
      "s3:ResourceTag/Department": "${aws:PrincipalTag/Department}"
    },
    "IpAddress": {                // Context-based
      "aws:SourceIp": "10.0.0.0/8"
    }
  }
}
```

### Google Workspace — ReBAC + RBAC + Context

```
Organization (RBAC: super admin, admin, user)
  └── Organizational Unit
       └── Shared Drive (ReBAC: org → drive → file hierarchy)
            └── Context-Aware Access (device trust, network location)

Access flow:
1. User authenticated via Google Identity (CBAC — OAuth2/OIDC)
2. Check organizational role (RBAC)
3. Traverse sharing graph (ReBAC — Zanzibar)
4. Evaluate context (Context-Based — BeyondCorp)
5. Assess risk (Risk-Based — login behavior)
```

## Patterns for Combining Models

### Layered Authorization

```
Layer 1: RBAC (coarse-grained gatekeeping)
Layer 2: ABAC (fine-grained attribute checks)
Layer 3: Context (environmental restrictions)
Layer 4: Risk (adaptive response)

Request → RBAC → ABAC → Context → Risk → Decision
         (fast)  (precise) (secure)  (adaptive)
```

### Domain-Driven Authorization

- User management → RBAC (simple role assignment)
- Document sharing → ReBAC (relationship graph)
- API access → PBAC (policy-as-code)
- Compliance → MAC (classification enforcement)

## Key Takeaway

No single model solves everything. Production systems layer 2-4 models, each handling what it does best.
