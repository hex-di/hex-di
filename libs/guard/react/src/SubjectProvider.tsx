import { useMemo, type ReactNode } from "react";
import type { AuthSubject } from "@hex-di/guard";
import { SubjectContext } from "./context.js";
import type { SubjectState } from "./types.js";

/**
 * Props for the SubjectProvider component.
 */
export interface SubjectProviderProps {
  /**
   * The subject to provide to the component tree.
   * Pass `"loading"` when the subject is being resolved asynchronously.
   */
  readonly subject: AuthSubject | "loading";
  readonly children: ReactNode;
}

/**
 * Provides the current authenticated subject to descendant components.
 *
 * Freeze the subject object on mount to prevent TOCTOU mutations.
 * When `subject` is `"loading"`, all child hooks that require the subject
 * will suspend (throw a Promise).
 *
 * @example
 * ```tsx
 * <SubjectProvider subject={currentUser}>
 *   <App />
 * </SubjectProvider>
 * ```
 */
export function SubjectProvider({
  subject,
  children,
}: SubjectProviderProps): ReactNode {
  const frozenSubject = useMemo<SubjectState<AuthSubject>>(() => {
    if (subject === "loading") {
      return "loading";
    }
    return Object.freeze({ ...subject });
  }, [subject]);

  return (
    <SubjectContext.Provider value={frozenSubject}>
      {children}
    </SubjectContext.Provider>
  );
}
