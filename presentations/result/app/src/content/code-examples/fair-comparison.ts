import type { CodeExample } from "../../ports/code-examples.port.js";

export const example: CodeExample = {
  id: "fair-comparison",
  title: "The Fair Comparison",
  before: {
    code: `// Manual result type -- every function invents its own
type GetUserResult =
  | { ok: true; user: User }
  | { ok: false; error: NotFound | NetworkErr | ParseErr };

async function getUser(id: string): Promise<GetUserResult> {
  let resp: Response;
  try {
    resp = await fetch(\`/api/users/\${id}\`);
  } catch (e: unknown) {
    return { ok: false, error: { type: "network", cause: e } };
  }
  if (resp.status === 404) {
    return { ok: false, error: { type: "notFound", id } };
  }
  try {
    return { ok: true, user: await resp.json() };
  } catch (e: unknown) {
    return { ok: false, error: { type: "parse", raw: e } };
  }
}`,
    language: "typescript",
    filename: "get-user.service.ts",
    annotations: [
      { line: 1, text: "Manual result type -- every function invents its own", type: "info" },
      { line: 8, text: "Two try/catch blocks, each mapping unknown", type: "info" },
      { line: 13, text: "Typed! But what happens when you compose 3 of these?", type: "info" },
    ],
  },
  after: {
    code: `function getUser(id: string): ResultAsync<User, UserError> {
  return fromPromise(
    fetch(\`/api/users/\${id}\`),
    () => NetworkError({})
  ).andThen((resp) => {
    if (resp.status === 404) return err(NotFound({ id }));
    return fromPromise(
      resp.json(),
      () => ParseError({})
    );
  });
}`,
    language: "typescript",
    filename: "get-user.service.ts",
    annotations: [
      { line: 1, text: "Standard shape -- same Result<T, E> everywhere", type: "ok" },
      { line: 5, text: "andThen composes without nesting try/catch", type: "ok" },
      { line: 12, text: "Error union auto-composed in chains downstream", type: "ok" },
    ],
  },
};
