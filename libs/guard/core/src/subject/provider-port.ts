import { port } from "@hex-di/core";
import type { AuthSubject } from "./auth-subject.js";

/**
 * Port providing the current authorization subject for a request scope.
 *
 * This is a scoped outbound port: each request scope resolves a fresh
 * subject from the identity infrastructure (JWT, session, API key, etc.).
 */
export const SubjectProviderPort = port<AuthSubject>()({
  name: "SubjectProvider",
  direction: "outbound",
  description:
    "Provides the current authorization subject. Scoped per request.",
});
