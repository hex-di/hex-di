# 06 — Mandatory Access Control (MAC)

## Core Concept

A central authority assigns classification levels to both subjects and resources. Access decisions are mandatory — no user can override them, not even resource owners.

## How It Works — Bell-LaPadula Model

```
Classification Levels (low → high):
  Unclassified → Confidential → Secret → Top Secret

Rules:
  "No Read Up"   — Subject cannot read above their clearance
  "No Write Down" — Subject cannot write below their clearance

Example:
  Subject (Secret clearance) can:
    ✓ Read Unclassified, Confidential, Secret
    ✗ Read Top Secret
    ✓ Write Secret, Top Secret
    ✗ Write Unclassified, Confidential
```

## Real-World Examples

- **SELinux**: Mandatory policies on Linux (Type Enforcement)
- **AppArmor**: Application-level MAC on Ubuntu/SUSE
- **Military/Government**: Classified document handling
- **iOS/Android sandboxing**: App isolation enforced by OS

## Code Example

```typescript
const LEVELS = ["unclassified", "confidential", "secret", "top-secret"] as const;
type Level = (typeof LEVELS)[number];

function levelRank(level: Level): number {
  return LEVELS.indexOf(level);
}

function canRead(subjectLevel: Level, resourceLevel: Level): boolean {
  return levelRank(subjectLevel) >= levelRank(resourceLevel); // No read up
}

function canWrite(subjectLevel: Level, resourceLevel: Level): boolean {
  return levelRank(subjectLevel) <= levelRank(resourceLevel); // No write down
}
```

## Strengths

- Strongest security guarantees — mathematically provable
- Prevents information leakage between classification levels
- Immune to Trojan horse attacks (unlike DAC)
- Central control — no user can bypass

## Weaknesses

- Rigid — very difficult to adapt to business needs
- Complex administration (label management)
- Poor usability — users often work around restrictions
- Overkill for most commercial applications
