import type { ReactNode } from "react";
import { HeroSlide } from "./01-hero";
import { ProblemSlide } from "./02-problem";
import { EvolutionSlide } from "./03-evolution";
import { AclSlide } from "./04-acl";
import { DacSlide } from "./05-dac";
import { MacSlide } from "./06-mac";
import { RbacSlide } from "./07-rbac";
import { AbacSlide } from "./08-abac";
import { CbacSlide } from "./09-cbac";
import { RebacSlide } from "./10-rebac";
import { PbacSlide } from "./11-pbac";
import { ContextRiskSlide } from "./12-context-risk";
import { ComparisonSlide } from "./13-comparison";
import { LibrariesSlide } from "./14-libraries";
import { HybridSlide } from "./15-hybrid";
import { ChoosingSlide } from "./16-choosing";
import { ImplementationSlide } from "./17-implementation";
import { FutureSlide } from "./18-future";

export interface SlideMetadata {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly phase: number;
  readonly component: () => ReactNode;
}

export const slides: readonly SlideMetadata[] = [
  // Phase 1: Foundations
  { id: "hero", number: 1, title: "Initialize", phase: 1, component: HeroSlide },
  { id: "problem", number: 2, title: "The Problem", phase: 1, component: ProblemSlide },
  { id: "evolution", number: 3, title: "Evolution", phase: 1, component: EvolutionSlide },

  // Phase 2: Traditional Models
  { id: "acl", number: 4, title: "ACL", phase: 2, component: AclSlide },
  { id: "dac", number: 5, title: "DAC", phase: 2, component: DacSlide },
  { id: "mac", number: 6, title: "MAC", phase: 2, component: MacSlide },

  // Phase 3: Role & Attribute Models
  { id: "rbac", number: 7, title: "RBAC", phase: 3, component: RbacSlide },
  { id: "abac", number: 8, title: "ABAC", phase: 3, component: AbacSlide },
  { id: "cbac", number: 9, title: "CBAC", phase: 3, component: CbacSlide },

  // Phase 4: Modern Models
  { id: "rebac", number: 10, title: "ReBAC", phase: 4, component: RebacSlide },
  { id: "pbac", number: 11, title: "PBAC", phase: 4, component: PbacSlide },
  {
    id: "context-risk",
    number: 12,
    title: "Context & Risk",
    phase: 4,
    component: ContextRiskSlide,
  },

  // Phase 5: Comparison & Tools
  {
    id: "comparison",
    number: 13,
    title: "Comparison Matrix",
    phase: 5,
    component: ComparisonSlide,
  },
  { id: "libraries", number: 14, title: "Libraries", phase: 5, component: LibrariesSlide },
  { id: "hybrid", number: 15, title: "Hybrid Approaches", phase: 5, component: HybridSlide },

  // Phase 6: Practical Guide
  { id: "choosing", number: 16, title: "Choosing a Model", phase: 6, component: ChoosingSlide },
  {
    id: "implementation",
    number: 17,
    title: "Implementation",
    phase: 6,
    component: ImplementationSlide,
  },
  { id: "future", number: 18, title: "The Future", phase: 6, component: FutureSlide },
];
