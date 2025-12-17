/**
 * MCP Prompts exports for @hex-di/devtools-mcp.
 *
 * @packageDocumentation
 */

export {
  registerDiagnoseSlowResolutionPrompt,
  diagnoseSlowResolutionPrompt,
  getDiagnoseSlowResolutionMessages,
} from "./diagnose-slow-resolution.js";
export {
  registerDetectScopeLeaksPrompt,
  detectScopeLeaksPrompt,
  getDetectScopeLeaksMessages,
} from "./detect-scope-leaks.js";
export {
  registerAuditLifetimesPrompt,
  auditLifetimesPrompt,
  getAuditLifetimesMessages,
} from "./audit-lifetimes.js";
export {
  registerCacheMissAnalysisPrompt,
  cacheMissAnalysisPrompt,
  getCacheMissAnalysisMessages,
} from "./cache-miss-analysis.js";
