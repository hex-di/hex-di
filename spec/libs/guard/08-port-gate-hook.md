# 08 - Port Gate Hook

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-08                                 |
> | Revision         | 1.0                                      |
> | Effective Date   | 2026-02-13                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Functional Specification             |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 1.0 (2026-02-13): Initial controlled release |

_Previous: [07 - Guard Adapter](./07-guard-adapter.md)_

---

## 29. createPortGateHook

The `createPortGateHook` creates a coarse-grained `beforeResolve` hook. It uses a static allow/deny map keyed by port name. No subject, no resource, no policy evaluation. This is the simplest enforcement mechanism -- a kill switch for port resolution.

### Why a Separate Mechanism?

The architecture review (#4) identified that the `beforeResolve` hook is the wrong mechanism for fine-grained authorization. The `ResolutionHookContext` has no subject and no resource:

```typescript
interface ResolutionHookContext {
  readonly port: Port<unknown, string>;
  readonly portName: string;
  readonly lifetime: Lifetime;
  readonly scopeId: string | null;
  readonly parentPort: Port<unknown, string> | null;
  readonly isCacheHit: boolean;
  readonly depth: number;
  readonly containerId: string;
  readonly containerKind: ContainerKind;
  // No subject. No resource.
}
```

Attempting to resolve the subject inside a `beforeResolve` hook would trigger another resolution, which fires the hook again -- infinite recursion unless explicitly guarded. The port gate hook avoids this entirely by operating on static data only.

### Signature

```typescript
/**
 * Configuration for the port gate hook.
 *
 * Each entry maps a port name to a gate rule. The rule determines
 * whether resolution of that port is allowed.
 */
export interface PortGateConfig {
  readonly [portName: string]: PortGateRule;
}

/**
 * A gate rule for a single port.
 */
export type PortGateRule =
  | { readonly action: "deny"; readonly reason: string }
  | { readonly action: "allow" };

/**
 * Creates a beforeResolve hook that gates port resolution based on
 * a static configuration map.
 *
 * This is a coarse-grained mechanism for:
 * - Feature flags (disable a port in certain environments)
 * - Environment-gated ports (deny in production, allow in staging)
 * - Tenant restrictions (deny specific ports for specific tenants)
 *
 * @param config - Map of port names to gate rules
 * @returns A ResolutionHook for use with container.addHook()
 */
export function createPortGateHook(config: PortGateConfig): ResolutionHook;
```

### Implementation Behavior

```typescript
function createPortGateHook(config: PortGateConfig): ResolutionHook {
  return {
    beforeResolve(context: ResolutionHookContext): void {
      const rule = config[context.portName];
      if (rule === undefined) return; // no rule for this port -- allow

      if (rule.action === "deny") {
        throw new PortGatedError(context.portName, rule.reason);
      }
      // action === "allow" -> proceed
    },
  };
}
```

### Usage

```typescript
import { createPortGateHook } from "@hex-di/guard";

// Disable experimental ports in production
const gateHook = createPortGateHook({
  ExperimentalAnalyticsPort: {
    action: "deny",
    reason: "ExperimentalAnalyticsPort is disabled in production",
  },
  BetaFeaturePort: {
    action: "deny",
    reason: "Beta features are not available in this environment",
  },
});

const container = createContainer({ graph, name: "App" });
container.addHook(gateHook);

// This will throw PortGatedError
const analytics = container.resolve(ExperimentalAnalyticsPort);

// This is unaffected (no rule in the config)
const userRepo = container.resolve(UserRepoPort);
```

### Feature Flag Pattern

```typescript
function createFeatureFlagGate(
  flags: Readonly<Record<string, boolean>>,
  portMapping: Readonly<Record<string, string>>
): PortGateConfig {
  const config: Record<string, PortGateRule> = {};

  for (const [portName, flagName] of Object.entries(portMapping)) {
    const enabled = flags[flagName] ?? false;
    config[portName] = enabled
      ? { action: "allow" }
      : { action: "deny", reason: `Feature flag '${flagName}' is disabled` };
  }

  return config;
}

// Usage with feature flags from environment or remote config
const gateHook = createPortGateHook(
  createFeatureFlagGate(
    { "analytics-v2": false, "new-checkout": true },
    {
      AnalyticsV2Port: "analytics-v2",
      NewCheckoutPort: "new-checkout",
    }
  )
);
```

### Environment-Gated Ports

```typescript
const gateHook = createPortGateHook(
  process.env["NODE_ENV"] === "production"
    ? {
        DebugPort: { action: "deny", reason: "Debug port is disabled in production" },
        MockPaymentPort: { action: "deny", reason: "Mock payments are disabled in production" },
      }
    : {}
);
```

### PortGatedError

```typescript
/**
 * Error thrown when a port gate hook denies resolution.
 *
 * This is a ContainerError subtype that flows through the standard
 * container error model (caught by resolve(), returned by tryResolve()).
 */
export interface PortGatedError {
  readonly code: "PORT_GATED";
  readonly portName: string;
  readonly reason: string;
  readonly message: string;
}
```

## 30. Coarse vs Fine-Grained Enforcement

`guard()` and `createPortGateHook` are complementary mechanisms with distinct purposes. They are NOT alternatives -- use both when appropriate.

### Comparison Table

| Aspect                 | `guard()`                                            | `createPortGateHook()`                          |
| ---------------------- | ---------------------------------------------------- | ----------------------------------------------- |
| **Granularity**        | Fine-grained: subject + resource + policy            | Coarse-grained: port name only                  |
| **Subject awareness**  | Yes -- resolves subject from `SubjectProviderPort`   | No -- no subject, no identity                   |
| **Resource awareness** | Yes -- matcher DSL can reference resource attributes | No -- static port name map                      |
| **Policy evaluation**  | Full policy tree traversal                           | Static allow/deny lookup                        |
| **Enforcement site**   | Inside the adapter factory                           | `beforeResolve` hook (before factory runs)      |
| **Use case**           | RBAC, ABAC, per-user authorization                   | Feature flags, environment gates, kill switches |
| **Configuration**      | Policy objects composed via combinators              | Plain `Record<string, PortGateRule>`            |
| **Performance**        | O(n) tree traversal (n = policy nodes)               | O(1) map lookup                                 |
| **Error type**         | `AccessDeniedError` (wrapped in `FactoryError`)      | `PortGatedError` (direct `ContainerError`)      |

### When to Use Which

**Use `guard()` when:**

- Authorization depends on _who_ the subject is
- Different users get different access to the same port
- The policy involves permissions, roles, or attributes
- You need a decision trace for auditing

**Use `createPortGateHook()` when:**

- Authorization depends on _system configuration_, not user identity
- The decision is the same for all subjects
- You need to disable a port entirely (feature flag, maintenance mode)
- You need fast, static gating without resolving dependencies

**Use both when:**

- The hook gates a port globally (e.g., "this feature is only available in staging")
- The guard further restricts access by subject (e.g., "only admins can use this feature in staging")

### Ordering: Hook Runs First

The ordering between hook and guard is determined by the architecture:

```
1. Container.resolve(port) is called
2. beforeResolve hooks run (including port gate hook)
   - If PortGatedError is thrown, resolution fails immediately
   - The guard NEVER runs
3. Factory is invoked (including guard wrapper)
   - guard resolves SubjectProviderPort and PolicyEnginePort
   - guard evaluates the policy
   - If AccessDeniedError is thrown, resolution fails
4. afterResolve hooks run
```

This ordering is inherent to the hex-di resolution pipeline and requires no special handling -- just documentation.

### Combined Example

```typescript
import { guard, createPortGateHook, hasPermission, hasRole } from "@hex-di/guard";

// Coarse gate: disable the port entirely in production unless feature flag is on
const gateHook = createPortGateHook({
  ExperimentalReportPort:
    process.env["ENABLE_REPORTS"] === "true"
      ? { action: "allow" }
      : { action: "deny", reason: "Experimental reports feature is disabled" },
});

// Fine-grained guard: only admins can access the report port
const GuardedReportService = guard(ReportServiceAdapter, {
  resolve: hasRole("admin"),
});

const container = createContainer({ graph, name: "App" });
container.addHook(gateHook);

// In production with ENABLE_REPORTS=false:
// -> PortGatedError: "Experimental reports feature is disabled"
// guard() never runs

// In staging with ENABLE_REPORTS=true, non-admin user:
// -> Hook allows (feature is enabled)
// -> guard() evaluates hasRole("admin") -> Deny
// -> AccessDeniedError: "Subject lacks role admin"

// In staging with ENABLE_REPORTS=true, admin user:
// -> Hook allows
// -> guard() evaluates hasRole("admin") -> Allow
// -> Factory runs, service returned
```

### Decision Tree

```
Should I use guard() or createPortGateHook()?

Is the decision based on who the user is?
  YES -> Use guard()
  NO  -> Is the decision based on system configuration?
           YES -> Use createPortGateHook()
           NO  -> Re-evaluate: is this actually an authorization concern?
```

---

### Additional Port Gate Recommendations

```
RECOMMENDED: Port gate denials SHOULD produce structured log entries via the logger
             integration (section 37) when the logger is available. The log entry
             SHOULD include the port name, denial reason, scope ID, and timestamp.
             This provides operational visibility into which ports are being gate-denied
             and how frequently, aiding in feature flag lifecycle management.
```

```
RECOMMENDED: The PortGateConfig object SHOULD be Object.freeze()'d at construction
             time to prevent runtime mutation. Mutating a gate config after hook
             creation would silently change authorization behavior without audit
             trail evidence. The createPortGateHook() function SHOULD deep-freeze
             the config (freeze the outer object and each PortGateRule).
```

---

## GxP Suitability Note

> **WARNING:** The port gate hook is **NOT** suitable as the sole authorization mechanism for GxP-regulated ports. It operates on static configuration only — it has no subject awareness, produces no `AuditEntry` records, and does not participate in the hash chain or electronic signature workflow.
>
> The port gate hook **may** be used in addition to `guard()` for environment-gating scenarios (e.g., disabling experimental ports in production). When used alongside `guard()`, the hook runs first (step 2 in the resolution pipeline) and the guard evaluates second (step 3). The hook provides coarse-grained gating; the guard provides fine-grained, audited authorization.
>
> For GxP-regulated ports, always use `guard()` as the primary authorization mechanism. See 07-guard-adapter.md section 25 for the full guard contract and 17-gxp-compliance.md for compliance requirements.

```
REQUIREMENT: When gxp is true, checkGxPReadiness() (07-guard-adapter.md) MUST detect
             ports that have a PortGateHook rule configured but no guard() wrapper.
             Such ports lack subject awareness, produce no AuditEntry records, and
             do not participate in hash chain or electronic signature workflows.
             checkGxPReadiness() MUST emit a fail item for each such port, with a
             detail message identifying the port name and recommending that guard()
             be added. This is checkGxPReadiness item 13. Furthermore, when gxp is
             true, createGuardGraph() MUST reject at construction time (throw
             ConfigurationError) if any port has a PortGateHook deny rule but no
             guard() wrapper. Deferring this check to runtime risks GxP operations
             proceeding without proper authorization and audit coverage.
             Reference: 21 CFR 11.10(d) (limiting system access to authorized
             individuals), 21 CFR 11.10(e) (audit trails).
```

---

_Next: [09 - Serialization](./09-serialization.md)_
