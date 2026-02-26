import type { ReactNode } from "react";
import { HeroSlide } from "./01-hero";
import { CurrentRolesSlide } from "./02-current-roles";
import { ScatteredChecksSlide } from "./03-scattered-checks";
import { GapsSlide } from "./04-gaps";
import { PermissionsSlide } from "./05-permissions";
import { RolesSlide } from "./06-roles";
import { SubjectsSlide } from "./07-subjects";
import { EvaluateSlide } from "./08-evaluate";
import { CombinatorsSlide } from "./09-combinators";
import { AbacMatchersSlide } from "./10-abac-matchers";
import { BrandScopingSlide } from "./11-brand-scoping";
import { FieldVisibilitySlide } from "./12-field-visibility";
import { CompoundPoliciesSlide } from "./13-compound-policies";
import { HybridLayersSlide } from "./14-hybrid-layers";
import { MigrationOverviewSlide } from "./15-migration-overview";
import { BootstrapSlide } from "./16-bootstrap";
import { PolicyRegistrySlide } from "./17-policy-registry";
import { SubjectAdapterSlide } from "./18-subject-adapter";
import { ComponentMigrationSlide } from "./19-component-migration";
import { RouteGuardsSlide } from "./20-route-guards";
import { AuditTrailSlide } from "./21-audit-trail";
import { BatchEvalSlide } from "./22-batch-eval";
import { SerializationSlide } from "./23-serialization";
import { DevtoolsSlide } from "./24-devtools";
import { ClosingSlide } from "./25-closing";

export interface SlideMetadata {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly phase: number;
  readonly component: () => ReactNode;
}

export const slides: readonly SlideMetadata[] = [
  // Phase 1: THE PROBLEM
  { id: "hero", number: 1, title: "Initialize", phase: 1, component: HeroSlide },
  {
    id: "current-roles",
    number: 2,
    title: "Hardcoded Roles",
    phase: 1,
    component: CurrentRolesSlide,
  },
  {
    id: "scattered-checks",
    number: 3,
    title: "Scattered Checks",
    phase: 1,
    component: ScatteredChecksSlide,
  },
  { id: "gaps", number: 4, title: "Five Gaps", phase: 1, component: GapsSlide },

  // Phase 2: GUARD PRIMITIVES
  {
    id: "permissions",
    number: 5,
    title: "Permission Tokens",
    phase: 2,
    component: PermissionsSlide,
  },
  { id: "roles", number: 6, title: "Roles & Inheritance", phase: 2, component: RolesSlide },
  { id: "subjects", number: 7, title: "Auth Subjects", phase: 2, component: SubjectsSlide },
  { id: "evaluate", number: 8, title: "The Evaluator", phase: 2, component: EvaluateSlide },
  {
    id: "combinators",
    number: 9,
    title: "Policy Combinators",
    phase: 2,
    component: CombinatorsSlide,
  },

  // Phase 3: COMPOSITION
  {
    id: "abac-matchers",
    number: 10,
    title: "Attribute-Based Access",
    phase: 3,
    component: AbacMatchersSlide,
  },
  {
    id: "brand-scoping",
    number: 11,
    title: "Brand Scoping",
    phase: 3,
    component: BrandScopingSlide,
  },
  {
    id: "field-visibility",
    number: 12,
    title: "Field Visibility",
    phase: 3,
    component: FieldVisibilitySlide,
  },
  {
    id: "compound-policies",
    number: 13,
    title: "Compound Policies",
    phase: 3,
    component: CompoundPoliciesSlide,
  },
  {
    id: "hybrid-layers",
    number: 14,
    title: "Hybrid Layers",
    phase: 3,
    component: HybridLayersSlide,
  },

  // Phase 4: DAVINCI MIGRATION
  {
    id: "migration-overview",
    number: 15,
    title: "Migration Path",
    phase: 4,
    component: MigrationOverviewSlide,
  },
  { id: "bootstrap", number: 16, title: "Bootstrap Guard", phase: 4, component: BootstrapSlide },
  {
    id: "policy-registry",
    number: 17,
    title: "Centralized Policies",
    phase: 4,
    component: PolicyRegistrySlide,
  },
  {
    id: "subject-adapter",
    number: 18,
    title: "Subject Adapter",
    phase: 4,
    component: SubjectAdapterSlide,
  },
  {
    id: "component-migration",
    number: 19,
    title: "Component Migration",
    phase: 4,
    component: ComponentMigrationSlide,
  },
  {
    id: "route-guards",
    number: 20,
    title: "Route Protection",
    phase: 4,
    component: RouteGuardsSlide,
  },

  // Phase 5: VISIBILITY & QUALITY
  { id: "audit-trail", number: 21, title: "Audit Trail", phase: 5, component: AuditTrailSlide },
  { id: "batch-eval", number: 22, title: "Batch Evaluation", phase: 5, component: BatchEvalSlide },
  {
    id: "serialization",
    number: 23,
    title: "Serialization",
    phase: 5,
    component: SerializationSlide,
  },
  { id: "devtools", number: 24, title: "DevTools", phase: 5, component: DevtoolsSlide },
  { id: "closing", number: 25, title: "Closing", phase: 5, component: ClosingSlide },
];
