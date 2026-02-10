import { describe, it, expectTypeOf } from "vitest";
import {
  createQueryPort,
  createMutationPort,
  type InferMutationData,
  type InferMutationInput,
  type InferMutationError,
  type InferMutationContext,
  type InferMutationName,
  type InferMutationTypes,
  type InferInvalidatedPorts,
  type InferRemovedPorts,
} from "../src/index.js";

interface User {
  id: string;
  name: string;
}

interface CreateUserInput {
  name: string;
}

interface ValidationError {
  field: string;
  message: string;
}

interface Todo {
  id: string;
  text: string;
}

const UsersPort = createQueryPort<User[], unknown>()({ name: "Users" });
const UserByIdPort = createQueryPort<User, unknown>()({ name: "UserById" });

const CreateUserPort = createMutationPort<User, CreateUserInput>()({
  name: "CreateUser",
  effects: { invalidates: [UsersPort] },
});

const CustomErrorPort = createMutationPort<User, CreateUserInput, ValidationError>()({
  name: "CustomError",
});

const OptimisticPort = createMutationPort<
  Todo,
  { text: string },
  Error,
  { previousTodos: readonly Todo[] }
>()({
  name: "Optimistic",
});

const DeleteUserPort = createMutationPort<void, string>()({
  name: "DeleteUser",
  effects: { removes: [UserByIdPort] },
});

describe("Mutation Port Type-Level Tests", () => {
  it("InferMutationData<typeof CreateUserPort> resolves to User", () => {
    expectTypeOf<InferMutationData<typeof CreateUserPort>>().toEqualTypeOf<User>();
  });

  it("InferMutationInput<typeof CreateUserPort> resolves to CreateUserInput", () => {
    expectTypeOf<InferMutationInput<typeof CreateUserPort>>().toEqualTypeOf<CreateUserInput>();
  });

  it("InferMutationError<typeof CreateUserPort> resolves to Error (default)", () => {
    expectTypeOf<InferMutationError<typeof CreateUserPort>>().toEqualTypeOf<Error>();
  });

  it("InferMutationError<typeof CustomErrorPort> resolves to ValidationError", () => {
    expectTypeOf<InferMutationError<typeof CustomErrorPort>>().toEqualTypeOf<ValidationError>();
  });

  it("InferMutationContext<typeof OptimisticPort> resolves to { previousTodos }", () => {
    expectTypeOf<InferMutationContext<typeof OptimisticPort>>().toEqualTypeOf<{
      previousTodos: readonly Todo[];
    }>();
  });

  it("InferMutationName<typeof CreateUserPort> resolves to 'CreateUser' literal", () => {
    expectTypeOf<InferMutationName<typeof CreateUserPort>>().toEqualTypeOf<"CreateUser">();
  });

  it("InferMutationTypes<typeof CreateUserPort> resolves to correct record shape", () => {
    type Expected = {
      readonly name: "CreateUser";
      readonly data: User;
      readonly input: CreateUserInput;
      readonly error: Error;
      readonly context: unknown;
    };
    expectTypeOf<InferMutationTypes<typeof CreateUserPort>>().toEqualTypeOf<Expected>();
  });

  it("InferMutationData<string> produces InferenceError", () => {
    type Result = InferMutationData<string>;
    expectTypeOf<Result>().toHaveProperty("__source");
  });

  it("InferInvalidatedPorts resolves to never when effects type is erased", () => {
    // MutationPortConfig has `effects?: MutationEffects` which erases port types.
    // Future: generic effects would preserve port names.
    expectTypeOf<InferInvalidatedPorts<typeof CreateUserPort>>().toEqualTypeOf<never>();
  });

  it("InferRemovedPorts resolves to never when effects type is erased", () => {
    expectTypeOf<InferRemovedPorts<typeof DeleteUserPort>>().toEqualTypeOf<never>();
  });

  it("MutationPort has __portName property", () => {
    expectTypeOf<typeof CreateUserPort>().toHaveProperty("__portName");
    expectTypeOf<(typeof CreateUserPort)["__portName"]>().toEqualTypeOf<"CreateUser">();
  });
});
