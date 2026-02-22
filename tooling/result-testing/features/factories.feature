Feature: Test Factories
  Test data builders for creating Result and Option fixtures.

  @BEH-T03-001
  Scenario: createResultFixture ok() uses defaults
    Given a result fixture with defaults '{"id":1,"name":"Alice"}'
    When I call fixture.ok()
    Then the result is Ok('{"id":1,"name":"Alice"}')

  @BEH-T03-001
  Scenario: createResultFixture ok(override) overrides defaults
    Given a result fixture with defaults '{"id":1,"name":"Alice"}'
    When I call fixture.ok('{"id":2,"name":"Bob"}')
    Then the result is Ok('{"id":2,"name":"Bob"}')

  @BEH-T03-001
  Scenario: createResultFixture err() creates Err
    Given a result fixture with defaults '{"id":1,"name":"Alice"}'
    When I call fixture.err("not found")
    Then the result is Err("not found")

  @BEH-T03-001
  Scenario: createResultFixture okAsync() resolves to Ok
    Given a result fixture with defaults 42
    When I call fixture.okAsync()
    Then the ResultAsync resolves to Ok(42)

  @BEH-T03-001
  Scenario: createResultFixture errAsync() resolves to Err
    Given a result fixture with defaults 42
    When I call fixture.errAsync("fail")
    Then the ResultAsync resolves to Err("fail")

  @BEH-T03-002
  Scenario: createOptionFixture some() uses defaults
    Given an option fixture with defaults '{"timeout":3000}'
    When I call fixture.some()
    Then the option is Some('{"timeout":3000}')

  @BEH-T03-002
  Scenario: createOptionFixture some(override) overrides defaults
    Given an option fixture with defaults '{"timeout":3000}'
    When I call fixture.some('{"timeout":0}')
    Then the option is Some('{"timeout":0}')

  @BEH-T03-002
  Scenario: createOptionFixture none() creates None
    Given an option fixture with defaults '{"timeout":3000}'
    When I call fixture.none()
    Then the option is None

  @BEH-T03-003
  Scenario: mockResultAsync resolve produces Ok
    Given a mock ResultAsync
    When I resolve it with "hello"
    Then the ResultAsync resolves to Ok("hello")

  @BEH-T03-003
  Scenario: mockResultAsync reject produces Err
    Given a mock ResultAsync
    When I reject it with "fail"
    Then the ResultAsync resolves to Err("fail")

  @BEH-T03-003
  Scenario: mockResultAsync first call wins
    Given a mock ResultAsync
    When I resolve it with "first"
    And I reject it with "second"
    Then the ResultAsync resolves to Ok("first")
