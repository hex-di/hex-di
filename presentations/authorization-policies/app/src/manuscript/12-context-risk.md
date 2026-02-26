# 12 — Context-Based & Risk-Based Access Control

## Context-Based Access Control

Access decisions that incorporate environmental context beyond identity and role.

### Context Signals

```
Location:     IP address, geolocation, VPN status
Device:       Managed/unmanaged, OS version, compliance status
Time:         Business hours, time zone, day of week
Network:      Corporate network, public WiFi, Tor exit node
Behavior:     Login frequency, unusual patterns, travel velocity
```

### Example

```typescript
interface AccessContext {
  user: { id: string; role: string; mfaVerified: boolean };
  device: { managed: boolean; compliant: boolean; os: string };
  network: { ip: string; corporate: boolean; country: string };
  time: { hour: number; dayOfWeek: number };
}

function contextualAccess(ctx: AccessContext, resource: string): "allow" | "deny" | "step-up" {
  // Unmanaged device accessing sensitive resource
  if (!ctx.device.managed && resource === "financial-data") return "deny";
  // Non-corporate network requires MFA step-up
  if (!ctx.network.corporate && !ctx.user.mfaVerified) return "step-up";
  // Outside business hours: read-only
  if (ctx.time.hour < 8 || ctx.time.hour > 20) return resource.includes("write") ? "deny" : "allow";
  return "allow";
}
```

## Risk-Based Access Control

Assigns numerical risk scores to access requests and adjusts authorization dynamically.

### Risk Scoring

```
Risk Score = Σ (signal_weight × signal_value)

Signals:
  New device:           +30
  Unusual location:     +25
  Outside business hrs: +15
  Failed recent login:  +20
  No MFA:               +25
  Known VPN:            -10

Score Ranges:
  0-30:  Allow (normal access)
  31-60: Step-up (require MFA)
  61-80: Restrict (read-only)
  81+:   Deny (block + alert)
```

## Zero Trust Connection

- "Never trust, always verify"
- Every request is evaluated in context
- No implicit trust based on network location
- Continuous verification, not one-time gate
- NIST SP 800-207: Zero Trust Architecture

## Real-World Examples

- **Google BeyondCorp**: Context-aware access proxy
- **Microsoft Conditional Access**: Azure AD risk-based policies
- **Okta Adaptive MFA**: Risk score triggers step-up authentication
- **Zscaler ZPA**: Zero Trust network access

## Strengths

- Adaptive — responds to real-time conditions
- Defense in depth — multiple signals combined
- User-friendly — low-risk = seamless access
- Aligns with Zero Trust principles

## Weaknesses

- Complex to implement and tune risk models
- False positives frustrate users
- Requires real-time signal collection infrastructure
- Risk scoring is inherently subjective
