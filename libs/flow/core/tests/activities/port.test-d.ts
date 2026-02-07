/**
 * Type-level tests for ActivityPort type and activityPort factory.
 *
 * These tests verify:
 * 1. activityPort<Input, Output>()('Name') creates correctly branded type
 * 2. ActivityInput<P> extracts input type from ActivityPort
 * 3. ActivityOutput<P> extracts output type from ActivityPort
 * 4. ActivityPort is assignable to Port type
 * 5. Different ActivityPorts with same I/O but different names are incompatible
 * 6. __activityInput and __activityOutput phantom properties exist at type level
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import type { Port } from "@hex-di/core";
import type { Activity } from "../../src/activities/types.js";
import {
  activityPort,
  type ActivityPort,
  type ActivityInput,
  type ActivityOutput,
} from "../../src/activities/port.js";

// =============================================================================
// Test Types
// =============================================================================

interface User {
  id: string;
  name: string;
  email: string;
}

interface FetchUserInput {
  userId: string;
}

interface PollingInput {
  interval: number;
  maxAttempts: number;
}

interface PollingResult {
  attempts: number;
  success: boolean;
}

// =============================================================================
// Test 1: activityPort creates correctly branded type
// =============================================================================

describe("activityPort factory creates correctly branded type", () => {
  it("creates ActivityPort with correct name literal type", () => {
    const FetchUserPort = activityPort<FetchUserInput, User>()("FetchUser");

    // Port name should be preserved as literal type
    expectTypeOf(FetchUserPort.__portName).toEqualTypeOf<"FetchUser">();
    expectTypeOf(FetchUserPort.__portName).not.toEqualTypeOf<string>();
  });

  it("preserves input and output types in the port", () => {
    const FetchUserPort = activityPort<FetchUserInput, User>()("FetchUser");

    // Port should have correct ActivityPort type
    expectTypeOf(FetchUserPort).toEqualTypeOf<ActivityPort<FetchUserInput, User, "FetchUser">>();
  });

  it("curried factory returns correct intermediate function type", () => {
    const createFetchUser = activityPort<FetchUserInput, User>();

    // The intermediate function should be callable with a string
    expectTypeOf(createFetchUser).toBeFunction();
    expectTypeOf(createFetchUser("Test")).toEqualTypeOf<
      ActivityPort<FetchUserInput, User, "Test">
    >();
  });

  it("works with void input type", () => {
    const StartPort = activityPort<void, void>()("Start");

    expectTypeOf(StartPort.__portName).toEqualTypeOf<"Start">();
    expectTypeOf(StartPort).toEqualTypeOf<ActivityPort<void, void, "Start">>();
  });

  it("works with complex input and output types", () => {
    const PollingPort = activityPort<PollingInput, PollingResult>()("Polling");

    expectTypeOf(PollingPort).toEqualTypeOf<ActivityPort<PollingInput, PollingResult, "Polling">>();
  });
});

// =============================================================================
// Test 2: ActivityInput extracts input type from ActivityPort
// =============================================================================

describe("ActivityInput extracts input type", () => {
  it("extracts input type from ActivityPort", () => {
    const _FetchUserPort = activityPort<FetchUserInput, User>()("FetchUser");

    type ExtractedInput = ActivityInput<typeof _FetchUserPort>;
    expectTypeOf<ExtractedInput>().toEqualTypeOf<FetchUserInput>();
  });

  it("extracts void input type", () => {
    const _StartPort = activityPort<void, string>()("Start");

    type ExtractedInput = ActivityInput<typeof _StartPort>;
    expectTypeOf<ExtractedInput>().toEqualTypeOf<void>();
  });

  it("extracts complex input type", () => {
    const _PollingPort = activityPort<PollingInput, PollingResult>()("Polling");

    type ExtractedInput = ActivityInput<typeof _PollingPort>;
    expectTypeOf<ExtractedInput>().toEqualTypeOf<PollingInput>();
  });

  it("returns never for non-ActivityPort types", () => {
    type FromString = ActivityInput<string>;
    type FromNumber = ActivityInput<number>;

    expectTypeOf<FromString>().toEqualTypeOf<never>();
    expectTypeOf<FromNumber>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// Test 3: ActivityOutput extracts output type from ActivityPort
// =============================================================================

describe("ActivityOutput extracts output type", () => {
  it("extracts output type from ActivityPort", () => {
    const _FetchUserPort = activityPort<FetchUserInput, User>()("FetchUser");

    type ExtractedOutput = ActivityOutput<typeof _FetchUserPort>;
    expectTypeOf<ExtractedOutput>().toEqualTypeOf<User>();
  });

  it("extracts void output type", () => {
    const _LogPort = activityPort<string, void>()("Log");

    type ExtractedOutput = ActivityOutput<typeof _LogPort>;
    expectTypeOf<ExtractedOutput>().toEqualTypeOf<void>();
  });

  it("extracts complex output type", () => {
    const _PollingPort = activityPort<PollingInput, PollingResult>()("Polling");

    type ExtractedOutput = ActivityOutput<typeof _PollingPort>;
    expectTypeOf<ExtractedOutput>().toEqualTypeOf<PollingResult>();
  });

  it("returns never for non-ActivityPort types", () => {
    type FromString = ActivityOutput<string>;
    type FromNumber = ActivityOutput<number>;

    expectTypeOf<FromString>().toEqualTypeOf<never>();
    expectTypeOf<FromNumber>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// Test 4: ActivityPort is assignable to Port type
// =============================================================================

describe("ActivityPort is assignable to Port type", () => {
  it("ActivityPort extends Port with Activity service type", () => {
    const FetchUserPort = activityPort<FetchUserInput, User>()("FetchUser");

    // ActivityPort should be assignable to Port<Activity<...>, Name>
    expectTypeOf(FetchUserPort).toMatchTypeOf<Port<Activity<FetchUserInput, User>, "FetchUser">>();
  });

  it("can be used where Port is expected", () => {
    const _FetchUserPort = activityPort<FetchUserInput, User>()("FetchUser");

    // Should be usable in a function expecting Port
    type AcceptsPort<P extends Port<unknown, string>> = P;

    // This should compile without error
    type Result = AcceptsPort<typeof _FetchUserPort>;
    expectTypeOf<Result>().toEqualTypeOf<typeof _FetchUserPort>();
  });

  it("ActivityPort type alias matches Port structure", () => {
    type TestPort = ActivityPort<FetchUserInput, User, "Test">;

    // Should have __portName property
    expectTypeOf<TestPort>().toHaveProperty("__portName");

    // __portName should be the literal type
    type PortName = TestPort["__portName"];
    expectTypeOf<PortName>().toEqualTypeOf<"Test">();
  });
});

// =============================================================================
// Test 5: Different ActivityPorts with same I/O but different names are incompatible
// =============================================================================

describe("nominal typing prevents incompatible port assignments", () => {
  it("different names produce incompatible types even with same I/O", () => {
    const FetchUserPort = activityPort<FetchUserInput, User>()("FetchUser");
    const LoadUserPort = activityPort<FetchUserInput, User>()("LoadUser");

    // Same input/output types but different names = different types
    expectTypeOf(FetchUserPort).not.toEqualTypeOf(LoadUserPort);
    expectTypeOf<typeof FetchUserPort>().not.toMatchTypeOf<typeof LoadUserPort>();
    expectTypeOf<typeof LoadUserPort>().not.toMatchTypeOf<typeof FetchUserPort>();
  });

  it("same name and same I/O produce compatible types", () => {
    const Port1 = activityPort<FetchUserInput, User>()("FetchUser");
    const Port2 = activityPort<FetchUserInput, User>()("FetchUser");

    // Same name + same types = equal types
    expectTypeOf(Port1).toEqualTypeOf(Port2);
  });

  it("same name but different I/O produce incompatible types", () => {
    const PortA = activityPort<string, number>()("Process");
    const PortB = activityPort<number, string>()("Process");

    // Same name but different input/output = different types
    expectTypeOf(PortA).not.toEqualTypeOf(PortB);
  });

  it("fake objects cannot be assigned to ActivityPort", () => {
    type RealPort = ActivityPort<FetchUserInput, User, "FetchUser">;

    // A structurally similar but non-branded object should not match
    type FakePort = { readonly __portName: "FetchUser" };
    expectTypeOf<FakePort>().not.toMatchTypeOf<RealPort>();
  });
});

// =============================================================================
// Test 6: Phantom properties exist at type level
// =============================================================================

describe("phantom properties __activityInput and __activityOutput exist at type level", () => {
  it("ActivityPort type has __activityInput phantom property", () => {
    type TestPort = ActivityPort<FetchUserInput, User, "Test">;

    // The __activityInput phantom property should exist at type level
    expectTypeOf<TestPort>().toHaveProperty("__activityInput");

    // It should carry the input type
    type InputType = TestPort["__activityInput"];
    expectTypeOf<InputType>().toEqualTypeOf<FetchUserInput>();
  });

  it("ActivityPort type has __activityOutput phantom property", () => {
    type TestPort = ActivityPort<FetchUserInput, User, "Test">;

    // The __activityOutput phantom property should exist at type level
    expectTypeOf<TestPort>().toHaveProperty("__activityOutput");

    // It should carry the output type
    type OutputType = TestPort["__activityOutput"];
    expectTypeOf<OutputType>().toEqualTypeOf<User>();
  });

  it("phantom properties preserve complex types", () => {
    type TestPort = ActivityPort<PollingInput, PollingResult, "Polling">;

    type InputType = TestPort["__activityInput"];
    type OutputType = TestPort["__activityOutput"];

    expectTypeOf<InputType>().toEqualTypeOf<PollingInput>();
    expectTypeOf<OutputType>().toEqualTypeOf<PollingResult>();
  });

  it("phantom properties work with void types", () => {
    type TestPort = ActivityPort<void, void, "NoOp">;

    type InputType = TestPort["__activityInput"];
    type OutputType = TestPort["__activityOutput"];

    expectTypeOf<InputType>().toEqualTypeOf<void>();
    expectTypeOf<OutputType>().toEqualTypeOf<void>();
  });

  it("created ports have phantom properties at type level", () => {
    const _FetchUserPort = activityPort<FetchUserInput, User>()("FetchUser");

    // The phantom properties should be accessible on typeof
    type PortType = typeof _FetchUserPort;

    expectTypeOf<PortType["__activityInput"]>().toEqualTypeOf<FetchUserInput>();
    expectTypeOf<PortType["__activityOutput"]>().toEqualTypeOf<User>();
  });
});

// =============================================================================
// Test 7: Type utilities work together
// =============================================================================

describe("type utilities work together correctly", () => {
  it("ActivityInput and ActivityOutput can reconstruct activity type", () => {
    const _FetchUserPort = activityPort<FetchUserInput, User>()("FetchUser");
    type PortType = typeof _FetchUserPort;

    type Input = ActivityInput<PortType>;
    type Output = ActivityOutput<PortType>;

    // Should be able to create an Activity type from extracted types
    type ReconstructedActivity = Activity<Input, Output>;
    expectTypeOf<ReconstructedActivity>().toEqualTypeOf<Activity<FetchUserInput, User>>();
  });

  it("phantom properties and utility types produce same results", () => {
    const _TestPort = activityPort<PollingInput, PollingResult>()("Test");
    type PortType = typeof _TestPort;

    // Via phantom properties
    type InputViaPhantom = PortType["__activityInput"];
    type OutputViaPhantom = PortType["__activityOutput"];

    // Via utility types
    type InputViaUtility = ActivityInput<PortType>;
    type OutputViaUtility = ActivityOutput<PortType>;

    // Should be equal
    expectTypeOf<InputViaPhantom>().toEqualTypeOf<InputViaUtility>();
    expectTypeOf<OutputViaPhantom>().toEqualTypeOf<OutputViaUtility>();
  });
});
