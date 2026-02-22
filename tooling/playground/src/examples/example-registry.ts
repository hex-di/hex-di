/**
 * Example Registry
 *
 * Provides read-only access to all curated example templates,
 * organized by category. Used by the toolbar dropdown and URL
 * deep-link loading.
 *
 * @packageDocumentation
 */

import type { ExampleTemplate, ExampleCategory, ExampleRegistryInterface } from "./types.js";
import { basicRegistration } from "./templates/basic-registration.js";
import { lifetimeManagement } from "./templates/lifetime-management.js";
import { dependencyGraph } from "./templates/dependency-graph.js";
import { scopeHierarchy } from "./templates/scope-hierarchy.js";
import { childContainers } from "./templates/child-containers.js";
import { resolutionTracing } from "./templates/resolution-tracing.js";
import { resultConstructorsGuards } from "./templates/result-constructors-guards.js";
import { resultTransformations } from "./templates/result-transformations.js";
import { resultChainingRecovery } from "./templates/result-chaining-recovery.js";
import { resultExtraction } from "./templates/result-extraction.js";
import { resultCombinators } from "./templates/result-combinators.js";
import { resultAsync } from "./templates/result-async.js";
import { resultSafeTry } from "./templates/result-safe-try.js";
import { flowStateMachine } from "./templates/flow-state-machine.js";
import { storeStateManagement } from "./templates/store-state-management.js";
import { queryCachePatterns } from "./templates/query-cache-patterns.js";
import { sagaOrchestration } from "./templates/saga-orchestration.js";
import { multiLibraryComposition } from "./templates/multi-library-composition.js";

// =============================================================================
// All Templates (ordered by category, then by display order within category)
// =============================================================================

const ALL_TEMPLATES: readonly ExampleTemplate[] = [
  // Basics
  basicRegistration,
  lifetimeManagement,
  dependencyGraph,
  scopeHierarchy,
  childContainers,
  // Patterns
  resolutionTracing,
  // Result
  resultConstructorsGuards,
  resultTransformations,
  resultChainingRecovery,
  resultExtraction,
  resultCombinators,
  resultAsync,
  resultSafeTry,
  // Libraries
  flowStateMachine,
  storeStateManagement,
  queryCachePatterns,
  sagaOrchestration,
  // Advanced
  multiLibraryComposition,
];

// Pre-computed lookup map for O(1) getById
const TEMPLATE_BY_ID = new Map<string, ExampleTemplate>(ALL_TEMPLATES.map(t => [t.id, t]));

// Pre-computed category groupings for O(1) getByCategory
const TEMPLATES_BY_CATEGORY = new Map<ExampleCategory, readonly ExampleTemplate[]>();
for (const template of ALL_TEMPLATES) {
  const existing = TEMPLATES_BY_CATEGORY.get(template.category);
  if (existing) {
    // Safe to mutate during initialization since we control the array
    (existing as ExampleTemplate[]).push(template);
  } else {
    TEMPLATES_BY_CATEGORY.set(template.category, [template]);
  }
}

// =============================================================================
// ExampleRegistry
// =============================================================================

/**
 * Read-only registry of all curated example templates.
 *
 * Provides efficient lookup by ID and by category. The registry is
 * immutable after creation -- all templates are statically defined.
 */
export class ExampleRegistry implements ExampleRegistryInterface {
  /** Returns all registered example templates. */
  getAll(): readonly ExampleTemplate[] {
    return ALL_TEMPLATES;
  }

  /** Returns a template by its URL-safe ID, or `undefined` if not found. */
  getById(id: string): ExampleTemplate | undefined {
    return TEMPLATE_BY_ID.get(id);
  }

  /** Returns all templates in the given category. */
  getByCategory(category: ExampleCategory): readonly ExampleTemplate[] {
    return TEMPLATES_BY_CATEGORY.get(category) ?? [];
  }
}

/**
 * Singleton registry instance for convenience.
 */
export const exampleRegistry = new ExampleRegistry();
