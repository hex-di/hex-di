# 05 — Bundle Management

OPA manages its own policies and data via the bundle system. This chapter documents how the adapter interacts with OPA's bundle lifecycle and data documents.

---

## OPA Bundle Format

OPA bundles are tarballs (`.tar.gz`) containing Rego policies, JSON data files, and a manifest. The adapter does NOT create or manage bundles — OPA does this autonomously. This section documents the expected bundle structure so that Guard users can configure OPA correctly.

### Expected Bundle Structure

```
bundle.tar.gz
├── authz/
│   ├── documents/
│   │   ├── policy.rego      # Authorization policies for documents
│   │   └── data.json        # Static data (role definitions, resource metadata)
│   ├── users/
│   │   ├── policy.rego      # User-related policies
│   │   └── data.json
│   └── common/
│       └── helpers.rego      # Shared Rego helper functions
├── .manifest                 # Bundle metadata (roots, revision)
└── .signatures.json          # Bundle signatures (optional)
```

REQUIREMENT (RG-BDL-001): The adapter MUST NOT manage OPA bundles directly. Bundle loading, polling, and updates are OPA's responsibility. The adapter only sends queries to OPA's Data API.

REQUIREMENT (RG-BDL-002): The adapter MUST support checking bundle readiness via OPA's health endpoint. When `healthCheckOnCreate` is enabled, the health check response includes `bundles_ready` status.

---

## Data Documents

OPA data documents provide static reference data that Rego policies can access via `data.<path>`. Common use cases for Guard integration:

### Role-Permission Mappings

```json
// data.json at authz/documents/
{
  "role_permissions": {
    "admin": ["read", "write", "delete", "admin"],
    "editor": ["read", "write"],
    "viewer": ["read"]
  },
  "classification_levels": {
    "public": 0,
    "internal": 1,
    "confidential": 2,
    "secret": 3
  }
}
```

```rego
package authz.documents

import rego.v1

# Access role permissions from data document
allowed_actions := data.authz.documents.role_permissions[role] if {
    some role in input.subject.roles
}
```

REQUIREMENT (RG-BDL-010): The adapter MUST document the convention that OPA data documents are loaded via bundles, not via the adapter. The adapter's input document (`input.*`) is request-scoped; data documents (`data.*`) are bundle-scoped.

REQUIREMENT (RG-BDL-011): The adapter MUST NOT push data to OPA's Data API (`PUT /v1/data/{path}`). All static data MUST be managed through bundles for consistency and auditability.

---

## Bundle Configuration

REQUIREMENT (RG-BDL-020): The `RegoAdapterConfig` MUST document the expected OPA bundle configuration. The adapter does not configure OPA itself, but users need this reference.

### Recommended OPA Configuration

```yaml
# opa.yaml — OPA configuration file
services:
  bundle-server:
    url: https://bundle.example.com

bundles:
  authz:
    service: bundle-server
    resource: /bundles/authz/bundle.tar.gz
    polling:
      min_delay_seconds: 30
      max_delay_seconds: 60

decision_logs:
  service: bundle-server
  reporting:
    min_delay_seconds: 60
    max_delay_seconds: 300
```

REQUIREMENT (RG-BDL-021): The adapter's documentation MUST include a reference OPA configuration showing: bundle service, polling intervals, decision log reporting, and health check configuration.

REQUIREMENT (RG-BDL-022): The adapter MUST support OPA's `?provenance=true` query parameter to include bundle revision information in query responses. When enabled, the bundle revision is propagated to the Guard evaluation trace.

---

## Bundle Readiness

REQUIREMENT (RG-BDL-030): The adapter's health check MUST distinguish between two failure modes:

1. **OPA unreachable** — the sidecar is not running (network error)
2. **Bundles not ready** — OPA is running but hasn't loaded its initial bundles yet

```ts
// Health check result
interface OpaHealthStatus {
  readonly healthy: boolean; // OPA process is responding
  readonly bundlesReady?: boolean; // All configured bundles are loaded
  readonly pluginsReady?: boolean; // All plugins are ready
}
```

REQUIREMENT (RG-BDL-031): When `bundlesReady` is `false`, the adapter MUST log a warning but MUST NOT reject evaluation requests. OPA will return `undefined` for queries against unloaded bundles, which the adapter maps to `Deny` (default deny behavior).
