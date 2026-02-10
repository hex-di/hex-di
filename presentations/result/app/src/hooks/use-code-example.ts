import { useQuery } from "@hex-di/query-react";
import {
  CodeExampleQueryPort,
  type CodeExample,
  type CodeExampleError,
} from "../ports/code-examples.port.js";

export type CodeExampleState =
  | { readonly status: "loading" }
  | { readonly status: "ok"; readonly example: CodeExample }
  | { readonly status: "error"; readonly error: CodeExampleError };

export function useCodeExample(id: string): CodeExampleState {
  const { data, isPending, isError, error } = useQuery(CodeExampleQueryPort, id);

  if (isPending) {
    return { status: "loading" };
  }

  if (isError && error !== null) {
    return { status: "error", error };
  }

  if (data !== undefined) {
    return { status: "ok", example: data };
  }

  return { status: "loading" };
}
