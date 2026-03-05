---
id: UX-SF-068
kind: capability
title: "Log In and Manage API Tokens"
status: active
features: [FEAT-SF-016]
behaviors: [BEH-SF-101, BEH-SF-102, BEH-SF-113]
persona: [developer, admin]
surface: [desktop, cli]
---

# Log In and Manage API Tokens

## Use Case

A developer opens the Auth & Tokens in the desktop app. In solo mode, this may be minimal (local auth). In SaaS mode, this involves OAuth login, token generation for CI/CD, token rotation, and revocation. API tokens enable headless/programmatic access. The same operation is accessible via CLI (`specforge login`) for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌───────────┐ ┌─────────────────┐ ┌───────────┐ ┌─────────┐
│ Developer │ │   Desktop App   │ │AuthService│ │ Browser │
└─────┬─────┘ └────────┬────────┘ └─────┬─────┘ └────┬────┘
      │ login    │         │            │
      │─────────►│         │            │
      │         │ initOAuth│            │
      │         │─────────►│            │
      │         │ AuthURL  │            │
      │         │◄─────────│            │
      │         │ open OAuth page       │
      │         │──────────────────────►│
      │         │         │   consent   │
      │         │         │◄────────────│
      │         │TokenPair│            │
      │         │◄─────────│            │
      │         │┌───────┐│            │
      │         ││Store  ││            │
      │         ││creds  ││            │
      │         │└───────┘│            │
      │ logged  │         │            │
      │◄─────────│         │            │
      │         │         │            │
      │ tokens  │         │            │
      │ create  │         │            │
      │─────────►│         │            │
      │         │createTkn│            │
      │         │─────────►│            │
      │         │APIToken{}│            │
      │         │◄─────────│            │
      │ secret  │         │            │
      │◄─────────│         │            │
      │         │         │            │
      │ tokens  │         │            │
      │ list    │         │            │
      │─────────►│         │            │
      │         │listTkns()│            │
      │         │─────────►│            │
      │         │ Tokens[] │            │
      │         │◄─────────│            │
      │ list    │         │            │
      │◄─────────│         │            │
      │         │         │            │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant DesktopApp as Desktop App (Auth & Tokens)
    participant Auth as AuthService
    participant Browser

    Dev->>+DesktopApp: Open Auth & Tokens
    DesktopApp->>+Auth: initiateOAuth() (BEH-SF-101)
    Auth-->>DesktopApp: AuthURL
    DesktopApp->>Browser: Open OAuth consent page
    Browser-->>Auth: User grants consent
    Auth-->>-DesktopApp: TokenPair{access, refresh} (BEH-SF-102)
    DesktopApp->>DesktopApp: Store credentials in keychain
    DesktopApp-->>-Dev: Logged in successfully

    Dev->>+DesktopApp: Click "Generate Token"
    DesktopApp->>+Auth: createToken(name, expiry)
    Auth-->>-DesktopApp: APIToken{id, secret} (BEH-SF-113)
    DesktopApp-->>-Dev: Token created (secret shown once)

    Dev->>+DesktopApp: View token list
    DesktopApp->>+Auth: listTokens()
    Auth-->>-DesktopApp: Tokens[]{id, name, expiry, lastUsed}
    DesktopApp-->>-Dev: Token list
```

### CLI

```text
┌───────────┐ ┌─────┐ ┌───────────┐ ┌─────────┐
│ Developer │ │ CLI │ │AuthService│ │ Browser │
└─────┬─────┘ └──┬──┘ └─────┬─────┘ └────┬────┘
      │ login    │         │            │
      │─────────►│         │            │
      │         │ initOAuth│            │
      │         │─────────►│            │
      │         │ AuthURL  │            │
      │         │◄─────────│            │
      │         │ open OAuth page       │
      │         │──────────────────────►│
      │         │         │   consent   │
      │         │         │◄────────────│
      │         │TokenPair│            │
      │         │◄─────────│            │
      │         │┌───────┐│            │
      │         ││Store  ││            │
      │         ││creds  ││            │
      │         │└───────┘│            │
      │ logged  │         │            │
      │◄─────────│         │            │
      │         │         │            │
      │ tokens  │         │            │
      │ create  │         │            │
      │─────────►│         │            │
      │         │createTkn│            │
      │         │─────────►│            │
      │         │APIToken{}│            │
      │         │◄─────────│            │
      │ secret  │         │            │
      │◄─────────│         │            │
      │         │         │            │
      │ tokens  │         │            │
      │ list    │         │            │
      │─────────►│         │            │
      │         │listTkns()│            │
      │         │─────────►│            │
      │         │ Tokens[] │            │
      │         │◄─────────│            │
      │ list    │         │            │
      │◄─────────│         │            │
      │         │         │            │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant CLI
    participant Auth as AuthService
    participant Browser

    Dev->>+CLI: specforge login
    CLI->>+Auth: initiateOAuth() (BEH-SF-101)
    Auth-->>CLI: AuthURL
    CLI->>Browser: Open OAuth consent page
    Browser-->>Auth: User grants consent
    Auth-->>-CLI: TokenPair{access, refresh} (BEH-SF-102)
    CLI->>CLI: Store credentials in keychain
    CLI-->>-Dev: Logged in successfully

    Dev->>+CLI: specforge tokens create --name ci-token --expiry 90d
    CLI->>+Auth: createToken(name, expiry)
    Auth-->>-CLI: APIToken{id, secret} (BEH-SF-113)
    CLI-->>-Dev: Token created (secret shown once)

    Dev->>+CLI: specforge tokens list
    CLI->>+Auth: listTokens()
    Auth-->>-CLI: Tokens[]{id, name, expiry, lastUsed}
    CLI-->>-Dev: Token list
```

## Steps

1. Open the Auth & Tokens in the desktop app
2. System opens browser for OAuth consent and exchanges tokens (BEH-SF-102)
3. Credentials are stored securely in the system keychain
4. Generate API token: `specforge tokens create --name ci-token --expiry 90d` (BEH-SF-113)
5. List tokens: `specforge tokens list`
6. Revoke a token: `specforge tokens revoke <token-id>`
7. Log out: `specforge logout`

## Traceability

| Behavior   | Feature     | Role in this capability                |
| ---------- | ----------- | -------------------------------------- |
| BEH-SF-101 | FEAT-SF-016 | Authentication flow initiation         |
| BEH-SF-102 | FEAT-SF-016 | OAuth token exchange and storage       |
| BEH-SF-113 | FEAT-SF-016 | CLI auth and token management commands |
