# 18 - Ecosystem Extensions

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-18                                 |
> | Revision         | 1.1                                      |
> | Effective Date   | 2026-02-14                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Functional Specification |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 1.1 (2026-02-14): Added GxP traceability — REQ-GUARD-074 through REQ-GUARD-079, FMEA FM-32 through FM-36, STRIDE T-5/T-6/E-5/E-6/D-5, OQ-44 through OQ-48 (CCR-GUARD-011) |
> |                  | 1.0 (2026-02-14): Initial draft — distributed evaluation, framework middlewares, persistence adapters, query conversion, WASM compilation (CCR-GUARD-010) |

_Previous: [17 - GxP Compliance Guide](../compliance/gxp.md)_

---

## Motivation

Competitive analysis against CASL, Casbin, OPA/Rego, OpenFGA, Permit.io, Oso, Spring Security, Pundit, Django Guardian, and OPA identified three critical gaps preventing `@hex-di/guard` from becoming the TypeScript authorization leader:

1. **Deployability** — No distributed evaluation story, no persistence adapters, no framework middlewares
2. **Discoverability** — No interactive playground, no CLI, no IDE integration
3. **Indispensability** — No query conversion (the feature that makes teams choose Guard over CASL)

This specification addresses gap (1) — deployability. Gap (2) is addressed in [19 - Developer Experience](./developer-experience.md).

### Architectural Principle

Every extension in this document follows the hexagonal architecture pattern:

- Framework middlewares are **thin bridge adapters** that resolve `SubjectProviderPort` from the framework's request context and delegate to `evaluate()`. The core evaluation engine is never modified.
- Persistence adapters implement existing ports (`AuditTrailPort`, `RelationshipResolverPort`). No new core ports are introduced for persistence.
- Query conversion is a **pure function** that transforms a policy tree + subject into a database filter. No runtime dependency on the ORM.

---

## 74. Distributed Evaluation

Guard's `evaluate()` function is in-process and synchronous. For multi-node deployments (multiple Node.js processes, Kubernetes pods, serverless functions), teams need a pattern for distributing policies, caching decisions, and synchronizing subjects across nodes.

### Design Principle

Guard does NOT become a service. Evaluation remains in-process. Distribution is handled through outbound ports that synchronize state between nodes.

### 74a. PolicySyncPort

```typescript
/**
 * Outbound port for policy distribution across nodes.
 *
 * Direction: outbound
 * Category: guard/policy-sync
 * Lifetime: singleton
 *
 * When a policy is registered or updated, the sync adapter
 * distributes it to other nodes. When a remote policy update
 * arrives, the adapter notifies the local policy engine.
 */
const PolicySyncPort: Port<PolicySync, "PolicySync">;

interface PolicySync {
  /**
   * Publish a policy update to all connected nodes.
   * The bundle contains the serialized policy tree, version, and signature.
   */
  readonly publish: (bundle: PolicyBundle) => Promise<Result<void, PolicySyncError>>;

  /**
   * Subscribe to policy updates from other nodes.
   * The callback is invoked when a remote node publishes an update.
   */
  readonly subscribe: (
    callback: (bundle: PolicyBundle) => void
  ) => PolicySyncSubscription;
}

interface PolicySyncSubscription {
  readonly unsubscribe: () => void;
}
```

### 74b. EvaluationCachePort

```typescript
/**
 * Outbound port for caching evaluation decisions.
 *
 * Direction: outbound
 * Category: guard/evaluation-cache
 * Lifetime: singleton
 *
 * Caches decisions keyed by (policyHash, subjectId, resourceId).
 * Cache entries have a configurable TTL. When a policy is updated,
 * all cached decisions for that policy hash are invalidated.
 */
const EvaluationCachePort: Port<EvaluationCache, "EvaluationCache">;

interface EvaluationCache {
  /** Look up a cached decision. Returns undefined on cache miss. */
  readonly get: (key: EvaluationCacheKey) => Promise<CachedDecision | undefined>;

  /** Store a decision in the cache with TTL. */
  readonly set: (
    key: EvaluationCacheKey,
    decision: CachedDecision,
    ttlMs: number
  ) => Promise<void>;

  /** Invalidate all cached decisions for a given policy hash. */
  readonly invalidateByPolicy: (policyHash: string) => Promise<void>;

  /** Invalidate all cached decisions for a given subject. */
  readonly invalidateBySubject: (subjectId: string) => Promise<void>;
}

interface EvaluationCacheKey {
  readonly policyHash: string;
  readonly subjectId: string;
  readonly resourceId: string;
}

interface CachedDecision {
  readonly decision: "allow" | "deny";
  readonly reason: string;
  readonly cachedAt: string; // ISO 8601
  readonly evaluationId: string;
}
```

