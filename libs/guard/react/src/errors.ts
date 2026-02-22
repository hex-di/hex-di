/**
 * Error thrown when a guard hook is used outside of a SubjectProvider.
 */
export class MissingSubjectProviderError extends Error {
  constructor(hookName: string) {
    super(
      `${hookName} must be used within a SubjectProvider. ` +
        "Wrap your component tree with <SubjectProvider subject={...}>.",
    );
    this.name = "MissingSubjectProviderError";
  }
}
