import { describe, it, expectTypeOf } from "vitest";
import type {
  SagaPersister,
  PersistenceError,
  SagaExecutionState,
  CompletedStepState,
  CompensationState,
  SerializedSagaError,
  PersisterFilters,
} from "../src/ports/types.js";
import type { ResultAsync } from "@hex-di/result";

// =============================================================================
// Type-Level Tests (DOD 7: Persistence)
// =============================================================================

describe("Persistence - Type Level", () => {
  // DOD 7 type #1
  it("SagaPersister has save, load, delete, list, update methods", () => {
    expectTypeOf<SagaPersister>().toHaveProperty("save");
    expectTypeOf<SagaPersister>().toHaveProperty("load");
    expectTypeOf<SagaPersister>().toHaveProperty("delete");
    expectTypeOf<SagaPersister>().toHaveProperty("list");
    expectTypeOf<SagaPersister>().toHaveProperty("update");
  });

  // DOD 7 type #2
  it("PersistenceError is tagged union with 3 variants", () => {
    type Tags = PersistenceError["_tag"];
    expectTypeOf<Tags>().toEqualTypeOf<"NotFound" | "StorageFailure" | "SerializationFailure">();
  });

  // DOD 7 type #3
  it("save accepts SagaExecutionState and returns ResultAsync<void, PersistenceError>", () => {
    type SaveParam = Parameters<SagaPersister["save"]>[0];
    type SaveReturn = globalThis.ReturnType<SagaPersister["save"]>;
    expectTypeOf<SaveParam>().toEqualTypeOf<SagaExecutionState>();
    expectTypeOf<SaveReturn>().toMatchTypeOf<ResultAsync<void, PersistenceError>>();
  });

  // DOD 7 type #4
  it("load returns ResultAsync<SagaExecutionState | null, PersistenceError>", () => {
    type LoadReturn = globalThis.ReturnType<SagaPersister["load"]>;
    expectTypeOf<LoadReturn>().toMatchTypeOf<
      ResultAsync<SagaExecutionState | null, PersistenceError>
    >();
  });

  // DOD 7 type #5
  it("list returns ResultAsync<SagaExecutionState[], PersistenceError>", () => {
    type ListReturn = globalThis.ReturnType<SagaPersister["list"]>;
    expectTypeOf<ListReturn>().toMatchTypeOf<ResultAsync<SagaExecutionState[], PersistenceError>>();
  });

  // DOD 7 type #6
  it("SagaExecutionState has all required fields", () => {
    expectTypeOf<SagaExecutionState>().toHaveProperty("executionId");
    expectTypeOf<SagaExecutionState>().toHaveProperty("sagaName");
    expectTypeOf<SagaExecutionState>().toHaveProperty("input");
    expectTypeOf<SagaExecutionState>().toHaveProperty("currentStep");
    expectTypeOf<SagaExecutionState>().toHaveProperty("completedSteps");
    expectTypeOf<SagaExecutionState>().toHaveProperty("status");
    expectTypeOf<SagaExecutionState>().toHaveProperty("error");
    expectTypeOf<SagaExecutionState>().toHaveProperty("compensation");
    expectTypeOf<SagaExecutionState>().toHaveProperty("timestamps");
    expectTypeOf<SagaExecutionState>().toHaveProperty("metadata");
  });

  // DOD 7 type #7
  it("CompletedStepState has name, index, output, skipped, completedAt", () => {
    expectTypeOf<CompletedStepState["name"]>().toEqualTypeOf<string>();
    expectTypeOf<CompletedStepState["index"]>().toEqualTypeOf<number>();
    expectTypeOf<CompletedStepState["output"]>().toEqualTypeOf<unknown>();
    expectTypeOf<CompletedStepState["skipped"]>().toEqualTypeOf<boolean>();
    expectTypeOf<CompletedStepState["completedAt"]>().toEqualTypeOf<string>();
  });

  // DOD 7 type #8
  it("CompensationState tracks active, compensatedSteps, failedSteps, triggeringStepIndex", () => {
    expectTypeOf<CompensationState["active"]>().toEqualTypeOf<boolean>();
    expectTypeOf<CompensationState["compensatedSteps"]>().toEqualTypeOf<readonly string[]>();
    expectTypeOf<CompensationState["failedSteps"]>().toEqualTypeOf<readonly string[]>();
    expectTypeOf<CompensationState["triggeringStepIndex"]>().toEqualTypeOf<number | null>();
  });

  // DOD 7 type #9
  it("SerializedSagaError has _tag, name, message, stack, code, fields", () => {
    expectTypeOf<SerializedSagaError["_tag"]>().toEqualTypeOf<string>();
    expectTypeOf<SerializedSagaError["name"]>().toEqualTypeOf<string>();
    expectTypeOf<SerializedSagaError["message"]>().toEqualTypeOf<string>();
    expectTypeOf<SerializedSagaError["stack"]>().toEqualTypeOf<string | null>();
    expectTypeOf<SerializedSagaError["code"]>().toEqualTypeOf<string | null>();
    expectTypeOf<SerializedSagaError["fields"]>().toEqualTypeOf<Record<string, unknown>>();
  });

  // DOD 7 type #10
  it("PersisterFilters has optional sagaName, status, limit", () => {
    expectTypeOf<PersisterFilters>().toHaveProperty("sagaName");
    expectTypeOf<PersisterFilters>().toHaveProperty("status");
    expectTypeOf<PersisterFilters>().toHaveProperty("limit");
  });

  // DOD 7 type #11
  it("update accepts executionId and Partial<SagaExecutionState>", () => {
    type UpdateParams = Parameters<SagaPersister["update"]>;
    expectTypeOf<UpdateParams[0]>().toEqualTypeOf<string>();
    expectTypeOf<UpdateParams[1]>().toMatchTypeOf<Partial<SagaExecutionState>>();
  });
});
