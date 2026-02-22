# References for @hex-di/clock Implementation

## Similar Implementations

The user indicated the spec is self-contained and no reference implementations were requested.
The spec at `spec/libs/clock/` (SPEC-CLK-001 Rev 2.9) provides complete implementation guidance.

## Key Spec Sections

| Section | Location | Contains |
|---|---|---|
| Ports | `02-clock-port.md`, `03-sequence-generator.md` | Interface definitions, behavioral contracts |
| Adapters | `04-platform-adapters.md` | System/Edge/HostBridge adapter specs |
| Testing | `05-testing-support.md` | Virtual adapter specs |
| Integration | `07-integration.md` | Graph registration patterns |
| API Reference | `08-api-reference.md` | Complete API surface with Tier 1/2/3 table |
| DoD | `09-definition-of-done.md` | 457 tests across 46 files (DoD 1–26) |
| Type System | `type-system/phantom-brands.md`, `type-system/structural-safety.md` | Brand patterns |
| GxP | `06-gxp-compliance/` | Compliance requirements (informational for implementation) |

## Structural Reference (Package Layout)

Follow `libs/logger/core/` as the closest structural analog:
- `libs/logger/core/package.json` — package.json template
- `libs/logger/core/tsconfig.json` — tsconfig template
- `libs/logger/core/eslint.config.js` — eslint config template
- `libs/logger/core/vitest.config.ts` — vitest config template
