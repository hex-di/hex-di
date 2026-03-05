# Contract Composition

Demonstrates `ComposeContracts` — sequentially composing two effect contracts where the output of the first feeds into the input of the second, with effects merged.

**Domain:** Loan origination pipeline — credit check feeds into risk assessment.

## Code

```typescript
import {
  ok,
  err,
  type Result,
  type EffectContract,
  type ComposeContracts,
  type SatisfiesContract,
  type TaggedError,
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

// --- Composed contract: credit check -> risk assessment ---
type LoanPipelineContract = ComposeContracts<CreditCheckContract, RiskAssessmentContract>;
// EffectContract<string, { approved: boolean; riskLevel: ... }, CreditCheckFailed | DataUnavailable | RiskTooHigh | ModelError>

// --- Implementations ---
function creditCheck(
  applicantId: string
): Result<{ score: number; history: string[] }, CreditCheckFailed | DataUnavailable> {
  if (applicantId === "no-data") return err({ _tag: "DataUnavailable", source: "Equifax" });
  if (applicantId === "bad-credit") return err({ _tag: "CreditCheckFailed", score: 450 });
  return ok({ score: 750, history: ["mortgage-2020", "auto-2022"] });
}

function riskAssessment(input: {
  score: number;
  history: string[];
}): Result<{ approved: boolean; riskLevel: "low" | "medium" | "high" }, RiskTooHigh | ModelError> {
  const riskScore = 1000 - input.score;
  if (riskScore > 600) return err({ _tag: "RiskTooHigh", riskScore, threshold: 600 });
  const riskLevel = riskScore < 200 ? "low" : riskScore < 400 ? "medium" : "high";
  return ok({ approved: true, riskLevel });
}

// --- Pipeline ---
function loanPipeline(applicantId: string) {
  return creditCheck(applicantId).andThen(riskAssessment);
}

// --- Runtime ---
console.log("--- Good applicant ---");
console.log(loanPipeline("good-applicant"));

console.log("\n--- No credit data ---");
console.log(loanPipeline("no-data"));

console.log("\n--- Bad credit ---");
console.log(loanPipeline("bad-credit"));
```

## Key Takeaways

- `ComposeContracts<C1, C2>` produces a new contract: `EffectContract<C1.In, C2.Out, C1.Effects | C2.Effects>`
- Composition fails at the type level with `ContractCompositionError` if `C1.Out` is not assignable to `C2.In`
- Effects from both stages are automatically merged into the composed contract
- Enables type-safe pipeline design where each stage's contract is independently verifiable
