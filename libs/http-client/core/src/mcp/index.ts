/**
 * MCP and A2A integration barrel.
 * @packageDocumentation
 */

export {
  createHttpClientMcpResources,
  type McpResource,
  type McpResourceHandler,
  type HttpClientMcpConfig,
} from "./resources.js";

export {
  createHttpClientA2aSkills,
  type A2aSkill,
  type A2aSkillHandler,
  type HttpClientA2aConfig,
} from "./a2a-skills.js";
