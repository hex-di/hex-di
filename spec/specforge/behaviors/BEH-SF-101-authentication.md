---
id: BEH-SF-101
kind: behavior
title: Authentication
status: active
id_range: 101--106
invariants: [INV-SF-16, INV-SF-24]
adrs: [ADR-017]
types: [auth, auth]
ports: [AuthPort]
---

# 14 — Authentication

**Decisions:** [ADR-017](../decisions/ADR-017-standalone-server-over-sidecar.md)

## BEH-SF-101: Solo No-Auth — NoOpAuthAdapter, All Methods Return Success

In solo self-hosted mode, no authentication is required. The `NoOpAuthAdapter` makes all auth methods return success with a default local identity.

### Contract

REQUIREMENT (BEH-SF-101): In solo mode, the `NoOpAuthAdapter` MUST be loaded. `login()` MUST return success with a default local `AuthSession` without requiring any credentials. `logout()`, `getSession()`, `refreshSession()`, and token management methods MUST all return success. No authentication check MUST ever block an operation.

### Verification

- No-auth test: call `login()` without credentials; verify success with a default session.
- All-methods test: call every `AuthPort` method; verify all return success.
- No-blocking test: perform graph operations, flow runs, and all features without authentication; verify none are blocked.

---

## BEH-SF-102: SaaS OAuth Login — GitHub/Google OAuth Flow, JWT Issuance

In SaaS mode, authentication uses OAuth (GitHub or Google) via SpecForge Cloud. The flow opens a browser, completes the OAuth handshake, and returns a JWT session token stored in the OS keychain.

### Contract

REQUIREMENT (BEH-SF-102): When `AuthPort.login()` is called in SaaS mode with `kind: 'oauth'` credentials, the system MUST: (a) initiate a browser-based OAuth flow with the specified provider (GitHub or Google), (b) exchange the OAuth code for a JWT via SpecForge Cloud, (c) return an `AuthSession` with `userId`, `token`, `expiresAt`, and optional `orgId`/`orgRole`. The JWT MUST be stored in the OS keychain for persistence.

### Verification

- OAuth flow test: call login with GitHub OAuth; verify the browser is opened and a JWT is returned.
- Token storage test: verify the JWT is stored in the OS keychain (macOS Keychain / Windows Credential Manager).
- Session content test: verify the `AuthSession` contains all required fields.

---

## BEH-SF-103: API Token Lifecycle — Create, Revoke, List (SaaS Only)

API tokens are long-lived, revocable tokens for CI/CD and headless CLI usage. Users create them via `AuthPort.createApiToken()`, list them via `listApiTokens()`, and revoke them via `revokeApiToken()`. API tokens are only available in SaaS mode.

### Contract

REQUIREMENT (BEH-SF-103): `AuthPort.createApiToken(name)` MUST create a new API token with the given name and return an `ApiToken` with `tokenId`, `name`, and `createdAt`. `listApiTokens()` MUST return all active tokens. `revokeApiToken(tokenId)` MUST permanently invalidate the token. Revoked tokens MUST NOT authenticate successfully. API tokens MUST only be available in SaaS mode.

### Verification

- Create test: create an API token; verify it is returned with a valid `tokenId`.
- Authenticate test: use the API token to authenticate; verify it succeeds.
- List test: create multiple tokens; call `listApiTokens()`; verify all are listed.
- Revoke test: revoke a token; attempt to use it; verify authentication fails.
- Mode test: verify API token methods are only available in SaaS mode; verify solo mode returns an unsupported error.

---

## BEH-SF-104: Session JWT Lifecycle — 24h Lifetime, Refreshable via Refresh Token

Session JWTs have a 24-hour lifetime and can be refreshed via a refresh token (30-day lifetime). Silent session renewal keeps users logged in without re-authentication.

### Contract

REQUIREMENT (BEH-SF-104): Session JWTs MUST have a 24-hour lifetime (`expiresAt`). `AuthPort.refreshSession()` MUST use the refresh token (30-day lifetime) to issue a new JWT without requiring re-authentication. When the refresh token expires, the user MUST re-authenticate. `getSession()` MUST return the current session or `undefined` if expired.

### Verification

- Expiry test: create a JWT; verify `expiresAt` is ~24 hours in the future.
- Refresh test: refresh a session; verify a new JWT is issued without re-authentication.
- Refresh expiry test: simulate a 30-day-old refresh token; verify re-authentication is required.
- Get session test: call `getSession()` with a valid JWT; verify the session is returned.
- Expired session test: call `getSession()` with an expired JWT; verify `undefined` is returned.

---

## BEH-SF-105: Organization Model — Owner/Admin/Member/Viewer Roles (SaaS Only)

Organizations are graph-level constructs with four roles: `owner` (full control), `admin` (member + project management), `member` (run flows, read/write graph, create projects), and `viewer` (read-only access). Organizations are only available in SaaS mode.

### Contract

REQUIREMENT (BEH-SF-105): The system MUST support four organization roles: `owner`, `admin`, `member`, `viewer`. Each role MUST have the specified permissions: owner = full control including delete org; admin = member management + all member permissions; member = run flows + read/write graph + create projects; viewer = read-only access. Roles MUST be stored as relationships in Neo4j. Organization features MUST only be available in SaaS mode.

### Verification

- Role enforcement test: create users with each role; verify permission boundaries (e.g., viewer cannot run flows).
- Owner test: verify owner can perform all operations including member management and org deletion.
- Admin test: verify admin can manage members but not delete the org.
- Member test: verify member can run flows and create projects but not manage members.
- Viewer test: verify viewer can only read data, not write.

---

## BEH-SF-106: Context Switching — Switch between Personal and Org Contexts (SaaS Only)

Users can switch between their personal graph context and organization contexts. The active context determines which graph is queried and written to. Context switching is only available in SaaS mode.

### Contract

REQUIREMENT (BEH-SF-106): `specforge org switch <org-name>` MUST change the active context to the specified org. `specforge org current` MUST show the active context. All subsequent commands, views, and API calls MUST be scoped to the active context. Switching context MUST NOT require re-authentication. Context switching MUST only be available in SaaS mode.

### Verification

- Switch test: switch to an org context; verify all operations are scoped to that org's graph.
- Current test: call `org current`; verify it displays the active context.
- Personal test: switch to personal context; verify operations are scoped to the personal graph.
- No re-auth test: switch contexts; verify no re-authentication is required.
- Mode test: verify context switching commands are only available in SaaS mode.
