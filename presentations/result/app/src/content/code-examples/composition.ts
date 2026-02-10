import type { CodeExample } from "../../ports/code-examples.port.js";

export const example: CodeExample = {
  id: "composition",
  title: "The Composition Argument",
  before: {
    code: `// Manual union -- must update when errors change
type DashboardResult =
  | { ok: true; data: Dashboard }
  | { ok: false; error: UserErr | OrderErr | PrefErr };

async function getDashboard(id: string): Promise<DashboardResult> {
  const user = await getUser(id);
  if (!user.ok) return user;
  const orders = await getOrders(user.user.id);
  if (!orders.ok) return orders;
  const prefs = await getPrefs(user.user.id);
  if (!prefs.ok) return prefs;
  return {
    ok: true,
    data: build(user.user, orders.data, prefs.data),
  };
}`,
    language: "typescript",
    filename: "dashboard.service.ts",
    annotations: [
      { line: 1, text: "Manual union -- must update when any sub-function changes", type: "info" },
      { line: 8, text: "Early return boilerplate at every step", type: "info" },
      { line: 10, text: "Shape compatibility -- does this type-check?", type: "info" },
    ],
  },
  after: {
    code: `import { ResultAsync } from "@hex-di/result";

// Error union inferred: UserError | OrderError | PrefError
const getDashboard = (id: string) =>
  getUser(id).andThen((user) =>
    ResultAsync.combine([
      getOrders(user.id),
      getPrefs(user.id),
    ]).map(([orders, prefs]) => build(user, orders, prefs))
  );
// Add a new error to getOrders -> callers see it automatically`,
    language: "typescript",
    filename: "dashboard.service.ts",
    annotations: [
      { line: 3, text: "Error union built automatically -- no manual maintenance", type: "ok" },
      { line: 6, text: "combine runs both in parallel, short-circuits on error", type: "ok" },
      { line: 11, text: "Change getOrders errors -> type flows to all callers", type: "ok" },
    ],
  },
};