```
REQUIREMENT: EvaluationCachePort MUST NOT cache decisions when gxp is true.
             In GxP environments, every evaluation MUST be recorded in the
             audit trail with a unique evaluationId and fresh timestamp.
             Serving cached decisions would violate ALCOA+ Contemporaneous
             (timestamp would reflect cache time, not evaluation time) and
             ALCOA+ Complete (audit trail would miss evaluations served from
             cache). Attempting to register an EvaluationCachePort adapter
             when gxp is true MUST produce a compile-time error via
             conditional types. The type-level error message SHOULD indicate:
             "EvaluationCachePort is incompatible with GxP mode. Every
             evaluation must be individually recorded in the audit trail
             (ALCOA+ Complete, ALCOA+ Contemporaneous)." If runtime
             registration is attempted despite the type error (e.g., via
             type cast), createGuardGraph() MUST throw a ConfigurationError
             with the same message text.
             Reference: ALCOA+ Contemporaneous, ALCOA+ Complete,
             21 CFR 11.10(e).
```

### 74c. Policy Bundle Format

A policy bundle packages policies, permission registries, and metadata into a versioned, signed artifact that nodes can pull or receive via `PolicySyncPort`.

```typescript
interface PolicyBundle {
  /** Bundle format version. Current: 1. */
  readonly version: number;

  /** Unique bundle identifier (UUID v4). */
  readonly bundleId: string;

  /** ISO 8601 timestamp of bundle creation. */
  readonly createdAt: string;

  /** SHA-256 hash of the serialized policies content. */
  readonly contentHash: string;

  /**
   * Serialized policies keyed by port name.
   * Each value is the output of serializePolicy().
   */
  readonly policies: Readonly<Record<string, string>>;

  /**
   * Permission registry: all known permissions as "resource:action" strings.
   * Used for validation — a policy referencing an unknown permission is rejected.
   */
  readonly permissionRegistry: ReadonlyArray<string>;

  /**
   * Role definitions with their permission sets.
   * Used for validation and for reconstructing role hierarchies on remote nodes.
   */
  readonly roles: ReadonlyArray<SerializedRole>;

  /**
   * Optional digital signature over contentHash.
   * REQUIRED when distributing bundles across trust boundaries.
   */
  readonly signature?: BundleSignature;
}

interface SerializedRole {
  readonly name: string;
  readonly permissions: ReadonlyArray<string>;
  readonly inherits: ReadonlyArray<string>;
}

interface BundleSignature {
  readonly algorithm: "RSA-SHA256" | "ECDSA-P256";
  readonly value: string;
  readonly signerId: string;
  readonly signedAt: string; // ISO 8601
}
```

```
REQUIREMENT: Policy bundles distributed across network boundaries MUST include
             a BundleSignature using an asymmetric algorithm (RSA-SHA256 or
             ECDSA-P256). Unsigned bundles MUST be rejected by receiving nodes.
             This prevents policy tampering during transit.

REQUIREMENT: Receiving nodes MUST validate the bundle's contentHash against
             the serialized policies content before applying the bundle.
             A hash mismatch MUST reject the bundle and emit a
             GuardErrorEvent with errorCode "ACL031".

RECOMMENDED: Policy bundles SHOULD include a monotonically increasing sequence
             number to enable gap detection. Receiving nodes SHOULD track the
             last-seen sequence number and warn on gaps.
```

### 74d. Consistency Model

