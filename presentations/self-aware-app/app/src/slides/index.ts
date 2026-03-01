import type { ReactNode } from "react";
import { HeroSlide } from "./01-hero";
import { SoftwareIsBlindSlide } from "./02-software-is-blind";
import { ThreeActorsSlide } from "./03-three-actors";
import { OldMechanicSlide } from "./04-old-mechanic";
import { ObdPortSlide } from "./05-obd-port";
import { SoftwareParallelSlide } from "./06-software-parallel";
import { CoreMechanicSlide } from "./07-core-mechanic";
import { EcosystemSlide } from "./08-ecosystem";
import { ThreeLayersSlide } from "./09-three-layers";
import { QueryableSlide } from "./10-queryable";
import { ConcreteScenarioSlide } from "./11-concrete-scenario";
import { RoadmapSlide } from "./12-roadmap";
import { WhyNowSlide } from "./13-why-now";
import { ComparisonSlide } from "./14-comparison";
import { EndStateSlide } from "./15-end-state";
import { ClosingSlide } from "./16-closing";

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
    id: "software-is-blind",
    number: 2,
    title: "Software Is Blind",
    phase: 1,
    component: SoftwareIsBlindSlide,
  },
  {
    id: "three-actors",
    number: 3,
    title: "Three Actors",
    phase: 1,
    component: ThreeActorsSlide,
  },

  // Phase 2: THE INSIGHT
  {
    id: "old-mechanic",
    number: 4,
    title: "The Old Mechanic",
    phase: 2,
    component: OldMechanicSlide,
  },
  { id: "obd-port", number: 5, title: "The OBD-II Port", phase: 2, component: ObdPortSlide },
  {
    id: "software-parallel",
    number: 6,
    title: "The Software Parallel",
    phase: 2,
    component: SoftwareParallelSlide,
  },

  // Phase 3: THE ARCHITECTURE
  {
    id: "core-mechanic",
    number: 7,
    title: "The Core Mechanic",
    phase: 3,
    component: CoreMechanicSlide,
  },
  { id: "ecosystem", number: 8, title: "The Ecosystem", phase: 3, component: EcosystemSlide },
  {
    id: "three-layers",
    number: 9,
    title: "Three Layers",
    phase: 3,
    component: ThreeLayersSlide,
  },

  // Phase 4: THE DIAGNOSTIC PORT
  {
    id: "queryable",
    number: 10,
    title: "What Can Be Queried",
    phase: 4,
    component: QueryableSlide,
  },
  {
    id: "concrete-scenario",
    number: 11,
    title: "The Concrete Scenario",
    phase: 4,
    component: ConcreteScenarioSlide,
  },

  // Phase 5: THE VISION
  { id: "roadmap", number: 12, title: "Five Phases", phase: 5, component: RoadmapSlide },
  { id: "why-now", number: 13, title: "Why Now", phase: 5, component: WhyNowSlide },
  {
    id: "comparison",
    number: 14,
    title: "Framework Comparison",
    phase: 5,
    component: ComparisonSlide,
  },
  { id: "end-state", number: 15, title: "The End State", phase: 5, component: EndStateSlide },
  { id: "closing", number: 16, title: "Closing", phase: 5, component: ClosingSlide },
];
