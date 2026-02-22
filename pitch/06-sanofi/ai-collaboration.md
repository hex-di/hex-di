# AI Collaboration at Sanofi with HexDI

> How HexDI specifically improves AI-assisted development in a pharmaceutical context — where "AI-generated code that looks right but has wrong boundaries" is not an acceptable outcome.

---

## The Sanofi-Specific AI Challenge

Most organizations using AI coding tools face the general AI velocity gap (see [`01-problem/ai-velocity-gap.md`](../01-problem/ai-velocity-gap.md)): AI generates fast, humans review slowly, quality suffers.

Sanofi faces this challenge plus a layer that most organizations do not:

**In GxP development, an AI-generated service that incorrectly accesses regulated data without going through the approved access control channel is not just a technical problem — it is a compliance finding.**

If an AI agent generates code that bypasses an audit logging requirement, the consequence is not a production bug. It is a regulatory non-conformance that may require:
- Investigation and root cause analysis
- Change control documentation
- Potential product recall or trial suspension (in extreme cases)

The standard AI-assisted development workflow ("generate, review, merge") is insufficient for Sanofi's context because review is human, human reviewers get tired, and regulators do not accept "the reviewer missed it" as an explanation.

---

## What Makes HexDI Different for AI-Assisted Development

### 1. Explicit Contracts That AI Understands

In an unstructured codebase, an AI agent trying to add a new service must infer the architecture from patterns it sees. Different files show different patterns. The AI makes a best guess.

In a HexDI codebase, every service contract is explicit:

```typescript
const PatientDataPort = createPort<"PatientData", PatientDataService>("PatientData");
const AuditLogPort = createPort<"AuditLog", AuditLogService>("AuditLog");
```

An AI agent generating a new service that accesses patient data sees:
1. The `PatientDataPort` token — it knows what interface to use
2. The existing services that depend on `PatientDataPort` — it has examples to follow
3. The `AuditLogPort` token — it can see, from the existing services, that audit logging is required alongside patient data access

The AI generates code that follows the structural pattern because the structural pattern is explicit and visible — not buried in conventions.

### 2. Compiler Validation of AI Output

Regardless of how good the AI's inference is, the compiler validates the result. If the AI-generated service:
- Bypasses `AuditLogPort` → compile error if the existing architecture requires it to be declared
- Uses the wrong lifetime scope → compile error
- Creates a circular dependency → compile error
- References a port that doesn't exist → compile error

The AI is not the last line of defense. The compiler is. And the compiler does not get tired on Friday afternoons.

### 3. The MCP Server: AI with Live Architecture Access

HexDI's `@hex-di/mcp` package exposes the dependency graph to AI tools via the Model Context Protocol.

An AI assistant connected to the HexDI MCP server can query the live architecture:

**"What ports does the audit subsystem expose?"**
→ Returns the graph nodes and edges for the audit subsystem

**"What services currently depend on PatientDataPort?"**
→ Returns all services in the dependency graph that require `PatientDataPort`

**"Generate a new service that handles clinical trial enrollment, following existing patterns"**
→ AI queries the graph for existing enrollment-related services, understands the port patterns, and generates structurally consistent code

This is the difference between an AI that guesses at the architecture and an AI that queries it.

### 4. AI-Generated Sagas for Regulatory Workflows

Clinical trial workflows — patient enrollment, data collection, adverse event reporting, regulatory submission — are multi-step processes where partial completion creates regulatory risk. If step 3 succeeds and step 4 fails, the regulatory record is incomplete.

`@hex-di/saga` provides automatic compensation: every step declares its rollback action. If a saga fails midway, completed steps are automatically rolled back.

An AI agent generating a new regulatory workflow can:
1. Query the graph for existing saga patterns
2. Generate a new saga following the established step/compensation pattern
3. Have the compiler validate that every step's port dependencies are satisfied
4. Know that failed workflows will automatically compensate — no manual rollback code needed

---

## Concrete AI Collaboration Scenarios at Sanofi

### Scenario 1: AI Generates a New Clinical Data Service

**Task:** Add a service that aggregates patient outcomes for a Phase III trial report.

**Without HexDI:**
- AI generates a service that directly queries the patient database
- The service bypasses the `ClinicalDataPort` abstraction that was intended to enforce audit logging
- The bypass is not caught in code review (the reviewer doesn't know about the convention)
- The compliance gap is discovered during the next audit

**With HexDI:**
- AI queries the MCP server: "what ports exist for accessing clinical data?"
- AI generates a service that declares `ClinicalDataPort` and `AuditLogPort` in its `requires`
- The compiler validates that both ports are provided in the graph
- If the AI forgot `AuditLogPort`, the compile error surfaces immediately

### Scenario 2: AI Refactors a Logging Integration

**Task:** Migrate from a custom logging implementation to `@hex-di/logger` with a GxP-compliant formatter.

**Without HexDI:**
- AI must find every logging call site (search for `console.log`, `logger.log`, etc.)
- Some logging calls use different libraries in different files
- The migration is incomplete; some calls missed

**With HexDI:**
- All logging goes through `LoggerPort`
- AI updates the adapter: replace `ConsoleLoggerAdapter` with `PinoLoggerAdapter` using the GxP formatter
- One line change in the GraphBuilder
- Compiler confirms every `LoggerPort` consumer will receive the new adapter
- No missed call sites — there are no call sites, only port declarations

### Scenario 3: AI Generates Test Infrastructure for Compliance Testing

**Task:** Generate tests that verify the audit logging behavior of the patient data subsystem.

**Without HexDI:**
- Test infrastructure requires mocking global logging calls
- Tests are fragile (depend on exact log message format)
- Tests don't verify the structural relationship between the service and the logger

**With HexDI:**
- AI uses `TestGraphBuilder.override(mockAuditLogger)` to inject a mock
- Test verifies: when the service processes patient data, the mock `AuditLogPort` received the expected record
- The test is structural — it verifies the service *actually depends on* the audit logger, not just that it happens to call it

---

## The Compliance Confidence Equation

| Factor | Without HexDI | With HexDI |
|---|---|---|
| AI follows access control patterns | Depends on inference | Enforced by compiler |
| AI generates audit logging | Depends on convention | Required by port declaration |
| AI creates compliant workflow patterns | Depends on training data | Guided by existing graph + validated by compiler |
| Human review catches AI gaps | Depends on reviewer attention | Backup; compiler is primary catch |
| Regulatory audit finds AI-generated gaps | Possible; human review failed | Structurally impossible if the code compiled |

HexDI does not eliminate the need for human judgment in AI-assisted development. It changes human judgment from "checking structural correctness" (which the compiler does better) to "checking business logic correctness" (which humans do better).

In a regulated environment, this separation is the difference between a manageable review burden and an unmanageable one.
