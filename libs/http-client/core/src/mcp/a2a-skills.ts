/**
 * A2A (Agent-to-Agent) skill integration for HTTP client.
 *
 * Exposes HTTP operations as A2A-compatible skills that other agents
 * can invoke.
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

export interface A2aSkill {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
}

export interface A2aSkillHandler {
  readonly skill: A2aSkill;
  readonly execute: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

export interface HttpClientA2aConfig {
  /** Skill ID prefix. Default: "http-client". */
  readonly idPrefix?: string;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Create A2A skill handlers for HTTP operations.
 *
 * @example
 * ```typescript
 * const skills = createHttpClientA2aSkills();
 * // Returns handlers for: http-request, http-health-check
 * ```
 */
export function createHttpClientA2aSkills(
  config?: HttpClientA2aConfig,
): ReadonlyArray<A2aSkillHandler> {
  const prefix = config?.idPrefix ?? "http-client";

  const httpRequestSkill: A2aSkillHandler = {
    skill: {
      id: `${prefix}.request`,
      name: "HTTP Request",
      description: "Make an HTTP request to a specified URL",
      inputSchema: {
        type: "object",
        properties: {
          method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"] },
          url: { type: "string" },
          headers: { type: "object" },
          body: { type: "string" },
        },
        required: ["method", "url"],
      },
    },
    execute: async (input) => {
      return {
        status: "not_connected",
        message: "HTTP client not connected. Register an HttpClient instance.",
        input,
      };
    },
  };

  const healthCheckSkill: A2aSkillHandler = {
    skill: {
      id: `${prefix}.health-check`,
      name: "HTTP Health Check",
      description: "Check the health of an HTTP endpoint",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string" },
        },
        required: ["url"],
      },
    },
    execute: async (input) => {
      return {
        status: "not_connected",
        message: "HTTP client not connected. Register an HttpClient instance.",
        input,
      };
    },
  };

  return Object.freeze([httpRequestSkill, healthCheckSkill]);
}
