# HexDI Result Specification

**Package:** `@hex-di/result`
**Version:** 0.1.0
**Status:** Draft
**Created:** 2026-02-07
**Last Updated:** 2026-02-07

---

## Summary

`@hex-di/result` brings Rust-style error handling to TypeScript. Errors are values, not exceptions. Every operation that can fail returns `Result<T, E>` -- a discriminated union of `Ok<T>` or `Err<E>`. Every async operation that can fail returns `ResultAsync<T, E>` -- a lazy wrapper around `Promise<Result<T, E>>` with full method chaining.

There are no thrown exceptions. There is no `try/catch`. There is no `null` standing in for "something went wrong." Errors are first-class citizens with types, transformations, and composition -- exactly like success values.

`@hex-di/result` integrates with HexDI's nervous system: container resolution errors become typed Results, tracing spans record Result outcomes, and the inspector can query error statistics across the dependency graph.

## Packages

| Package                  | Description                                                          |
| ------------------------ | -------------------------------------------------------------------- |
| `@hex-di/result`         | Core Result/ResultAsync types, constructors, combinators, generators |
| `@hex-di/result-testing` | Test utilities, assertions, matchers, mock error factories           |

## Table of Contents

### [01 - Overview & Philosophy](./01-overview.md)

1. [Overview](./01-overview.md#1-overview)
2. [Philosophy](./01-overview.md#2-philosophy)
3. [Package Structure](./01-overview.md#3-package-structure)
4. [Architecture Diagram](./01-overview.md#4-architecture-diagram)

### [02 - Core Types](./02-core-types.md)

5. [Result Discriminated Union](./02-core-types.md#5-result-discriminated-union)
6. [Ok and Err Variants](./02-core-types.md#6-ok-and-err-variants)
7. [ResultAsync](./02-core-types.md#7-resultasync)
8. [Type Utilities](./02-core-types.md#8-type-utilities)

### [03 - Constructors](./03-constructors.md)

9. [ok / err](./03-constructors.md#9-ok--err)
10. [fromThrowable](./03-constructors.md#10-fromthrowable)
11. [fromPromise / fromSafePromise](./03-constructors.md#11-frompromise--fromsafepromise)
12. [fromNullable](./03-constructors.md#12-fromnullable)
13. [fromPredicate](./03-constructors.md#13-frompredicate)
14. [tryCatch](./03-constructors.md#14-trycatch)

### [04 - Type Guards & Narrowing](./04-type-guards.md)

15. [isOk / isErr](./04-type-guards.md#15-isok--iserr)
16. [isResult / isResultAsync](./04-type-guards.md#16-isresult--isresultasync)
17. [Discriminated Union Narrowing](./04-type-guards.md#17-discriminated-union-narrowing)

### [05 - Transformations](./05-transformations.md)

18. [map](./05-transformations.md#18-map)
19. [mapErr](./05-transformations.md#19-maperr)
20. [mapBoth](./05-transformations.md#20-mapboth)
21. [flatten](./05-transformations.md#21-flatten)
22. [flip](./05-transformations.md#22-flip)

### [06 - Chaining](./06-chaining.md)

23. [andThen (flatMap)](./06-chaining.md#23-andthen-flatmap)
24. [orElse](./06-chaining.md#24-orelse)
25. [andTee](./06-chaining.md#25-andtee)
26. [orTee](./06-chaining.md#26-ortee)
27. [andThrough](./06-chaining.md#27-andthrough)
28. [Error Type Accumulation](./06-chaining.md#28-error-type-accumulation)

### [07 - Extraction](./07-extraction.md)

29. [match](./07-extraction.md#29-match)
30. [unwrapOr / unwrapOrElse](./07-extraction.md#30-unwrapor--unwraporelse)
31. [toNullable / toUndefined](./07-extraction.md#31-tonullable--toundefined)
32. [intoTuple](./07-extraction.md#32-intotuple)
33. [merge](./07-extraction.md#33-merge)
34. [expect / expectErr](./07-extraction.md#34-expect--expecterr)

### [08 - Combining](./08-combining.md)

35. [Result.all](./08-combining.md#35-resultall)
36. [Result.allSettled](./08-combining.md#36-resultallsettled)
37. [Result.any](./08-combining.md#37-resultany)
38. [Result.collect](./08-combining.md#38-resultcollect)
39. [Tuple & Record Overloads](./08-combining.md#39-tuple--record-overloads)

### [09 - ResultAsync](./09-async.md)

40. [ResultAsync Core](./09-async.md#40-resultasync-core)
41. [Async Constructors](./09-async.md#41-async-constructors)
42. [Async Chaining](./09-async.md#42-async-chaining)
43. [Sync-to-Async Bridges](./09-async.md#43-sync-to-async-bridges)
44. [Async Combining](./09-async.md#44-async-combining)

### [10 - Generator-Based Early Return](./10-generators.md)

45. [safeTry (sync)](./10-generators.md#45-safetry-sync)
46. [safeTry (async)](./10-generators.md#46-safetry-async)
47. [Yield Protocol](./10-generators.md#47-yield-protocol)
48. [Comparison with Rust's ? Operator](./10-generators.md#48-comparison-with-rusts--operator)

### [11 - Error Patterns](./11-error-patterns.md)

49. [Tagged Error Unions](./11-error-patterns.md#49-tagged-error-unions)
50. [Error Factories](./11-error-patterns.md#50-error-factories)
51. [Error Discrimination & Exhaustive Handling](./11-error-patterns.md#51-error-discrimination--exhaustive-handling)
52. [Error Hierarchy & Composition](./11-error-patterns.md#52-error-hierarchy--composition)

### [12 - HexDI Integration](./12-hexdi-integration.md)

53. [Container Resolution as Result](./12-hexdi-integration.md#53-container-resolution-as-result)
54. [Tracing Integration](./12-hexdi-integration.md#54-tracing-integration)
55. [Inspector Integration](./12-hexdi-integration.md#55-inspector-integration)
56. [Adapter Error Boundaries](./12-hexdi-integration.md#56-adapter-error-boundaries)

### [13 - Testing](./13-testing.md)

57. [Test Utilities](./13-testing.md#57-test-utilities)
58. [Assertion Helpers](./13-testing.md#58-assertion-helpers)
59. [Mock Error Factories](./13-testing.md#59-mock-error-factories)
60. [Property-Based Testing Patterns](./13-testing.md#60-property-based-testing-patterns)

### [14 - API Reference](./14-api-reference.md)

61. [Constructors](./14-api-reference.md#61-constructors)
62. [Instance Methods](./14-api-reference.md#62-instance-methods)
63. [Static Methods](./14-api-reference.md#63-static-methods)
64. [ResultAsync Methods](./14-api-reference.md#64-resultasync-methods)
65. [Generator Functions](./14-api-reference.md#65-generator-functions)
66. [Type Utilities](./14-api-reference.md#66-type-utilities)
67. [Testing API](./14-api-reference.md#67-testing-api)

### [15 - Appendices](./15-appendices.md)

- [Appendix A: Comparison with Other Libraries](./15-appendices.md#appendix-a-comparison-with-other-libraries)
- [Appendix B: Glossary](./15-appendices.md#appendix-b-glossary)
- [Appendix C: Design Decisions](./15-appendices.md#appendix-c-design-decisions)
- [Appendix D: Migration from try/catch](./15-appendices.md#appendix-d-migration-from-trycatch)
- [Appendix E: Migration from neverthrow](./15-appendices.md#appendix-e-migration-from-neverthrow)

### [16 - Definition of Done](./16-definition-of-done.md)

- [DoD 1: Core Types](./16-definition-of-done.md#dod-1-core-types-spec-sections-5-8)
- [DoD 2: Constructors](./16-definition-of-done.md#dod-2-constructors-spec-sections-9-14)
- [DoD 3: Type Guards & Narrowing](./16-definition-of-done.md#dod-3-type-guards--narrowing-spec-sections-15-17)
- [DoD 4: Transformations](./16-definition-of-done.md#dod-4-transformations-spec-sections-18-22)
- [DoD 5: Chaining](./16-definition-of-done.md#dod-5-chaining-spec-sections-23-28)
- [DoD 6: Extraction](./16-definition-of-done.md#dod-6-extraction-spec-sections-29-34)
- [DoD 7: Combining](./16-definition-of-done.md#dod-7-combining-spec-sections-35-39)
- [DoD 8: ResultAsync](./16-definition-of-done.md#dod-8-resultasync-spec-sections-40-44)
- [DoD 9: Generator-Based Early Return](./16-definition-of-done.md#dod-9-generator-based-early-return-spec-sections-45-48)
- [DoD 10: Error Patterns](./16-definition-of-done.md#dod-10-error-patterns-spec-sections-49-52)
- [DoD 11: HexDI Integration](./16-definition-of-done.md#dod-11-hexdi-integration-spec-sections-53-56)
- [DoD 12: Testing Utilities](./16-definition-of-done.md#dod-12-testing-utilities-spec-sections-57-60)
- [DoD 13: JSON Serialization](./16-definition-of-done.md#dod-13-json-serialization)
- [Test Count Summary](./16-definition-of-done.md#test-count-summary)
- [Verification Checklist](./16-definition-of-done.md#verification-checklist)
- [Mutation Testing Strategy](./16-definition-of-done.md#mutation-testing-strategy)

---

## Release Scope

All sections (1-67) ship in version 0.1.0.

---

_End of Table of Contents_
