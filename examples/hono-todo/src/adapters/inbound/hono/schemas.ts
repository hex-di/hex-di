import { z } from "@hono/zod-openapi";

export const TodoSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    done: z.boolean(),
  })
  .openapi("Todo");

export const UserSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    roles: z.array(z.string()),
  })
  .openapi("User");

export const ErrorSchema = z
  .object({
    error: z.string(),
  })
  .openapi("Error");

export const CreateTodoInput = {
  type: "object",
  required: ["title"],
  properties: {
    title: {
      type: "string",
      minLength: 1,
      description: "Title of the todo",
      example: "Write docs",
    },
  },
  description: "Payload to create a todo",
  title: "CreateTodoInput",
} satisfies {
  type: "object";
  required: string[];
  properties: {
    title: {
      type: "string";
      minLength: number;
      description: string;
      example: string;
    };
  };
  description: string;
  title: string;
};