| Concern | Consistency Level | Rationale |
|---|---|---|
| Policy distribution | Eventual consistency | Policies change infrequently. A brief window where different nodes evaluate different policy versions is acceptable. |
| Subject/session state | Strong consistency (per-scope) | Within a single request scope, the subject is immutable ([ADR #9](../decisions/009-immutable-subject-within-scope.md)). Cross-node session state uses the existing SubjectProviderPort. |
| Evaluation cache | Best-effort | Cache misses fall through to full evaluation. Stale cache entries are bounded by TTL. |
| Audit trail | Strong consistency (per-scope chain) | Audit entries are written to the per-scope hash chain. Cross-node audit aggregation is the persistence adapter's responsibility. |

### Distributed Evaluation Packages

| Package | Description |
|---|---|
| `@hex-di/guard-sync-redis` | `PolicySyncPort` adapter using Redis Pub/Sub for policy distribution |
| `@hex-di/guard-sync-nats` | `PolicySyncPort` adapter using NATS for policy distribution |
| `@hex-di/guard-cache-redis` | `EvaluationCachePort` adapter using Redis with TTL-based expiration |
| `@hex-di/guard-cache-memory` | `EvaluationCachePort` adapter using in-process LRU cache (single-node only) |

---

## 75. Framework Middleware Adapters

Each framework adapter is a thin bridge that resolves `SubjectProviderPort` from the framework's request context and delegates to `evaluate()`. The hexagonal core stays untouched. These are adapters in the literal hexagonal architecture sense.

### Design Principle

Framework adapters:

1. Extract the subject from the framework's request context (cookie, header, session, etc.)
2. Register the subject on a per-request DI scope via `SubjectProviderPort`
3. Attach the scope to the request for downstream resolvers
4. Do NOT contain authorization logic — that lives in `evaluate()` and `guard()`

### 75a. Express/Connect Middleware

**Package:** `@hex-di/guard-express`

```typescript
import { createGuardMiddleware } from "@hex-di/guard-express";

/**
 * Creates Express middleware that:
 * 1. Extracts the subject from the request (via extractSubject)
 * 2. Creates a request-scoped DI container
 * 3. Registers the subject on SubjectProviderPort
 * 4. Attaches the scope to req.scope for downstream handlers
 *
 * @param options.container - The root DI container
 * @param options.extractSubject - Async function to extract AuthSubject from Request
 * @param options.onDenied - Optional handler for AccessDeniedError (default: 403 response)
 */
function createGuardMiddleware(options: {
  readonly container: Container;
  readonly extractSubject: (req: Request) => Promise<AuthSubject | null>;
  readonly onDenied?: (error: AccessDeniedError, req: Request, res: Response) => void;
}): RequestHandler;
```

Usage:

```typescript
import express from "express";
import { createGuardMiddleware } from "@hex-di/guard-express";

const app = express();

app.use(
  createGuardMiddleware({
    container,
    extractSubject: async (req) => {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) return null;
      return verifyToken(token);
    },
  })
);

// Downstream: req.scope is a request-scoped container
app.get("/users", async (req, res) => {
  const repo = req.scope.resolve(UserRepoPort);
  // guard() policy evaluated here — throws AccessDeniedError if denied
  const users = await repo.findAll();
  res.json(users);
});
```

### 75b. Fastify Plugin

**Package:** `@hex-di/guard-fastify`

```typescript
import { guardPlugin } from "@hex-di/guard-fastify";

/**
 * Fastify plugin that:
 * 1. Decorates the request with a scoped container
 * 2. Extracts subject per request
 * 3. Registers route-level policy enforcement via onRequest hook
 *
 * @param options.container - The root DI container
 * @param options.extractSubject - Async function to extract AuthSubject from FastifyRequest
 */
function guardPlugin(
  fastify: FastifyInstance,
  options: {
    readonly container: Container;
    readonly extractSubject: (
      request: FastifyRequest
    ) => Promise<AuthSubject | null>;
  }
): Promise<void>;
```

Usage:

```typescript
import Fastify from "fastify";
import { guardPlugin } from "@hex-di/guard-fastify";

const app = Fastify();

await app.register(guardPlugin, {
  container,
  extractSubject: async (request) => {
    const token = request.headers.authorization?.replace("Bearer ", "");
    if (!token) return null;
    return verifyToken(token);
  },
});

app.get("/users", async (request, reply) => {
  const repo = request.scope.resolve(UserRepoPort);
  const users = await repo.findAll();
  return users;
});
```

### 75c. tRPC Middleware

**Package:** `@hex-di/guard-trpc`

```typescript
import { createGuardMiddleware } from "@hex-di/guard-trpc";

/**
 * tRPC middleware that creates a per-request scope with the subject
 * and makes it available in the tRPC context.
 */
function createGuardMiddleware(options: {
  readonly container: Container;
  readonly extractSubject: (opts: { ctx: Context }) => Promise<AuthSubject | null>;
}): MiddlewareFunction;
```

Usage:

```typescript
import { initTRPC } from "@trpc/server";
import { createGuardMiddleware } from "@hex-di/guard-trpc";

const t = initTRPC.context<Context>().create();

const guardMiddleware = createGuardMiddleware({
  container,
  extractSubject: async ({ ctx }) => ctx.session?.subject ?? null,
});

const protectedProcedure = t.procedure.use(guardMiddleware);

const appRouter = t.router({
  getUsers: protectedProcedure.query(async ({ ctx }) => {
    const repo = ctx.scope.resolve(UserRepoPort);
    return repo.findAll();
  }),
});
```

### 75d. GraphQL Directive

**Package:** `@hex-di/guard-graphql`

```typescript
import { createGuardDirective } from "@hex-di/guard-graphql";

/**
 * GraphQL schema directive for field-level authorization.
 *
 * Usage in schema:
 *   directive @authorized(policy: String!) on FIELD_DEFINITION
 *
 *   type User {
 *     id: ID!
 *     name: String!
 *     email: String! @authorized(policy: "hasPermission:user:readEmail")
 *     salary: Float! @authorized(policy: "allOf:hasPermission:hr:read,hasRole:manager")
 *   }
 *
 * The policy string is parsed via deserializePolicy() at schema build time.
 * Invalid policies produce a schema build error, not a runtime error.
 */
function createGuardDirective(options: {
  readonly container: Container;
}): GraphQLDirective;
```

### 75e. NestJS Guard Decorator

**Package:** `@hex-di/guard-nestjs`

```typescript
import { UseGuardPolicy } from "@hex-di/guard-nestjs";

/**
 * NestJS method decorator that evaluates a guard policy before
 * the route handler executes.
 *
 * Integrates with NestJS's built-in guards mechanism.
 * The subject is extracted from the request via the configured
 * SubjectProviderPort.
 */
function UseGuardPolicy(policy: PolicyConstraint): MethodDecorator;
```

Usage:

```typescript
import { Controller, Get } from "@nestjs/common";
import { UseGuardPolicy } from "@hex-di/guard-nestjs";
import { hasPermission } from "@hex-di/guard";

@Controller("users")
class UserController {
  @Get()
  @UseGuardPolicy(hasPermission(UserPerms.read))
  async findAll() {
    // Only reached if the policy allows
  }
}
```

### Middleware Adapter Packages

| Package | Framework | Request Context | Scope Attachment |
|---|---|---|---|
| `@hex-di/guard-express` | Express 4/5, Connect | `req.headers`, `req.cookies` | `req.scope` |
| `@hex-di/guard-fastify` | Fastify 4/5 | `request.headers`, `request.cookies` | `request.scope` |
| `@hex-di/guard-trpc` | tRPC v10/v11 | `ctx` (user-defined) | `ctx.scope` |
| `@hex-di/guard-graphql` | GraphQL.js, Apollo, Yoga | Resolver context | Directive-level |
| `@hex-di/guard-nestjs` | NestJS 10/11 | `ExecutionContext` | NestJS DI scope |

```
REQUIREMENT: All framework middleware adapters MUST create a new DI scope per
             request and dispose it when the request completes. The scope MUST
             be disposed even if the request handler throws. This prevents
             scope leaks and ensures audit trail entries are flushed.

REQUIREMENT: All framework middleware adapters MUST handle AccessDeniedError
             from guarded adapter resolution and translate it to the
             framework's standard error response (HTTP 403 for Express/Fastify,
             TRPCError with code FORBIDDEN for tRPC, GraphQLError for GraphQL,
             ForbiddenException for NestJS).

RECOMMENDED: Framework middleware adapters SHOULD accept an optional
             onSubjectNotFound callback for requests where extractSubject
             returns null. The default behavior SHOULD be to respond with
             HTTP 401 (Unauthorized). This distinguishes "not authenticated"
             (401) from "authenticated but not authorized" (403).
```

---

## 76. Persistence Adapters

Production deployments need durable storage for audit trails and relationship data. These adapters implement existing ports — no new core ports are introduced.

### 76a. Postgres AuditTrailPort Adapter

**Package:** `@hex-di/guard-audit-postgres`

```typescript
import { createPostgresAuditTrail } from "@hex-di/guard-audit-postgres";

/**
 * AuditTrailPort adapter backed by PostgreSQL.
 *
 * Features:
 * - Append-only table with database-level INSERT-only permissions
 * - Hash chain verification on read
 * - Date-based partitioning for retention management
 * - Per-scope chain isolation via scopeId column
 * - Connection pooling via pg or postgres.js
 *
 * @param options.connectionString - PostgreSQL connection string
 * @param options.tableName - Table name (default: "guard_audit_trail")
 * @param options.partitionInterval - Partition interval (default: "monthly")
 */
function createPostgresAuditTrail(options: {
  readonly connectionString: string;
  readonly tableName?: string;
  readonly partitionInterval?: "daily" | "weekly" | "monthly";
  readonly schema?: string;
}): AuditTrailAdapter;
```

Database schema:

```sql
CREATE TABLE guard_audit_trail (
  id                    BIGSERIAL PRIMARY KEY,
  evaluation_id         UUID NOT NULL UNIQUE,
  timestamp             TIMESTAMPTZ NOT NULL,
  subject_id            VARCHAR(255) NOT NULL,
  authentication_method VARCHAR(64) NOT NULL,
  policy                VARCHAR(512) NOT NULL,
  decision              VARCHAR(5) NOT NULL CHECK (decision IN ('allow', 'deny')),
  port_name             VARCHAR(128) NOT NULL,
  scope_id              UUID NOT NULL,
  reason                VARCHAR(2048) NOT NULL DEFAULT '',
  duration_ms           DOUBLE PRECISION NOT NULL,
  schema_version        INTEGER NOT NULL DEFAULT 1,
  trace_digest          TEXT,
  integrity_hash        VARCHAR(128),
  previous_hash         VARCHAR(128),
  hash_algorithm        VARCHAR(32),
  sequence_number       BIGINT,
  policy_snapshot       VARCHAR(64),
  signature_signer_id   VARCHAR(255),
  signature_signed_at   TIMESTAMPTZ,
  signature_meaning     VARCHAR(64),
  signature_value       VARCHAR(1024),
  signature_algorithm   VARCHAR(32),
  signature_signer_name VARCHAR(255)
) PARTITION BY RANGE (timestamp);

-- Index for hash chain verification (per-scope ordering)
CREATE INDEX idx_audit_scope_seq ON guard_audit_trail (scope_id, sequence_number);

-- Index for subject lookups (audit trail review)
CREATE INDEX idx_audit_subject ON guard_audit_trail (subject_id, timestamp);

-- Index for decision filtering
CREATE INDEX idx_audit_decision ON guard_audit_trail (decision, timestamp);

-- Enforce append-only: revoke UPDATE and DELETE from the application role
REVOKE UPDATE, DELETE ON guard_audit_trail FROM app_role;
```

```
REQUIREMENT: The Postgres audit trail adapter MUST use database-level
             permissions (REVOKE UPDATE, DELETE) to enforce append-only
             semantics. This provides defense-in-depth beyond the
             behavioral contract — even if application code is compromised,
             the database rejects mutations.
             Reference: 21 CFR 11.10(e), ALCOA+ Enduring.

REQUIREMENT: The Postgres audit trail adapter MUST pass the
             createAuditTrailConformanceSuite() from @hex-di/guard-testing.
             All 17 conformance test cases MUST pass.
             Reference: GAMP 5 Category 5 (adapter validation).
```

### 76b. SQLite AuditTrailPort Adapter

**Package:** `@hex-di/guard-audit-sqlite`

```typescript
import { createSqliteAuditTrail } from "@hex-di/guard-audit-sqlite";

/**
 * AuditTrailPort adapter backed by SQLite.
 *
 * Suitable for:
 * - Single-node deployments
 * - Edge/embedded environments
 * - Development and testing
 * - Desktop applications (Electron, Tauri)
 *
 * Uses WAL mode for concurrent read/write support.
 * Uses triggers to enforce append-only semantics.
 *
 * @param options.databasePath - Path to SQLite database file
 * @param options.tableName - Table name (default: "guard_audit_trail")
 */
function createSqliteAuditTrail(options: {
  readonly databasePath: string;
  readonly tableName?: string;
}): AuditTrailAdapter;
```

```
REQUIREMENT: The SQLite audit trail adapter MUST enable WAL (Write-Ahead Log)
             mode and MUST create triggers that reject UPDATE and DELETE
             operations on the audit trail table.
             Reference: 21 CFR 11.10(e), ALCOA+ Enduring.
```

### 76c. Postgres RelationshipResolverPort Adapter

**Package:** `@hex-di/guard-relationships-postgres`

```typescript
import { createPostgresRelationshipResolver } from "@hex-di/guard-relationships-postgres";

/**
 * RelationshipResolverPort adapter backed by PostgreSQL.
 *
 * Stores relationship tuples in a table modeled after OpenFGA/Zanzibar:
 *   (subject_type, subject_id, relation, resource_type, resource_id)
 *
 * Supports transitive relationship resolution via recursive CTE queries
 * bounded by the depth parameter from hasRelationship policies.
 *
 * @param options.connectionString - PostgreSQL connection string
 * @param options.tableName - Table name (default: "guard_relationships")
 */
function createPostgresRelationshipResolver(options: {
  readonly connectionString: string;
  readonly tableName?: string;
  readonly schema?: string;
}): RelationshipResolverAdapter;
```

Database schema:

```sql
CREATE TABLE guard_relationships (
  id              BIGSERIAL PRIMARY KEY,
  subject_type    VARCHAR(128) NOT NULL,
  subject_id      VARCHAR(255) NOT NULL,
  relation        VARCHAR(128) NOT NULL,
  resource_type   VARCHAR(128) NOT NULL,
  resource_id     VARCHAR(255) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (subject_type, subject_id, relation, resource_type, resource_id)
);

-- Index for forward lookups: "does subject S have relation R with resource O?"
CREATE INDEX idx_rel_subject ON guard_relationships (subject_id, relation, resource_type, resource_id);

-- Index for reverse lookups: "who has relation R with resource O?"
CREATE INDEX idx_rel_resource ON guard_relationships (resource_type, resource_id, relation);
```

### 76d. Drizzle RelationshipResolverPort Adapter

**Package:** `@hex-di/guard-relationships-drizzle`

```typescript
import { createDrizzleRelationshipResolver } from "@hex-di/guard-relationships-drizzle";

/**
 * RelationshipResolverPort adapter using Drizzle ORM.
 *
 * ORM-agnostic: works with any Drizzle-supported database
 * (PostgreSQL, MySQL, SQLite). Uses Drizzle's query builder
 * for type-safe queries.
 *
 * @param options.db - Drizzle database instance
 * @param options.table - Drizzle table definition (uses default schema if omitted)
 */
function createDrizzleRelationshipResolver(options: {
  readonly db: DrizzleDatabase;
  readonly table?: RelationshipTable;
}): RelationshipResolverAdapter;
```

### Persistence Adapter Packages

| Package | Port | Backend | Use Case |
|---|---|---|---|
| `@hex-di/guard-audit-postgres` | `AuditTrailPort` | PostgreSQL | Production, multi-node |
| `@hex-di/guard-audit-sqlite` | `AuditTrailPort` | SQLite | Single-node, edge, desktop |
| `@hex-di/guard-relationships-postgres` | `RelationshipResolverPort` | PostgreSQL | Production ReBAC |
| `@hex-di/guard-relationships-drizzle` | `RelationshipResolverPort` | Drizzle ORM | ORM-agnostic ReBAC |

---

## 77. Query Conversion

Query conversion transforms a guard policy tree into a database filter, enabling teams to write one policy and use it for both request-level authorization AND database-level row filtering. This is the most requested authorization feature in the TypeScript ecosystem (CASL's `@casl/prisma` and `@casl/mongoose` are the primary adoption drivers for that library).

### Design Principle

Query conversion is a **pure function**. It takes a policy tree and a subject, and returns a filter object. There is no runtime dependency on any ORM — the conversion produces a generic filter representation that ORM-specific adapters translate.

### 77a. policyToFilter()

```typescript
/**
 * Converts a policy tree into a database-agnostic filter.
 *
 * Only policies with attribute matchers (hasAttribute) produce
 * filter conditions. Permission and role checks are pre-evaluated
 * against the subject and folded into boolean constants.
 *
 * @param policy - The policy tree to convert
 * @param subject - The subject to evaluate permission/role checks against
 * @returns A database-agnostic filter tree, or undefined if the policy
 *          cannot be expressed as a database filter (e.g., pure permission check)
 */
function policyToFilter(
  policy: PolicyConstraint,
  subject: AuthSubject
): PolicyFilter | undefined;
```

```typescript
/**
 * Database-agnostic filter representation.
 * ORM adapters translate this into ORM-specific query syntax.
 */
type PolicyFilter =
  | { readonly kind: "eq"; readonly field: string; readonly value: unknown }
  | { readonly kind: "neq"; readonly field: string; readonly value: unknown }
  | { readonly kind: "in"; readonly field: string; readonly values: ReadonlyArray<unknown> }
  | { readonly kind: "exists"; readonly field: string }
  | { readonly kind: "gte"; readonly field: string; readonly value: number }
  | { readonly kind: "lt"; readonly field: string; readonly value: number }
  | { readonly kind: "and"; readonly filters: ReadonlyArray<PolicyFilter> }
  | { readonly kind: "or"; readonly filters: ReadonlyArray<PolicyFilter> }
  | { readonly kind: "not"; readonly filter: PolicyFilter }
  | { readonly kind: "true" }
  | { readonly kind: "false" };
```

Conversion rules:

| Policy Kind | Filter Output |
|---|---|
| `hasPermission(p)` | `{ kind: "true" }` if subject has permission, `{ kind: "false" }` otherwise |
| `hasRole(r)` | `{ kind: "true" }` if subject has role, `{ kind: "false" }` otherwise |
| `hasAttribute(attr, eq(subject(path)))` | `{ kind: "eq", field: attr, value: subject[path] }` |
| `hasAttribute(attr, neq(subject(path)))` | `{ kind: "neq", field: attr, value: subject[path] }` |
| `hasAttribute(attr, inArray(values))` | `{ kind: "in", field: attr, values }` |
| `hasAttribute(attr, exists())` | `{ kind: "exists", field: attr }` |
| `hasAttribute(attr, gte(literal(n)))` | `{ kind: "gte", field: attr, value: n }` |
| `hasAttribute(attr, lt(literal(n)))` | `{ kind: "lt", field: attr, value: n }` |
| `allOf(policies)` | `{ kind: "and", filters: policies.map(policyToFilter) }` |
| `anyOf(policies)` | `{ kind: "or", filters: policies.map(policyToFilter) }` |
| `not(policy)` | `{ kind: "not", filter: policyToFilter(policy) }` |
| `hasSignature` | Not convertible — returns `undefined` |
| `hasRelationship` | Not convertible — returns `undefined` |

### 77b. Prisma Query Adapter

**Package:** `@hex-di/guard-prisma`

```typescript
import { policyToPrismaWhere } from "@hex-di/guard-prisma";

/**
 * Converts a PolicyFilter into a Prisma where clause.
 *
 * @param filter - The policy filter from policyToFilter()
 * @param fieldMapping - Optional mapping from policy field names to Prisma field names
 * @returns A Prisma-compatible where object
 */
function policyToPrismaWhere(
  filter: PolicyFilter,
  fieldMapping?: Readonly<Record<string, string>>
): PrismaWhereInput;
```

Usage:

```typescript
import { policyToFilter } from "@hex-di/guard";
import { policyToPrismaWhere } from "@hex-di/guard-prisma";

const policy = allOf(
  hasPermission(UserPerms.read),
  hasAttribute("departmentId", eq(subject("departmentId")))
);

const filter = policyToFilter(policy, currentSubject);
// { kind: "and", filters: [
//   { kind: "true" },
//   { kind: "eq", field: "departmentId", value: "engineering" }
// ]}

const where = policyToPrismaWhere(filter);
// { departmentId: "engineering" }

const users = await prisma.user.findMany({ where });
```

Field masking integration:

```typescript
import { policyToPrismaSelect } from "@hex-di/guard-prisma";

/**
 * Converts visible fields from a guard decision into a Prisma select clause.
 *
 * @param visibleFields - The visibleFields set from an Allow decision
 * @param fieldMapping - Optional mapping from policy field names to Prisma field names
 * @returns A Prisma-compatible select object, or undefined if all fields are visible
 */
function policyToPrismaSelect(
  visibleFields: ReadonlySet<string> | undefined,
  fieldMapping?: Readonly<Record<string, string>>
): PrismaSelectInput | undefined;
```

### 77c. Drizzle Query Adapter

**Package:** `@hex-di/guard-drizzle`

```typescript
import { policyToDrizzleWhere } from "@hex-di/guard-drizzle";

/**
 * Converts a PolicyFilter into a Drizzle SQL where condition.
 *
 * @param filter - The policy filter from policyToFilter()
 * @param table - The Drizzle table definition
 * @param fieldMapping - Optional mapping from policy field names to table column names
 * @returns A Drizzle-compatible SQL condition
 */
function policyToDrizzleWhere<T extends Table>(
  filter: PolicyFilter,
  table: T,
  fieldMapping?: Readonly<Record<string, keyof T["_"]["columns"]>>
): SQL;
```

Usage:

```typescript
import { policyToFilter } from "@hex-di/guard";
import { policyToDrizzleWhere } from "@hex-di/guard-drizzle";
import { users } from "./schema";

const filter = policyToFilter(policy, currentSubject);
const where = policyToDrizzleWhere(filter, users);

const result = await db.select().from(users).where(where);
```

### Query Conversion Packages

| Package | ORM | Filter → Query |
|---|---|---|
| `@hex-di/guard-prisma` | Prisma | `PolicyFilter` → Prisma `where` + `select` |
| `@hex-di/guard-drizzle` | Drizzle | `PolicyFilter` → Drizzle `SQL` conditions |

```
REQUIREMENT: policyToFilter() MUST be a pure function with no side effects.
             It MUST NOT access any external state, make network calls, or
             modify the input policy or subject.

REQUIREMENT: policyToFilter() MUST return undefined for policies that cannot
             be expressed as database filters (hasSignature, hasRelationship).
             Callers MUST handle undefined by falling back to in-memory
             filtering or rejecting the query.

RECOMMENDED: ORM query adapters SHOULD support a fieldMapping parameter to
             translate between policy attribute names and database column names.
             This enables policies to use domain language ("departmentId")
             while the database uses implementation names ("dept_id").
```

---

## 78. WASM Compilation

Guard's `evaluate()` function is pure and synchronous — a candidate for WebAssembly compilation. WASM-compiled guard enables sub-millisecond evaluation at the edge (Cloudflare Workers, Deno Deploy, Vercel Edge Functions) without shipping the full TypeScript runtime.

### Design

```
┌────────────────────────────────────────┐
│  guard-wasm build pipeline             │
│                                        │
│  Policy Bundle ──► WASM Module         │
│  (JSON)             (evaluate only)    │
│                                        │
│  Inputs:  subject JSON, resource JSON  │
│  Output:  { decision, reason }         │
└────────────────────────────────────────┘
```

**Package:** `@hex-di/guard-wasm`

```typescript
/**
 * Compiles a policy bundle into a WASM module that can evaluate
 * policies without the full guard runtime.
 *
 * The WASM module contains:
 * - The policy tree (baked in at compile time)
 * - The evaluate() logic (subset: no async, no signatures, no ReBAC)
 * - Permission and role checking
 * - Attribute matcher evaluation
 *
 * @param bundle - The policy bundle to compile
 * @returns A WASM binary (.wasm file content)
 */
function compilePolicyToWasm(bundle: PolicyBundle): Promise<Uint8Array>;

/**
 * Loads a compiled WASM guard module for edge evaluation.
 *
 * @param wasm - The WASM binary
 * @returns An evaluator that accepts subject/resource JSON and returns a decision
 */
function loadWasmGuard(wasm: Uint8Array): Promise<WasmGuardEvaluator>;

interface WasmGuardEvaluator {
  /** Evaluate a policy for a subject and optional resource. */
  readonly evaluate: (
    subjectJson: string,
    resourceJson?: string
  ) => WasmDecision;
}

interface WasmDecision {
  readonly decision: "allow" | "deny";
  readonly reason: string;
}
```

### Scope Limitations

The WASM module supports a subset of guard policies:

| Policy Kind | WASM Support | Notes |
|---|---|---|
| `hasPermission` | Yes | Permission set baked into subject JSON |
| `hasRole` | Yes | Role set baked into subject JSON |
| `hasAttribute` | Yes | Full matcher DSL support |
| `allOf` / `anyOf` / `not` | Yes | Composite evaluation |
| `hasSignature` | No | Requires `SignatureServicePort` (external I/O) |
| `hasRelationship` | No | Requires `RelationshipResolverPort` (external I/O) |

```
REQUIREMENT: compilePolicyToWasm() MUST reject policy bundles containing
             hasSignature or hasRelationship policies. These policy kinds
             require external I/O that is not available in the WASM sandbox.
             The rejection MUST produce a descriptive error identifying which
             policy kinds are unsupported.

REQUIREMENT: WASM guard evaluation MUST NOT produce audit trail entries.
             Audit trails require durable storage and clock synchronization
             that are not available at the edge. Edge evaluations are
             treated as pre-checks; the authoritative evaluation and audit
             entry are produced by the origin server.

RECOMMENDED: WASM modules SHOULD be versioned with the policy bundle's
             contentHash. Edge runtimes SHOULD cache WASM modules keyed
             by contentHash and pull new modules when the bundle changes.
```

---

## Integration Test Scenarios

### Distributed Evaluation (DE)

| ID | Scenario | Setup | Assert |
|---|---|---|---|
| DE-1 | Policy bundle publish and subscribe | Create two `MemoryPolicySync` instances; publish a bundle from one; subscribe on the other | Subscriber receives the bundle with matching contentHash and policies |
| DE-2 | Bundle signature verification | Create a signed bundle; attempt to load with correct and incorrect public key | Correct key: accepted. Incorrect key: rejected with error |
| DE-3 | Evaluation cache hit and miss | Create `MemoryEvaluationCache`; evaluate policy; check cache; evaluate again | First call: cache miss, full evaluation. Second call: cache hit, no evaluation |
| DE-4 | Cache invalidation by policy | Cache a decision; invalidate by policyHash; check cache | Cache returns undefined after invalidation |
| DE-5 | GxP cache rejection | Attempt to register EvaluationCachePort with gxp: true | Compile-time error (type-level) or runtime rejection |

### Framework Middleware (FM)

| ID | Scenario | Setup | Assert |
|---|---|---|---|
| FM-1 | Express middleware creates request scope | Create Express app with guard middleware; send request with valid bearer token | req.scope is defined; guarded port resolves successfully; scope is disposed after response |
| FM-2 | Express middleware returns 403 on denial | Same setup; send request with token lacking required permission | Response status 403; body contains AccessDeniedError information |
| FM-3 | Express middleware returns 401 on missing subject | Same setup; send request without authorization header | Response status 401 |
| FM-4 | Fastify plugin creates request scope | Create Fastify app with guard plugin; send request | request.scope is defined; guarded port resolves |
| FM-5 | tRPC middleware attaches scope to context | Create tRPC router with guard middleware; call procedure | ctx.scope is defined; guarded port resolves |

### Persistence (PS)

| ID | Scenario | Setup | Assert |
|---|---|---|---|
| PS-1 | Postgres audit trail conformance | Run createAuditTrailConformanceSuite() with Postgres adapter | All 17 conformance tests pass |
| PS-2 | Postgres audit trail hash chain | Write 10 entries; verify hash chain | verifyAuditChain() returns Ok for all entries |
| PS-3 | Postgres append-only enforcement | Attempt UPDATE on audit trail table | Database rejects with permission error |
| PS-4 | SQLite audit trail conformance | Run createAuditTrailConformanceSuite() with SQLite adapter | All 17 conformance tests pass |
| PS-5 | Postgres relationship resolver | Create relationships; check existence; check transitive | Direct: found. Transitive (depth 2): found. Beyond depth: not found |

### Query Conversion (QC)

| ID | Scenario | Setup | Assert |
|---|---|---|---|
| QC-1 | policyToFilter with hasAttribute eq | Convert `hasAttribute("ownerId", eq(subject("id")))` with subject `{ id: "user-1" }` | `{ kind: "eq", field: "ownerId", value: "user-1" }` |
| QC-2 | policyToFilter with allOf | Convert `allOf(hasPermission(read), hasAttribute("dept", eq(subject("dept"))))` | `{ kind: "and", filters: [{ kind: "true" }, { kind: "eq", field: "dept", value: "eng" }] }` |
| QC-3 | policyToFilter with hasSignature | Convert `hasSignature("approved")` | Returns `undefined` |
| QC-4 | Prisma where conversion | Convert a PolicyFilter to Prisma where | Valid Prisma where clause |
| QC-5 | Drizzle where conversion | Convert a PolicyFilter to Drizzle SQL | Valid Drizzle SQL condition |
| QC-6 | Field mask to Prisma select | Convert visibleFields `{"name", "email"}` to Prisma select | `{ name: true, email: true }` |

```
REQUIREMENT: The 21 integration test scenarios defined above (DE-1 through DE-5,
             FM-1 through FM-5, PS-1 through PS-5, QC-1 through QC-6) MUST be
             implemented in their respective test packages. All scenarios MUST
             pass before the package is published.

             Persistence adapter scenarios (PS-1 through PS-5) MUST run against
             real database instances (not mocks). CI pipelines MUST provision
             PostgreSQL and SQLite test instances.
```

---

_Previous: [17 - GxP Compliance Guide](../compliance/gxp.md) | Next: [19 - Developer Experience](./developer-experience.md)_
