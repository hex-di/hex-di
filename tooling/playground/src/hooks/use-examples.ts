/**
 * useExamples hook
 *
 * Provides access to the example registry and loading functionality.
 *
 * @packageDocumentation
 */

import { useCallback, useRef, useState } from "react";
import { ExampleRegistry } from "../examples/example-registry.js";
import type { ExampleRegistryInterface } from "../examples/types.js";
import type { VirtualFS } from "../editor/virtual-fs.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Return value of the useExamples hook.
 */
export interface UseExamplesResult {
  /** The example registry for listing and looking up examples. */
  readonly registry: ExampleRegistryInterface;
  /** Load an example by ID into the virtual filesystem. */
  loadExample(id: string): void;
  /** The ID of the currently loaded example, if any. */
  readonly currentExampleId: string | undefined;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Returns example registry access and loading functionality.
 *
 * @param virtualFS - The virtual filesystem to load examples into.
 * @param onExampleLoaded - Optional callback after an example is loaded.
 *   Receives the entry point file path.
 */
export function useExamples(
  virtualFS: VirtualFS,
  onExampleLoaded?: (entryPoint: string) => void
): UseExamplesResult {
  const registryRef = useRef(new ExampleRegistry());
  const [currentExampleId, setCurrentExampleId] = useState<string | undefined>(undefined);

  const loadExample = useCallback(
    (id: string) => {
      const template = registryRef.current.getById(id);
      if (template === undefined) {
        return;
      }

      // Replace the virtual filesystem with the example's files
      virtualFS.setAll(template.files);
      setCurrentExampleId(id);

      if (onExampleLoaded) {
        onExampleLoaded(template.entryPoint);
      }
    },
    [virtualFS, onExampleLoaded]
  );

  return {
    registry: registryRef.current,
    loadExample,
    currentExampleId,
  };
}
