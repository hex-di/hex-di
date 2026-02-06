/**
 * Error thrown when a scope is requested from the Hono context but the
 * middleware was not registered or failed to run.
 */
export class MissingScopeError extends Error {
  readonly code = "HEX_HONO_SCOPE_MISSING";

  constructor(scopeKey: string) {
    super(`HexDI scope is missing on Hono context (expected key: "${scopeKey}")`);
    this.name = "MissingScopeError";
  }
}

/**
 * Error thrown when a container is requested from the Hono context but the
 * middleware was not registered or failed to run.
 */
export class MissingContainerError extends Error {
  readonly code = "HEX_HONO_CONTAINER_MISSING";

  constructor(containerKey: string) {
    super(`HexDI container is missing on Hono context (expected key: "${containerKey}")`);
    this.name = "MissingContainerError";
  }
}
