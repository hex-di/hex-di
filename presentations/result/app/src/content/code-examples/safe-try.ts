import type { CodeExample } from "../../ports/code-examples.port.js";

export const example: CodeExample = {
  id: "safe-try",
  title: "Generator Magic: safeTry",
  before: {
    code: `async function loadDashboard(userId: string) {
  try {
    const user = await fetchUser(userId);
    try {
      const perms = await checkPermissions(user.role);
      try {
        const data = await loadData(user.id, perms);
        return formatForDisplay(data);
      } catch (e) {
        throw new Error(\`Data load failed: \${e}\`);
      }
    } catch (e) {
      throw new Error(\`Permission failed: \${e}\`);
    }
  } catch (e) {
    return null;
  }
}`,
    language: "typescript",
    filename: "dashboard.ts",
    highlights: [3, 5, 7, 15],
    annotations: [
      { line: 3, text: "Level 1: fetch user", type: "error" },
      { line: 5, text: "Level 2: check permissions (nested)", type: "error" },
      { line: 7, text: "Level 3: load data (nested deeper)", type: "error" },
      { line: 15, text: "Caller gets null -- why did it fail?", type: "error" },
    ],
  },
  after: {
    code: `const result = await safeTry(async function* () {
  const user  = yield* await fetchUser(userId);
  const perms = yield* await checkPermissions(user.role);
  const data  = yield* await loadData(user.id, perms);
  const view  = yield* formatForDisplay(data);
  return ok({ user: user.name, dashboard: view });
});
result.match(
  (dashboard) => render(dashboard),
  (error) => {
    if (error._tag === "FetchError") return showLogin();
    if (error._tag === "PermError") return show403();
    if (error._tag === "LoadError") return showRetry();
    if (error._tag === "FormatError") return showFallback();
  }
);`,
    language: "typescript",
    filename: "dashboard.ts",
    highlights: [1, 2, 8],
    annotations: [
      { line: 1, text: "yield* unwraps Ok or short-circuits on Err", type: "ok" },
      { line: 2, text: "Zero nesting -- flat sequential steps", type: "ok" },
      { line: 8, text: "Full error union inferred automatically", type: "ok" },
    ],
  },
};
