import type { ReactNode } from "react";
import { HeroSlide } from "./01-hero";
import { ProblemSlide } from "./02-problem";
import { PermissionsSlide } from "./03-permissions";
import { PermissionGroupsSlide } from "./04-permission-groups";
import { RolesSlide } from "./05-roles";
import { PoliciesSlide } from "./06-policies";
import { AdvancedPoliciesSlide } from "./07-advanced-policies";
import { EvaluatorSlide } from "./08-evaluator";
import { AuthSubjectSlide } from "./09-auth-subject";
import { GuardAdapterSlide } from "./10-guard-adapter";
import { PortGateSlide } from "./11-port-gate";
import { SerializationSlide } from "./12-serialization";
import { ReactProviderSlide } from "./13-react-provider";
import { ReactComponentsSlide } from "./14-react-components";
import { DavinciSetupSlide } from "./15-davinci-setup";
import { DavinciPoliciesSlide } from "./16-davinci-policies";
import { DavinciReactSlide } from "./17-davinci-react";
import { GxpSlide } from "./18-gxp";
import { TestingSlide } from "./19-testing";
import { RoadmapSlide } from "./20-roadmap";

export interface SlideMetadata {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly phase: number;
  readonly component: () => ReactNode;
}

export const slides: readonly SlideMetadata[] = [
  { id: "hero", number: 1, title: "Initialize", phase: 1, component: HeroSlide },
  { id: "problem", number: 2, title: "The Problem", phase: 1, component: ProblemSlide },
  {
    id: "permissions",
    number: 3,
    title: "Permission Tokens",
    phase: 1,
    component: PermissionsSlide,
  },
  {
    id: "permission-groups",
    number: 4,
    title: "Permission Groups",
    phase: 1,
    component: PermissionGroupsSlide,
  },
  { id: "roles", number: 5, title: "Roles & Inheritance", phase: 2, component: RolesSlide },
  { id: "policies", number: 6, title: "Policy Combinators", phase: 2, component: PoliciesSlide },
  {
    id: "advanced-policies",
    number: 7,
    title: "Advanced Policies",
    phase: 2,
    component: AdvancedPoliciesSlide,
  },
  { id: "evaluator", number: 8, title: "The Evaluator", phase: 2, component: EvaluatorSlide },
  { id: "auth-subject", number: 9, title: "Auth Subject", phase: 3, component: AuthSubjectSlide },
  {
    id: "guard-adapter",
    number: 10,
    title: "Guard Adapter",
    phase: 3,
    component: GuardAdapterSlide,
  },
  { id: "port-gate", number: 11, title: "Port Gate Hook", phase: 3, component: PortGateSlide },
  {
    id: "serialization",
    number: 12,
    title: "Serialization",
    phase: 3,
    component: SerializationSlide,
  },
  {
    id: "react-provider",
    number: 13,
    title: "React Provider",
    phase: 4,
    component: ReactProviderSlide,
  },
  {
    id: "react-components",
    number: 14,
    title: "Hooks & Components",
    phase: 4,
    component: ReactComponentsSlide,
  },
  {
    id: "davinci-setup",
    number: 15,
    title: "Davinci Setup",
    phase: 5,
    component: DavinciSetupSlide,
  },
  {
    id: "davinci-policies",
    number: 16,
    title: "Davinci Policies",
    phase: 5,
    component: DavinciPoliciesSlide,
  },
  {
    id: "davinci-react",
    number: 17,
    title: "Davinci React",
    phase: 5,
    component: DavinciReactSlide,
  },
  { id: "gxp", number: 18, title: "GxP Compliance", phase: 6, component: GxpSlide },
  { id: "testing", number: 19, title: "Testing Toolkit", phase: 6, component: TestingSlide },
  { id: "roadmap", number: 20, title: "Roadmap", phase: 6, component: RoadmapSlide },
];
