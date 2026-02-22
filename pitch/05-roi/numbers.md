# ROI Numbers — Sourced Statistics

> Every number used in the HexDI pitch, with its source, methodology, and how it maps to a HexDI benefit.

---

## AI-Assisted Development Costs

### AI Slows Experienced Developers 19%
- **Claim:** Experienced developers using AI coding assistants on real tasks were 19% slower on average.
- **Source:** METR, *"Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity"*, July 2025. [metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)
- **Why it matters for HexDI:** The slowdown comes from review burden — developers spend more time validating AI output than writing code themselves. HexDI moves structural validation to the compiler, removing the primary source of this overhead.

### 66% of Developers Spend Extra Time Fixing AI Code
- **Claim:** 66% of developers report spending additional time correcting AI-generated code that was "almost right."
- **Source:** Greptile, *"State of AI Coding 2025"*. [greptile.com/state-of-ai-coding-2025](https://www.greptile.com/state-of-ai-coding-2025)
- **Why it matters for HexDI:** AI generates structurally incorrect wiring frequently. HexDI's compiler catches this before it reaches review.

### 71% of Developers Don't Merge AI Code Without Manual Review
- **Claim:** 71% of developers always manually review AI-generated code before merging.
- **Source:** Greptile, *"State of AI Coding 2025"*. [greptile.com/state-of-ai-coding-2025](https://www.greptile.com/state-of-ai-coding-2025)
- **Why it matters for HexDI:** Manual review is the current safety net. HexDI adds a structural safety net that operates before review, reducing its scope.

---

## Bug Detection Cost Multipliers

### Bugs Cost 30x More to Fix in Production Than at Design Time
- **Claim:** The cost to fix a defect increases by roughly 30x from the design/code phase to the production phase.
- **Source:** IBM Systems Sciences Institute, *"Relative Cost of Fixing Defects"*, widely cited in software engineering literature. [IBM Systems Sciences Institute study](https://www.ibm.com/topics/bug-tracking)
- **Why it matters for HexDI:** HexDI moves architectural defect detection from production (or even code review) to compile time — the earliest possible point. For a team fixing 10 architectural bugs per year at an average $3,000 production cost, this is $90,000 in avoidable cost vs $3,000 at compile time.

### 35–50% of Developer Time Spent on Debugging
- **Claim:** Developers spend 35–50% of their total working time debugging code.
- **Source:** Cambridge University study cited in multiple industry analyses; corroborated by ACM Queue and Stripe/Harris Poll developer productivity surveys.
- **Why it matters for HexDI:** Architectural errors are a disproportionate share of hard-to-debug problems. HexDI eliminates the class of "the service was wired to the wrong adapter" bugs entirely.

### Software Bugs Cost the Global Economy $312B Per Year
- **Claim:** Poor software quality costs the US economy alone approximately $2.08 trillion annually; global estimates put the bug-related portion at ~$312B.
- **Source:** Consortium for Information and Software Quality (CISQ), *"Cost of Poor Software Quality in the US"*, 2022.
- **Why it matters for HexDI:** Puts individual team savings in macroeconomic context. A team of 10 developers each saving 20% debugging time on architectural bugs is a measurable fraction of this.

---

## Onboarding Cost

### Onboarding a New Developer Costs ~$35,000
- **Claim:** When factoring in recruitment, onboarding, training, and the productivity loss of the new hire and their mentor, the total cost of onboarding a software developer is approximately $35,000.
- **Source:** DevOps Institute / FullScale, *"Developer Retention Costs & Onboarding"*, 2024. [fullscale.io/blog/developer-retention-costs-onboarding/](https://fullscale.io/blog/developer-retention-costs-onboarding/)
- **Why it matters for HexDI:** HexDI's self-documenting graph cuts onboarding time. For a team that onboards 3 developers per year, even halving this cost saves $52,500.

### Sprint Velocity Drops 25–40% When Integrating New Members
- **Claim:** Teams typically experience a 25–40% velocity reduction during the weeks following a new team member joining.
- **Source:** DevOps Institute, 2024.
- **Why it matters for HexDI:** The graph visualizer eliminates the primary source of new-hire drag: understanding the system's architecture.

### Senior Developers Lose 30% of Productivity Mentoring Architecture
- **Claim:** Senior developers spend approximately 30% of their time on architecture knowledge transfer to new hires.
- **Source:** DevOps Institute, 2024.
- **Why it matters for HexDI:** The system explains itself. This time is available for building.

---

## Downtime and Production Incidents

### Downtime Costs $5,600 Per Minute
- **Claim:** The average cost of IT infrastructure downtime is $5,600 per minute, totaling over $300,000 per hour.
- **Source:** Gartner research, widely cited. [Gartner IT Infrastructure Availability report](https://www.gartner.com/en)
- **Why it matters for HexDI:** Architectural defects that reach production (wrong adapter wired, circular dependency resolved at runtime) are a primary cause of application failures. HexDI catches these at compile time.

---

## Compliance Cost

### Manual Audit Preparation Takes 2–8 Weeks
- **Claim:** Teams preparing for software audits in regulated industries (pharma, medtech) typically spend 2–8 weeks manually reconstructing compliance evidence: documenting what talks to what, generating access control matrices, and verifying change history.
- **Source:** Industry estimates from GAMP 5 guidance and FDA 21 CFR Part 11 audit preparation documentation.
- **Why it matters for HexDI:** HexDI's dependency graph is always current and inspectable. A compliance report can be generated from the live system in hours, not weeks.

---

## Summary Calculation: Value Per 10-Developer Team Per Year

| Area | Baseline Cost | With HexDI | Annual Saving |
|---|---|---|---|
| AI review overhead (19% slower × 10 devs × $100k) | $190,000 in lost productivity | Structural validation removes primary bottleneck | ~$60,000 |
| Architectural bug debugging (5 prod bugs × $3,000 fix × 30x factor) | $450,000 vs $15,000 at compile time | Caught at compile, not production | ~$435,000 |
| Onboarding (3 hires/year × $35,000) | $105,000 | Graph self-documenting, cuts cost by ~50% | ~$52,500 |
| Compliance prep (2 audits × 3 dev-weeks × $3,000/week) | $18,000 | Generated from graph in hours | ~$15,000 |
| **Total** | **$763,000** | | **~$562,500** |

*These are order-of-magnitude estimates for illustration. Actual savings depend on team size, audit frequency, and current architecture quality.*

---

*Full source list: [METR 2025](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/) · [Greptile 2025](https://www.greptile.com/state-of-ai-coding-2025) · [DevOps Institute 2024](https://fullscale.io/blog/developer-retention-costs-onboarding/) · [IBM Systems Sciences](https://www.ibm.com/topics/bug-tracking) · [Gartner](https://www.gartner.com/en) · [CISQ 2022](https://www.it-cisq.org/the-cost-of-poor-software-quality-in-the-us-a-2022-report/)*
