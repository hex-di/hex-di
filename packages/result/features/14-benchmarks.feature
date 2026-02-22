Feature: Benchmarks
  Performance measurement suite validation.

  @BEH-14-001
  Scenario: Benchmark tooling is Vitest Bench
    Then the benchmark files use vitest bench API

  @BEH-14-002
  Scenario: Construction benchmark exists
    Then a construction benchmark file exists

  @BEH-14-002
  Scenario: Method chain benchmark exists
    Then a method chain benchmark file exists

  @BEH-14-005
  Scenario: Benchmark files are in bench/ directory
    Then benchmark files exist under the bench directory
