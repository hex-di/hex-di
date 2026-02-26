# 09 — Claims-Based Access Control (CBAC)

## Core Concept

Access decisions based on claims embedded in security tokens (JWT, SAML). A trusted identity provider (IdP) asserts claims about the subject, and the relying party makes access decisions based on those claims.

## How It Works

```
User authenticates → IdP issues token with claims → Service validates claims

JWT Payload:
{
  "sub": "alice@example.com",
  "roles": ["editor", "reviewer"],
  "department": "engineering",
  "clearance": "confidential",
  "org_id": "acme-corp",
  "iss": "https://auth.example.com",
  "exp": 1700000000
}
```

## OAuth2 / OIDC Flow

```
User → Authorization Server → Access Token (claims)
                                    │
                              Resource Server
                              (validates claims)
```

## Real-World Examples

- **Azure AD / Entra ID**: Custom claims in JWT tokens
- **Auth0 / Okta**: Claims-based authorization rules
- **AWS Cognito**: User pool custom attributes as claims
- **Google Workspace**: OIDC tokens with org claims

## Code Example

```typescript
interface Claims {
  sub: string;
  roles: string[];
  department: string;
  clearance: string;
  org_id: string;
}

function authorize(claims: Claims, requiredRole: string, requiredDept?: string): boolean {
  if (!claims.roles.includes(requiredRole)) return false;
  if (requiredDept && claims.department !== requiredDept) return false;
  return true;
}

// Middleware pattern
function requireClaims(...required: string[]) {
  return (claims: Claims) => {
    return required.every(role => claims.roles.includes(role));
  };
}
```

## Strengths

- Stateless — claims travel with the request (no DB lookup)
- Federated — works across organizational boundaries
- Standard protocols (OAuth2, OIDC, SAML)
- Rich ecosystem (Auth0, Okta, Keycloak, Azure AD)

## Weaknesses

- Token revocation is difficult (tokens are valid until expiry)
- Claim bloat — large tokens impact performance
- Claims are fixed at issuance — stale until refresh
- Limited to what IdP can assert (not resource-side attributes)
