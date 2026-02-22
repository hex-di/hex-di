import type { AuthSubject } from "./auth-subject.js";

/**
 * Creates a simple static subject adapter factory.
 *
 * This is a convenience for testing and simple use cases where
 * the subject is known at construction time.
 */
export function createSubjectAdapter(
  subject: AuthSubject,
): () => AuthSubject {
  return () => subject;
}
