# Guard × DaVinci — Manuscript

Each markdown file maps 1:1 to a slide component. Content is organized in 5 phases.

## Phase 1: THE PROBLEM (slides 01–04)

DaVinci's current authorization pain points — real code from `genai-front-web`.

| Slide | File                     | Title                       |
| ----- | ------------------------ | --------------------------- |
| 01    | `01-hero.md`             | @hex-di/guard × DaVinci     |
| 02    | `02-current-roles.md`    | Hardcoded Roles             |
| 03    | `03-scattered-checks.md` | Scattered Permission Checks |
| 04    | `04-gaps.md`             | Five Authorization Gaps     |

## Phase 2: GUARD PRIMITIVES (slides 05–09)

Core building blocks of the Guard library.

| Slide | File                | Title               |
| ----- | ------------------- | ------------------- |
| 05    | `05-permissions.md` | Permission Tokens   |
| 06    | `06-roles.md`       | Roles & Inheritance |
| 07    | `07-subjects.md`    | Auth Subjects       |
| 08    | `08-evaluate.md`    | The Evaluator       |
| 09    | `09-combinators.md` | Policy Combinators  |

## Phase 3: COMPOSITION (slides 10–14)

Advanced patterns — ABAC, brand scoping, field visibility, hybrid layers.

| Slide | File                      | Title                       |
| ----- | ------------------------- | --------------------------- |
| 10    | `10-abac-matchers.md`     | Attribute-Based Access      |
| 11    | `11-brand-scoping.md`     | Brand Scoping Policy        |
| 12    | `12-field-visibility.md`  | Field Visibility            |
| 13    | `13-compound-policies.md` | Compound Policies           |
| 14    | `14-hybrid-layers.md`     | Hybrid Authorization Layers |

## Phase 4: DAVINCI MIGRATION (slides 15–20)

Concrete replacement path for the DaVinci codebase.

| Slide | File                        | Title                |
| ----- | --------------------------- | -------------------- |
| 15    | `15-migration-overview.md`  | Migration Path       |
| 16    | `16-bootstrap.md`           | Bootstrap Guard      |
| 17    | `17-policy-registry.md`     | Centralized Policies |
| 18    | `18-subject-adapter.md`     | Subject Adapter      |
| 19    | `19-component-migration.md` | Component Migration  |
| 20    | `20-route-guards.md`        | Route Protection     |

## Phase 5: VISIBILITY & QUALITY (slides 21–25)

What you gain — audit trail, batch evaluation, serialization, devtools.

| Slide | File                  | Title                   |
| ----- | --------------------- | ----------------------- |
| 21    | `21-audit-trail.md`   | Audit Trail             |
| 22    | `22-batch-eval.md`    | Batch Evaluation        |
| 23    | `23-serialization.md` | Serialization           |
| 24    | `24-devtools.md`      | DevTools Integration    |
| 25    | `25-closing.md`       | Authorization, Visible. |

## Content Sources

| Slide | Playground Source                             | DaVinci Source                                               |
| ----- | --------------------------------------------- | ------------------------------------------------------------ |
| 02    | —                                             | `stores/user.ts` (Role enum, derivePermissions)              |
| 03    | —                                             | `brand-header.tsx`, `create-item-button.tsx`, `run-item.tsx` |
| 04    | —                                             | `router.tsx`, `settings/config/routes.config.ts`             |
| 05    | guard-basic-roles, guard-cms-authorization    | —                                                            |
| 06    | guard-role-hierarchy, guard-cms-authorization | stores/user.ts (roles)                                       |
| 07    | guard-basic-roles                             | `/user/me` response shape                                    |
| 08    | guard-basic-roles                             | —                                                            |
| 09    | guard-composite-policies                      | derivePermissions logic                                      |
| 10    | guard-attribute-checks                        | —                                                            |
| 11    | guard-cms-authorization (brand scoping)       | brand-selector.tsx                                           |
| 12    | guard-field-visibility                        | —                                                            |
| 13    | guard-cms-authorization (compound policies)   | derivePermissions                                            |
| 14    | guard-hybrid-patterns                         | —                                                            |
| 15–20 | —                                             | Multiple DaVinci components                                  |
| 21    | guard library audit types                     | —                                                            |
| 22    | guard-batch-evaluation                        | derivePermissions                                            |
| 23    | guard-batch-evaluation                        | —                                                            |
| 24    | devtools-ui guard panel                       | —                                                            |
| 25    | —                                             | —                                                            |
