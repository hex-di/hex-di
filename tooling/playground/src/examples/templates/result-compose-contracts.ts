/**
 * Result: Contract Composition
 *
 * Demonstrates ComposeContracts — sequentially composing effect contracts
 * where the output of the first feeds the input of the second.
 * Scenario: loan origination pipeline — credit check feeds risk assessment.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import {
  ok, err, type Result,
  type EffectContract, type ComposeContracts, type TaggedError,
} from "@hex-di/result";

// --- Domain errors ---
type CreditCheckFailed = TaggedError<"CreditCheckFailed", { score: number }>;
type DataUnavailable = TaggedError<"DataUnavailable", { source: string }>;
type RiskTooHigh = TaggedError<"RiskTooHigh", { riskScore: number; threshold: number }>;
type ModelError = TaggedError<"ModelError", { model: string }>;

// --- Individual contracts ---
type CreditCheckContract = EffectContract<
  string,
  { score: number; history: string[] },
  CreditCheckFailed | DataUnavailable
>;

type RiskAssessmentContract = EffectContract<
  { score: number; history: string[] },
  { approved: boolean; riskLevel: "low" | "medium" | "high" },
  RiskTooHigh | ModelError
>;

// ComposeContracts merges: Input=string, Output={approved,riskLevel}, Effects=all four
type LoanPipelineContract = ComposeContracts<CreditCheckContract, RiskAssessmentContract>;

// --- Implementations ---
function creditCheck(
  applicantId: string
): Result<{ score: number; history: string[] }, CreditCheckFailed | DataUnavailable> {
  if (applicantId === "no-data") return err({ _tag: "DataUnavailable", source: "Equifax" });
  if (applicantId === "bad-credit") return err({ _tag: "CreditCheckFailed", score: 450 });
  return ok({ score: 750, history: ["mortgage-2020", "auto-2022"] });
}

function riskAssessment(
  input: { score: number; history: string[] }
): Result<{ approved: boolean; riskLevel: "low" | "medium" | "high" }, RiskTooHigh | ModelError> {
  const riskScore = 1000 - input.score;
  if (riskScore > 600) return err({ _tag: "RiskTooHigh", riskScore, threshold: 600 });
  const riskLevel = riskScore < 200 ? "low" : riskScore < 400 ? "medium" : "high";
  return ok({ approved: true, riskLevel });
}

// --- Pipeline ---
function loanPipeline(applicantId: string) {
  return creditCheck(applicantId).andThen(riskAssessment);
}

console.log("--- Good applicant ---");
console.log(loanPipeline("good-applicant"));

console.log("\\n--- No credit data ---");
console.log(loanPipeline("no-data"));

console.log("\\n--- Bad credit ---");
console.log(loanPipeline("bad-credit"));

console.log("\\nContract composition demonstrated.");
`;

export const resultComposeContracts: ExampleTemplate = {
  id: "result-compose-contracts",
  title: "Result: Contract Composition",
  description: "ComposeContracts — sequential composition of effect contracts with merged effects",
  category: "result",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "health",
};
