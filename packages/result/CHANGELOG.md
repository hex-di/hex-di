# @hex-di/result

## 0.2.0

### Minor Changes

- fc5d631: Complete implementation of the full specification suite

  - Add Option type (some, none, isOption, fromOptionJSON) with brand-based identity and Object.freeze
  - Add Do notation (bind, let\_) for Result and ResultAsync
  - Add missing Result methods: and, or, mapOr, mapOrElse, contains, containsErr
  - Add Result-to-Option bridges: toOption, toOptionErr, transpose
  - Add UnwrapError class and unsafe unwrap/unwrapErr functions
  - Add createErrorGroup for namespaced error factories
  - Add missing combinators: partition, forEach, zipOrAccumulate
  - Add standalone curried functions (23) with pipe utility
  - Add toSchema (Standard Schema v1 interop) and fromJSON deserialization
  - Add toJSON with \_schemaVersion field for all types
  - Add ResultAsync.fromCallback and ResultAsync.race
  - Add subpath exports for modular imports
  - Add comprehensive JSDoc with @example, @since, @see on all public exports
  - Add Cucumber BDD acceptance tests (107 scenarios, 276 steps)
  - Add GxP integrity test suite split into 10 focused files
  - Add BEH-XX-NNN traceability tags to all test and benchmark files
  - Add benchmark suite (construction, method-chains) with vitest bench
