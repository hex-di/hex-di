import { createAdapter } from "@hex-di/core";
import { AuthServicePort, LoggerPort } from "../application/ports.js";
import { UnauthorizedError } from "../application/errors.js";
import type { User } from "../domain/entities.js";

const tokens: Record<string, User> = {
  "user-token": { id: "u1", name: "Sample User", roles: ["user"] },
  "admin-token": { id: "admin", name: "Admin User", roles: ["admin"] },
};

export const AuthAdapter = createAdapter({
  provides: AuthServicePort,
  requires: [LoggerPort],
  lifetime: "scoped",
  factory: deps => {
    const authenticate = async (token: string | null | undefined) => {
      if (!token) {
        deps.Logger.info("Anonymous request");
        return null;
      }
      const user = tokens[token];
      if (!user) {
        deps.Logger.info("Invalid token rejected");
        return null;
      }
      deps.Logger.info("Authenticated", { user: user.id });
      return user;
    };
    const requireUser = async (token: string | null | undefined) => {
      const user = await authenticate(token);
      if (!user) {
        throw new UnauthorizedError();
      }
      return user;
    };
    return {
      authenticate,
      requireUser,
    };
  },
});
