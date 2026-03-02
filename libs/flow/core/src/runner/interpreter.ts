/**
 * State Machine Interpreter
 *
 * This module provides the pure transition logic for the state machine.
 * The interpreter computes state transitions without performing side effects.
 *
 * Key responsibilities:
 * - Find matching transitions for an event (with event bubbling for compound states)
 * - Evaluate guards in definition order
 * - Apply actions to produce new context
 * - Collect effects (exit, transition, entry) with compound-aware ordering
 * - Handle compound state auto-entry, onDone, and #id references
 *
 * @packageDocumentation
 */

import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { MachineAny } from "../machine/types.js";
import { callErased } from "../utils/type-bridge.js";
import type { StateNodeAny } from "../machine/state-node.js";
import type { TransitionConfigAny } from "../machine/transition.js";
import type { EffectAny } from "../effects/types.js";
import type { TransitionError } from "../errors/index.js";
import { GuardThrew, ActionThrew } from "../errors/index.js";
import { verifyGuardPurity } from "./guard-purity.js";

// =============================================================================
// TransitionResult Type
// =============================================================================

/**
 * The result of a state transition.
 *
 * Contains the new state, new context, and all effects to execute.
 * Uses `string` for newState and `unknown` for newContext because
 * the interpreter works with erased types (MachineAny). Type recovery
 * happens at the runner boundary (createMachineRunner).
 */
export interface TransitionResult {
  /**
   * The new top-level state name.
   * If undefined, no transition occurred (stay in current state).
   * For compound states, this is the top-level state only (e.g., 'active').
   */
  readonly newState: string | undefined;

  /**
   * The full active state path from root to leaf.
   * For flat states: `['idle']`.
   * For compound states: `['active', 'loading']`.
   * If undefined, no transition occurred.
   */
  readonly newStatePath: readonly string[] | undefined;

  /**
   * The new context value.
   * If undefined, context remains unchanged.
   */
  readonly newContext: unknown;

  /**
   * All effects to execute, in order:
   * 1. Exit effects from current state (bottom-up for compound)
   * 2. Transition effects
   * 3. Entry effects for new state (top-down for compound)
   */
  readonly effects: readonly EffectAny[];

  /**
   * Whether a transition occurred.
   */
  readonly transitioned: boolean;
}

// =============================================================================
// Internal Types
// =============================================================================

/**
 * Type guard to check if a value is a StateNodeAny object.
 * @internal
 */
function isStateNodeAny(value: unknown): value is StateNodeAny {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return true;
}

/**
 * Type guard to check if a value is a TransitionConfigAny object.
 * @internal
 */
function isTransitionConfig(value: unknown): value is TransitionConfigAny {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return "target" in value && typeof getProperty(value, "target") === "string";
}

/**
 * Normalizes transition config(s) to a flat array of TransitionConfigAny.
 * @internal
 */
function normalizeTransitions(
  config: TransitionConfigAny | readonly TransitionConfigAny[] | unknown
): readonly TransitionConfigAny[] {
  if (typeof config === "string") {
    return [{ target: config }];
  }
  if (isTransitionConfig(config)) {
    return [config];
  }
  if (Array.isArray(config)) {
    const result: TransitionConfigAny[] = [];
    for (const item of config) {
      if (typeof item === "string") {
        result.push({ target: item });
      } else if (isTransitionConfig(item)) {
        result.push(item);
      }
    }
    return result;
  }
  return [];
}

/**
 * Safely reads a property from an unknown record.
 * @internal
 */
function getProperty(obj: unknown, key: string): unknown {
  if (typeof obj !== "object" || obj === null) {
    return undefined;
  }
  if (key in obj) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, key);
    return descriptor !== undefined ? descriptor.value : undefined;
  }
  return undefined;
}

// =============================================================================
// Guard & Action Evaluation
// =============================================================================

/**
 * Calls a guard function from TransitionConfigAny.
 * Uses callErased to bridge the `never` parameter variance.
 * @internal
 */
function callGuard(
  guard: (context: never, event: never) => boolean,
  context: unknown,
  event: unknown
): boolean {
  const result = callErased(guard, context, event);
  return typeof result === "boolean" ? result : false;
}

/**
 * Calls an action function from TransitionConfigAny.
 * @internal
 */
function callAction(
  action: (context: never, event: never) => unknown,
  context: unknown,
  event: unknown
): unknown {
  return callErased(action, context, event);
}

/**
 * Calls a per-transition validate function from TransitionConfigAny (GxP F10).
 * Uses the same variance bridge pattern as callGuard/callAction.
 * @internal
 */
function callValidate(validate: (event: never) => boolean, event: unknown): boolean {
  const result = callErased(validate, event);
  return typeof result === "boolean" ? result : false;
}

/**
 * Evaluates a guard function safely.
 * When enforcePureGuards is true, runs the guard twice and warns on impurity (GxP F7).
 * @internal
 */
function evaluateGuard(
  guard: (context: never, event: never) => boolean,
  context: unknown,
  event: { readonly type: string },
  machineId: string,
  currentState: string,
  enforcePureGuards?: boolean
): Result<boolean, TransitionError> {
  if (enforcePureGuards === true) {
    const purityResult = safeCall(() => verifyGuardPurity(guard, context, event));
    if (purityResult._tag === "Err") {
      return err(
        GuardThrew({
          machineId,
          currentState,
          eventType: event.type,
          cause: purityResult.error,
        })
      );
    }
    if (!purityResult.value.pure) {
      globalThis.console.warn(
        `[@hex-di/flow] GxP F7: Impure guard detected in state '${currentState}' ` +
          `for event '${event.type}' in machine '${machineId}'. ` +
          `Guard returned different results for same inputs.`
      );
    }
    return ok(purityResult.value.result);
  }

  const result = safeCall(() => callGuard(guard, context, event));
  if (result._tag === "Err") {
    return err(
      GuardThrew({
        machineId,
        currentState,
        eventType: event.type,
        cause: result.error,
      })
    );
  }
  return ok(result.value);
}

/**
 * Extracts the action name from a function if it is a NamedAction.
 * @internal
 */
function getActionNameFromFn(action: unknown): string | undefined {
  if (
    typeof action === "function" &&
    "actionName" in action &&
    typeof action.actionName === "string"
  ) {
    return action.actionName;
  }
  return undefined;
}

/**
 * Applies an action function safely.
 * @internal
 */
function evaluateActionSafe(
  action: (context: never, event: never) => unknown,
  context: unknown,
  event: { readonly type: string },
  machineId: string,
  currentState: string
): Result<unknown, TransitionError> {
  const result = safeCall(() => callAction(action, context, event));
  if (result._tag === "Err") {
    const actionName = getActionNameFromFn(action);
    const fields: {
      machineId: string;
      currentState: string;
      eventType: string;
      cause: unknown;
      actionName?: string;
    } = {
      machineId,
      currentState,
      eventType: event.type,
      cause: result.error,
    };
    if (actionName !== undefined) {
      fields.actionName = actionName;
    }
    return err(ActionThrew(fields));
  }
  return ok(result.value);
}

/**
 * Safely executes a user-provided function and captures errors as Result.
 *
 * This is a system boundary: user-provided guards/actions may throw,
 * so we wrap them in Result to maintain the no-throw contract internally.
 *
 * @internal
 */
function safeCall<T>(fn: () => T): Result<T, unknown> {
  try {
    return ok(fn());
  } catch (error: unknown) {
    return err(error);
  }
}

// =============================================================================
// Compound State Helpers
// =============================================================================

/**
 * Resolves a state node by walking a path through the machine tree.
 *
 * For path `['active', 'loading']`:
 * - `machine.states['active'].states['loading']`
 *
 * @internal
 */
function resolveStateNodeByPath(
  machine: MachineAny,
  path: readonly string[]
): StateNodeAny | undefined {
  if (path.length === 0) {
    return undefined;
  }

  // First element is a root-level state
  let node = getStateNode(machine, path[0]);
  if (!node) {
    return undefined;
  }

  // Walk deeper through compound states
  for (let i = 1; i < path.length; i++) {
    if (!node.states) {
      return undefined;
    }
    const childName = path[i];
    if (!(childName in node.states)) {
      return undefined;
    }
    const desc = Object.getOwnPropertyDescriptor(node.states, childName);
    const child: unknown = desc !== undefined ? desc.value : undefined;
    if (!isStateNodeAny(child)) {
      return undefined;
    }
    node = child;
  }

  return node;
}

/**
 * A read-only map of compound state paths to their last active child paths.
 * Used for history pseudo-state restoration.
 *
 * Keys are dot-joined compound state paths (e.g., "parent" or "parent.child").
 * Values are the last active state paths relative from root.
 */
export interface HistoryMap {
  get(key: string): readonly string[] | undefined;
}

/**
 * Extends a path by auto-entering compound states' initial children.
 *
 * If `['active']` and `active` is compound with `initial: 'idle'`,
 * returns `['active', 'idle']`. Recurses for nested compounds.
 *
 * When a history map is provided and a history pseudo-state is encountered,
 * redirects to the remembered state path (or the fallback target).
 *
 * @internal
 */
function autoEnterPath(
  path: readonly string[],
  machine: MachineAny,
  historyMap?: HistoryMap
): readonly string[] {
  const result = [...path];

  let maxDepth = 50; // prevent infinite loops
  while (maxDepth-- > 0) {
    const node = resolveStateNodeByPath(machine, result);
    if (!node) {
      break;
    }

    // Handle history pseudo-states: redirect to remembered or fallback path
    if (node.type === "history") {
      const resolved = resolveHistoryTarget(result, node, machine, historyMap);
      // Replace result with the resolved path and continue auto-entering
      result.length = 0;
      result.push(...resolved);
      // Continue the loop to auto-enter compound states within the resolved path
      continue;
    }

    if (node.type !== "compound" || !node.states || !node.initial) {
      break;
    }
    result.push(node.initial);
  }

  return result;
}

/**
 * Resolves the target path for a history pseudo-state.
 *
 * - Looks up the parent compound state's history in the history map
 * - For shallow history: restores to the remembered immediate child
 * - For deep history: restores to the full remembered path
 * - Falls back to the `target` property or parent's initial child
 *
 * @internal
 */
function resolveHistoryTarget(
  historyNodePath: readonly string[],
  historyNode: StateNodeAny,
  machine: MachineAny,
  historyMap?: HistoryMap
): readonly string[] {
  // The parent of the history pseudo-state is the compound state it belongs to
  const parentPath = historyNodePath.slice(0, -1);
  const parentKey = parentPath.join(".");

  const isDeep = historyNode.history === "deep";

  // Look up recorded history for the parent compound state
  if (historyMap !== undefined) {
    const recorded = historyMap.get(parentKey);
    if (recorded !== undefined && recorded.length > 0) {
      if (isDeep) {
        // Deep history: restore the full recorded path
        return recorded;
      }
      // Shallow history: restore only the immediate child of the parent
      // The recorded path starts from root, so the immediate child is at parentPath.length
      const shallowPath = recorded.slice(0, parentPath.length + 1);
      return shallowPath;
    }
  }

  // No history recorded — use fallback
  if (historyNode.target !== undefined) {
    // The target is relative to the parent (sibling of the history node)
    return [...parentPath, historyNode.target];
  }

  // Fall back to parent's initial child
  const parentNode = resolveStateNodeByPath(machine, parentPath);
  if (parentNode !== undefined && parentNode.initial !== undefined) {
    return [...parentPath, parentNode.initial];
  }

  // Last resort: just return the parent path
  return parentPath;
}

/**
 * Resolves a transition target to a full active path.
 *
 * - Relative targets: resolved as siblings of the handler state.
 *   Handler at `['active', 'loading']`, target `'success'` → `['active', 'success']`
 *   Handler at `['active']`, target `'cancelled'` → `['cancelled']`
 *
 * - Absolute targets (`#id.path`): resolved from the identified state.
 *   `'#root.error'` → `['error']`
 *
 * After resolution, auto-enters compound states.
 *
 * @internal
 */
function resolveTargetPath(
  target: string,
  handlerPath: readonly string[],
  machine: MachineAny,
  historyMap?: HistoryMap
): readonly string[] {
  if (target.startsWith("#")) {
    return resolveAbsoluteTarget(target, machine, historyMap);
  }

  // Relative: target is a sibling of the handler state
  const parentPath = handlerPath.slice(0, -1);
  const resolvedPath = [...parentPath, target];

  // Auto-enter compound states (with history support)
  return autoEnterPath(resolvedPath, machine, historyMap);
}

/**
 * Resolves an absolute `#id.path` reference.
 *
 * `#root.error` → find root (machine root), navigate to 'error' → `['error']`
 * `#wizard.step2` → find state with id 'wizard', navigate to 'step2'
 *
 * @internal
 */
function resolveAbsoluteTarget(
  target: string,
  machine: MachineAny,
  historyMap?: HistoryMap
): readonly string[] {
  // Strip the '#' prefix
  const withoutHash = target.slice(1);
  const parts = withoutHash.split(".");

  if (parts.length === 0) {
    return [];
  }

  const stateId = parts[0];
  const remainingPath = parts.slice(1);

  // Find the state with this ID
  // The root machine implicitly has ID equal to machine.id or 'root'
  let basePath: readonly string[];
  if (stateId === "root" || stateId === machine.id) {
    basePath = [];
  } else {
    const foundPath = findStateByIdInTree(machine, stateId);
    if (!foundPath) {
      // ID not found, fall back to root
      basePath = [];
    } else {
      basePath = foundPath;
    }
  }

  // Navigate from the base using remaining path segments
  const resolvedPath = [...basePath, ...remainingPath];

  // Auto-enter compound states (with history support)
  return autoEnterPath(resolvedPath, machine, historyMap);
}

/**
 * Searches the machine tree for a state with a matching `id` property.
 * Returns the path to that state, or undefined if not found.
 *
 * @internal
 */
function findStateByIdInTree(machine: MachineAny, targetId: string): readonly string[] | undefined {
  const statesRecord = machine.states;
  if (typeof statesRecord !== "object" || statesRecord === null) {
    return undefined;
  }

  // Search root-level states
  for (const stateName of Object.keys(statesRecord)) {
    const desc = Object.getOwnPropertyDescriptor(statesRecord, stateName);
    const node: unknown = desc !== undefined ? desc.value : undefined;
    if (!isStateNodeAny(node)) {
      continue;
    }

    if (node.id === targetId) {
      return [stateName];
    }

    // Search children recursively
    const childResult = findStateByIdInChildren(node, [stateName], targetId);
    if (childResult) {
      return childResult;
    }
  }

  return undefined;
}

/**
 * Recursively searches children of a state node for a matching id.
 * @internal
 */
function findStateByIdInChildren(
  parentNode: StateNodeAny,
  parentPath: readonly string[],
  targetId: string
): readonly string[] | undefined {
  if (!parentNode.states) {
    return undefined;
  }

  for (const childName of Object.keys(parentNode.states)) {
    const desc = Object.getOwnPropertyDescriptor(parentNode.states, childName);
    const childNode: unknown = desc !== undefined ? desc.value : undefined;
    if (!isStateNodeAny(childNode)) {
      continue;
    }

    const childPath = [...parentPath, childName];

    if (childNode.id === targetId) {
      return childPath;
    }

    const result = findStateByIdInChildren(childNode, childPath, targetId);
    if (result) {
      return result;
    }
  }

  return undefined;
}

/**
 * Computes the effective LCA (Least Common Ancestor) depth for effect computation.
 *
 * The effective LCA is `min(pathLCA, handlerDepth)`, which ensures that
 * self-transitions on compound states properly exit/re-enter the compound.
 *
 * @internal
 */
function computeEffectiveLCADepth(
  oldPath: readonly string[],
  newPath: readonly string[],
  handlerDepth: number
): number {
  // pathLCA = number of shared prefix elements
  let pathLCA = 0;
  const minLength = Math.min(oldPath.length, newPath.length);
  while (pathLCA < minLength && oldPath[pathLCA] === newPath[pathLCA]) {
    pathLCA++;
  }

  return Math.min(pathLCA, handlerDepth);
}

/**
 * Collects exit/entry effects for a compound-aware transition.
 *
 * Exit effects fire bottom-up from old leaf to LCA (exclusive).
 * Entry effects fire top-down from LCA (exclusive) to new leaf.
 *
 * @internal
 */
function collectCompoundEffects(
  oldPath: readonly string[],
  newPath: readonly string[],
  handlerDepth: number,
  transitionConfig: TransitionConfigAny,
  machine: MachineAny
): readonly EffectAny[] {
  const effects: EffectAny[] = [];

  // Internal transitions skip exit/entry effects
  if (transitionConfig.internal === true) {
    if (transitionConfig.effects !== undefined) {
      effects.push(...transitionConfig.effects);
    }
    return effects;
  }

  const lcaDepth = computeEffectiveLCADepth(oldPath, newPath, handlerDepth);

  // 1. Exit effects: bottom-up from old leaf to LCA (exclusive)
  for (let i = oldPath.length - 1; i >= lcaDepth; i--) {
    const node = resolveStateNodeByPath(machine, oldPath.slice(0, i + 1));
    if (node?.exit !== undefined) {
      effects.push(...node.exit);
    }
  }

  // 2. Transition effects
  if (transitionConfig.effects !== undefined) {
    effects.push(...transitionConfig.effects);
  }

  // 3. Entry effects: top-down from LCA (exclusive) to new leaf
  for (let i = lcaDepth; i < newPath.length; i++) {
    const node = resolveStateNodeByPath(machine, newPath.slice(0, i + 1));
    if (node?.entry !== undefined) {
      effects.push(...node.entry);
    }
  }

  return effects;
}

/** Result of event bubbling. @internal */
interface BubbleResult {
  readonly matched: true;
  readonly transition: TransitionConfigAny;
  readonly handlerDepth: number;
  readonly handlerPath: readonly string[];
}

interface BubbleNoMatch {
  readonly matched: false;
}

/**
 * Bubbles an event from the deepest active state up to the root.
 * First matching transition (with passing guard) wins.
 *
 * @internal
 */
function bubbleEvent(
  activePath: readonly string[],
  context: unknown,
  event: { readonly type: string },
  machine: MachineAny
): BubbleResult | BubbleNoMatch {
  for (let i = activePath.length - 1; i >= 0; i--) {
    const stateNode = resolveStateNodeByPath(machine, activePath.slice(0, i + 1));
    if (!stateNode) {
      continue;
    }

    // Final states don't process events, but bubbling continues upward
    if (stateNode.type === "final") {
      continue;
    }

    const transitionConfig = getTransitionConfig(stateNode, event.type);
    if (transitionConfig === undefined) {
      continue;
    }

    const transitions = normalizeTransitions(transitionConfig);
    if (transitions.length === 0) {
      continue;
    }

    const matched = findMatchingTransition(transitions, context, event);
    if (matched !== undefined) {
      return {
        matched: true,
        transition: matched,
        handlerDepth: i,
        handlerPath: activePath.slice(0, i + 1),
      };
    }
  }

  return { matched: false };
}

/**
 * Safe version of bubbleEvent that catches guard errors.
 * @internal
 */
function bubbleEventSafe(
  activePath: readonly string[],
  context: unknown,
  event: { readonly type: string },
  machineId: string,
  enforcePureGuards?: boolean
): (
  path: readonly string[],
  machine: MachineAny
) => Result<BubbleResult | BubbleNoMatch, TransitionError> {
  return (path: readonly string[], machine: MachineAny) => {
    for (let i = path.length - 1; i >= 0; i--) {
      const stateNode = resolveStateNodeByPath(machine, path.slice(0, i + 1));
      if (!stateNode) {
        continue;
      }

      if (stateNode.type === "final") {
        continue;
      }

      const transitionConfig = getTransitionConfig(stateNode, event.type);
      if (transitionConfig === undefined) {
        continue;
      }

      const transitions = normalizeTransitions(transitionConfig);
      if (transitions.length === 0) {
        continue;
      }

      const matchResult = findMatchingTransitionSafe(
        transitions,
        context,
        event,
        machineId,
        path.slice(0, i + 1).join("."),
        enforcePureGuards
      );

      if (matchResult._tag === "Err") {
        return err(matchResult.error);
      }

      if (matchResult.value !== undefined) {
        return ok({
          matched: true,
          transition: matchResult.value,
          handlerDepth: i,
          handlerPath: path.slice(0, i + 1),
        });
      }
    }

    return ok({ matched: false });
  };
}

// =============================================================================
// Always Transition Logic
// =============================================================================

const MAX_ALWAYS_DEPTH = 100;

const ALWAYS_EVENT: { readonly type: string } = Object.freeze({ type: "__always__" });

/**
 * Follows eventless (always) transitions from a state path.
 * Checks the leaf state for `always` transitions.
 * @internal
 */
function followAlwaysTransitionsForPath(
  currentPath: readonly string[],
  currentContext: unknown,
  machine: MachineAny,
  accumulatedEffects: readonly EffectAny[],
  historyMap?: HistoryMap,
  depth: number = 0
): TransitionResult {
  if (depth >= MAX_ALWAYS_DEPTH) {
    return {
      newState: currentPath[0],
      newStatePath: currentPath,
      newContext: currentContext,
      effects: accumulatedEffects,
      transitioned: true,
    };
  }

  // Check the leaf state for always transitions
  const leafNode = resolveStateNodeByPath(machine, currentPath);
  if (!leafNode || leafNode.always === undefined) {
    return {
      newState: currentPath[0],
      newStatePath: currentPath,
      newContext: currentContext,
      effects: accumulatedEffects,
      transitioned: true,
    };
  }

  const alwaysTransitions = normalizeTransitions(leafNode.always);
  if (alwaysTransitions.length === 0) {
    return {
      newState: currentPath[0],
      newStatePath: currentPath,
      newContext: currentContext,
      effects: accumulatedEffects,
      transitioned: true,
    };
  }

  const matched = findMatchingTransition(alwaysTransitions, currentContext, ALWAYS_EVENT);
  if (matched === undefined) {
    return {
      newState: currentPath[0],
      newStatePath: currentPath,
      newContext: currentContext,
      effects: accumulatedEffects,
      transitioned: true,
    };
  }

  const newContext = applyActions(matched, currentContext, ALWAYS_EVENT);
  const resolvedContext = newContext !== undefined ? newContext : currentContext;
  const targetPath = resolveTargetPath(matched.target, currentPath, machine, historyMap);

  // Collect effects for this always transition
  const handlerDepth = currentPath.length - 1;
  const alwaysEffects = collectCompoundEffects(
    currentPath,
    targetPath,
    handlerDepth,
    matched,
    machine
  );
  const allEffects = [...accumulatedEffects, ...alwaysEffects];

  return followAlwaysTransitionsForPath(
    targetPath,
    resolvedContext,
    machine,
    allEffects,
    historyMap,
    depth + 1
  );
}

/**
 * Safe version of followAlwaysTransitionsForPath.
 * @internal
 */
function followAlwaysTransitionsForPathSafe(
  currentPath: readonly string[],
  currentContext: unknown,
  machine: MachineAny,
  accumulatedEffects: readonly EffectAny[],
  machineId: string,
  historyMap?: HistoryMap,
  depth: number = 0,
  enforcePureGuards?: boolean
): Result<TransitionResult, TransitionError> {
  if (depth >= MAX_ALWAYS_DEPTH) {
    return ok({
      newState: currentPath[0],
      newStatePath: currentPath,
      newContext: currentContext,
      effects: accumulatedEffects,
      transitioned: true,
    });
  }

  const leafNode = resolveStateNodeByPath(machine, currentPath);
  if (!leafNode || leafNode.always === undefined) {
    return ok({
      newState: currentPath[0],
      newStatePath: currentPath,
      newContext: currentContext,
      effects: accumulatedEffects,
      transitioned: true,
    });
  }

  const alwaysTransitions = normalizeTransitions(leafNode.always);
  if (alwaysTransitions.length === 0) {
    return ok({
      newState: currentPath[0],
      newStatePath: currentPath,
      newContext: currentContext,
      effects: accumulatedEffects,
      transitioned: true,
    });
  }

  const matchResult = findMatchingTransitionSafe(
    alwaysTransitions,
    currentContext,
    ALWAYS_EVENT,
    machineId,
    currentPath.join("."),
    enforcePureGuards
  );

  if (matchResult._tag === "Err") {
    return err(matchResult.error);
  }

  const matched = matchResult.value;
  if (matched === undefined) {
    return ok({
      newState: currentPath[0],
      newStatePath: currentPath,
      newContext: currentContext,
      effects: accumulatedEffects,
      transitioned: true,
    });
  }

  const actionsResult = applyActionsSafe(
    matched,
    currentContext,
    ALWAYS_EVENT,
    machineId,
    currentPath.join(".")
  );
  if (actionsResult._tag === "Err") {
    return err(actionsResult.error);
  }

  const newContext = actionsResult.value;
  const resolvedContext = newContext !== undefined ? newContext : currentContext;
  const targetPath = resolveTargetPath(matched.target, currentPath, machine, historyMap);

  const handlerDepth = currentPath.length - 1;
  const alwaysEffects = collectCompoundEffects(
    currentPath,
    targetPath,
    handlerDepth,
    matched,
    machine
  );
  const allEffects = [...accumulatedEffects, ...alwaysEffects];

  return followAlwaysTransitionsForPathSafe(
    targetPath,
    resolvedContext,
    machine,
    allEffects,
    machineId,
    historyMap,
    depth + 1,
    enforcePureGuards
  );
}

// =============================================================================
// onDone Logic
// =============================================================================

const MAX_ONDONE_DEPTH = 50;

/**
 * Checks if any ancestor compound state should fire onDone because the
 * current leaf is a final state.
 *
 * Walks up from the leaf checking if the parent is compound with onDone
 * and the current child is final.
 *
 * @internal
 */
function checkOnDone(
  currentPath: readonly string[],
  currentContext: unknown,
  machine: MachineAny,
  accumulatedEffects: readonly EffectAny[],
  historyMap?: HistoryMap,
  depth: number = 0
): TransitionResult {
  if (depth >= MAX_ONDONE_DEPTH || currentPath.length < 2) {
    return {
      newState: currentPath[0],
      newStatePath: currentPath,
      newContext: currentContext,
      effects: accumulatedEffects,
      transitioned: true,
    };
  }

  // Check if the leaf state is final
  const leafNode = resolveStateNodeByPath(machine, currentPath);
  if (!leafNode || leafNode.type !== "final") {
    return {
      newState: currentPath[0],
      newStatePath: currentPath,
      newContext: currentContext,
      effects: accumulatedEffects,
      transitioned: true,
    };
  }

  // Check if the parent is compound with onDone
  const parentPath = currentPath.slice(0, -1);
  const parentNode = resolveStateNodeByPath(machine, parentPath);
  if (!parentNode || parentNode.type !== "compound" || parentNode.onDone === undefined) {
    return {
      newState: currentPath[0],
      newStatePath: currentPath,
      newContext: currentContext,
      effects: accumulatedEffects,
      transitioned: true,
    };
  }

  // Normalize the onDone transition
  const onDoneTransitions = normalizeTransitions(parentNode.onDone);
  if (onDoneTransitions.length === 0) {
    return {
      newState: currentPath[0],
      newStatePath: currentPath,
      newContext: currentContext,
      effects: accumulatedEffects,
      transitioned: true,
    };
  }

  // Use the done event for guard evaluation
  const doneEvent: { readonly type: string } = Object.freeze({
    type: `done.state.${parentPath.join(".")}`,
  });

  const matched = findMatchingTransition(onDoneTransitions, currentContext, doneEvent);
  if (matched === undefined) {
    return {
      newState: currentPath[0],
      newStatePath: currentPath,
      newContext: currentContext,
      effects: accumulatedEffects,
      transitioned: true,
    };
  }

  // Apply actions
  const newContext = applyActions(matched, currentContext, doneEvent);
  const resolvedContext = newContext !== undefined ? newContext : currentContext;

  // Resolve target - onDone targets resolve at the parent's level (siblings of the compound)
  const targetPath = resolveTargetPath(matched.target, parentPath, machine, historyMap);

  // Collect effects: exit from current path up through the compound, enter the new target
  // The handler is the compound parent, so handlerDepth is parentPath.length - 1
  const handlerDepth = parentPath.length - 1;
  const onDoneEffects = collectCompoundEffects(
    currentPath,
    targetPath,
    handlerDepth,
    matched,
    machine
  );
  const allEffects = [...accumulatedEffects, ...onDoneEffects];

  // Recursively check if the new target also triggers onDone
  return checkOnDone(targetPath, resolvedContext, machine, allEffects, historyMap, depth + 1);
}

/**
 * Safe version of checkOnDone.
 * @internal
 */
function checkOnDoneSafe(
  currentPath: readonly string[],
  currentContext: unknown,
  machine: MachineAny,
  accumulatedEffects: readonly EffectAny[],
  machineId: string,
  historyMap?: HistoryMap,
  depth: number = 0
): Result<TransitionResult, TransitionError> {
  if (depth >= MAX_ONDONE_DEPTH || currentPath.length < 2) {
    return ok({
      newState: currentPath[0],
      newStatePath: currentPath,
      newContext: currentContext,
      effects: accumulatedEffects,
      transitioned: true,
    });
  }

  const leafNode = resolveStateNodeByPath(machine, currentPath);
  if (!leafNode || leafNode.type !== "final") {
    return ok({
      newState: currentPath[0],
      newStatePath: currentPath,
      newContext: currentContext,
      effects: accumulatedEffects,
      transitioned: true,
    });
  }

  const parentPath = currentPath.slice(0, -1);
  const parentNode = resolveStateNodeByPath(machine, parentPath);
  if (!parentNode || parentNode.type !== "compound" || parentNode.onDone === undefined) {
    return ok({
      newState: currentPath[0],
      newStatePath: currentPath,
      newContext: currentContext,
      effects: accumulatedEffects,
      transitioned: true,
    });
  }

  const onDoneTransitions = normalizeTransitions(parentNode.onDone);
  if (onDoneTransitions.length === 0) {
    return ok({
      newState: currentPath[0],
      newStatePath: currentPath,
      newContext: currentContext,
      effects: accumulatedEffects,
      transitioned: true,
    });
  }

  const doneEvent: { readonly type: string } = Object.freeze({
    type: `done.state.${parentPath.join(".")}`,
  });

  const matchResult = findMatchingTransitionSafe(
    onDoneTransitions,
    currentContext,
    doneEvent,
    machineId,
    parentPath.join(".")
  );

  if (matchResult._tag === "Err") {
    return err(matchResult.error);
  }

  const matched = matchResult.value;
  if (matched === undefined) {
    return ok({
      newState: currentPath[0],
      newStatePath: currentPath,
      newContext: currentContext,
      effects: accumulatedEffects,
      transitioned: true,
    });
  }

  const actionsResult = applyActionsSafe(
    matched,
    currentContext,
    doneEvent,
    machineId,
    parentPath.join(".")
  );
  if (actionsResult._tag === "Err") {
    return err(actionsResult.error);
  }

  const newContext = actionsResult.value;
  const resolvedContext = newContext !== undefined ? newContext : currentContext;
  const targetPath = resolveTargetPath(matched.target, parentPath, machine, historyMap);

  const handlerDepth = parentPath.length - 1;
  const onDoneEffects = collectCompoundEffects(
    currentPath,
    targetPath,
    handlerDepth,
    matched,
    machine
  );
  const allEffects = [...accumulatedEffects, ...onDoneEffects];

  return checkOnDoneSafe(
    targetPath,
    resolvedContext,
    machine,
    allEffects,
    machineId,
    historyMap,
    depth + 1
  );
}

// =============================================================================
// Interpreter Functions
// =============================================================================

/**
 * Computes a state transition without side effects.
 *
 * Accepts either a state name string (flat machine) or an active state
 * path array (compound machine support).
 *
 * NOTE: This version does NOT catch guard/action errors. Use `transitionSafe`
 * for a version that returns Result.
 *
 * @param currentStateOrPath - The current state name or active state path
 * @param currentContext - The current context value
 * @param event - The triggering event
 * @param machine - The machine configuration
 *
 * @returns The transition result
 */
export function transition(
  currentStateOrPath: string | readonly string[],
  currentContext: unknown,
  event: { readonly type: string },
  machine: MachineAny,
  historyMap?: HistoryMap
): TransitionResult {
  const activePath =
    typeof currentStateOrPath === "string" ? [currentStateOrPath] : currentStateOrPath;

  // Event bubbling: walk from deepest to root
  const bubbleResult = bubbleEvent(activePath, currentContext, event, machine);

  if (!bubbleResult.matched) {
    return noTransition();
  }

  const { transition: matched, handlerDepth, handlerPath } = bubbleResult;

  // Apply actions to compute new context
  const newContext = applyActions(matched, currentContext, event);
  const resolvedContext = newContext !== undefined ? newContext : currentContext;

  // Resolve target to full path
  const targetPath = resolveTargetPath(matched.target, handlerPath, machine, historyMap);

  // Collect effects
  const effects = collectCompoundEffects(activePath, targetPath, handlerDepth, matched, machine);

  // Follow always transitions from the target leaf
  const alwaysResult = followAlwaysTransitionsForPath(
    targetPath,
    resolvedContext,
    machine,
    effects,
    historyMap
  );

  // Check onDone for compound states
  const finalPath = alwaysResult.newStatePath ?? targetPath;
  const finalContext =
    alwaysResult.newContext !== undefined ? alwaysResult.newContext : resolvedContext;
  const onDoneResult = checkOnDone(
    finalPath,
    finalContext,
    machine,
    alwaysResult.effects,
    historyMap
  );

  return onDoneResult;
}

/**
 * Safe version of transition that catches guard/action errors and returns Result.
 *
 * Accepts either a state name string (flat machine) or an active state
 * path array (compound machine support).
 *
 * @param currentStateOrPath - The current state name or active state path
 * @param currentContext - The current context value
 * @param event - The triggering event
 * @param machine - The machine configuration
 *
 * @returns Result with TransitionResult on success, or TransitionError on failure
 */
export function transitionSafe(
  currentStateOrPath: string | readonly string[],
  currentContext: unknown,
  event: { readonly type: string },
  machine: MachineAny,
  historyMap?: HistoryMap,
  enforcePureGuards?: boolean
): Result<TransitionResult, TransitionError> {
  const activePath =
    typeof currentStateOrPath === "string" ? [currentStateOrPath] : currentStateOrPath;

  // Event bubbling with safe guard evaluation
  const doBubble = bubbleEventSafe(
    activePath,
    currentContext,
    event,
    machine.id,
    enforcePureGuards
  );
  const bubbleResult = doBubble(activePath, machine);

  if (bubbleResult._tag === "Err") {
    return err(bubbleResult.error);
  }

  if (!bubbleResult.value.matched) {
    return ok(noTransition());
  }

  const { transition: matched, handlerDepth, handlerPath } = bubbleResult.value;

  // Apply actions safely
  const actionsResult = applyActionsSafe(
    matched,
    currentContext,
    event,
    machine.id,
    activePath.join(".")
  );

  if (actionsResult._tag === "Err") {
    return err(actionsResult.error);
  }

  const newContext = actionsResult.value;
  const resolvedContext = newContext !== undefined ? newContext : currentContext;

  // Resolve target to full path
  const targetPath = resolveTargetPath(matched.target, handlerPath, machine, historyMap);

  // Collect effects
  const effects = collectCompoundEffects(activePath, targetPath, handlerDepth, matched, machine);

  // Follow always transitions safely
  const alwaysResult = followAlwaysTransitionsForPathSafe(
    targetPath,
    resolvedContext,
    machine,
    effects,
    machine.id,
    historyMap,
    0,
    enforcePureGuards
  );

  if (alwaysResult._tag === "Err") {
    return err(alwaysResult.error);
  }

  // Check onDone for compound states
  const finalPath = alwaysResult.value.newStatePath ?? targetPath;
  const finalContext =
    alwaysResult.value.newContext !== undefined ? alwaysResult.value.newContext : resolvedContext;
  const onDoneResult = checkOnDoneSafe(
    finalPath,
    finalContext,
    machine,
    alwaysResult.value.effects,
    machine.id,
    historyMap
  );

  return onDoneResult;
}

// =============================================================================
// Exported Utility Functions
// =============================================================================

/**
 * Computes the initial active state path for a machine.
 * Auto-enters compound states from the initial state.
 */
export function computeInitialPath(machine: MachineAny): readonly string[] {
  return autoEnterPath([machine.initial], machine);
}

/**
 * Checks whether an event can trigger a transition from the given active path.
 * Includes event bubbling for compound states.
 */
export function canTransition(
  activePath: readonly string[],
  event: { readonly type: string },
  context: unknown,
  machine: MachineAny
): boolean {
  const result = bubbleEvent(activePath, context, event, machine);
  return result.matched;
}

// =============================================================================
// Parallel State Types
// =============================================================================

/**
 * Represents the active paths for all regions of a parallel state.
 * Each entry maps a region name to its active path within that region.
 *
 * For a parallel state at path `['dashboard']` with regions `['panel1', 'panel2']`:
 * ```
 * {
 *   parallelPath: ['dashboard'],
 *   regions: {
 *     panel1: ['dashboard', 'panel1', 'idle'],
 *     panel2: ['dashboard', 'panel2', 'loading']
 *   }
 * }
 * ```
 */
export interface ParallelRegionPaths {
  /** The path to the parallel state itself. */
  readonly parallelPath: readonly string[];
  /** Map of region name to its full active path (from root). */
  readonly regions: Readonly<Record<string, readonly string[]>>;
}

/**
 * Result of a parallel transition.
 * Extends TransitionResult with updated region paths.
 */
export interface ParallelTransitionResult {
  readonly newContext: unknown;
  readonly effects: readonly EffectAny[];
  readonly transitioned: boolean;
  /** Updated region paths after the transition. */
  readonly newRegions: Readonly<Record<string, readonly string[]>>;
  /** New top-level state (the parallel state name). */
  readonly newState: string | undefined;
  /** If the parallel state completed (all regions final), the onDone result. */
  readonly onDoneResult: TransitionResult | undefined;
}

// =============================================================================
// Parallel State Helpers
// =============================================================================

/**
 * Computes initial region paths for a parallel state.
 *
 * Enters ALL direct children of the parallel state, auto-entering compound
 * states within each region.
 *
 * @param parallelPath - Path to the parallel state node
 * @param machine - The machine definition
 * @returns ParallelRegionPaths with all regions initialized
 */
export function computeParallelRegionPaths(
  parallelPath: readonly string[],
  machine: MachineAny
): ParallelRegionPaths {
  const parallelNode = resolveStateNodeByPath(machine, parallelPath);
  if (!parallelNode || !parallelNode.states) {
    return { parallelPath, regions: {} };
  }

  const regions: Record<string, readonly string[]> = {};
  for (const regionName of Object.keys(parallelNode.states).sort()) {
    const regionPath = [...parallelPath, regionName];
    // Auto-enter compound states within the region
    regions[regionName] = autoEnterPath(regionPath, machine);
  }

  return { parallelPath, regions };
}

/**
 * Collects entry effects for entering a parallel state.
 * Enters the parallel state itself, then all regions top-down.
 *
 * @internal
 */
export function collectParallelEntryEffects(
  parallelPath: readonly string[],
  regionPaths: ParallelRegionPaths,
  machine: MachineAny
): readonly EffectAny[] {
  const effects: EffectAny[] = [];

  // Entry effects for the parallel state itself
  const parallelNode = resolveStateNodeByPath(machine, parallelPath);
  if (parallelNode?.entry !== undefined) {
    effects.push(...parallelNode.entry);
  }

  // Entry effects for each region, top-down within each region path
  effects.push(...collectRegionEntryEffects(parallelPath, regionPaths, machine));

  return effects;
}

/**
 * Collects entry effects for all regions within a parallel state,
 * WITHOUT including the parallel state's own entry effects.
 *
 * Use this when the parallel state's entry effects have already been collected
 * (e.g., by transitionSafe during the transition into the parallel state).
 *
 * @internal
 */
export function collectRegionEntryEffects(
  parallelPath: readonly string[],
  regionPaths: ParallelRegionPaths,
  machine: MachineAny
): readonly EffectAny[] {
  const effects: EffectAny[] = [];

  for (const regionName of Object.keys(regionPaths.regions).sort()) {
    const regionPath = regionPaths.regions[regionName];
    if (regionPath === undefined) continue;
    // Collect entry effects for nodes below the parallel state
    for (let i = parallelPath.length; i < regionPath.length; i++) {
      const subPath = regionPath.slice(0, i + 1);
      const node = resolveStateNodeByPath(machine, subPath);
      if (node?.entry !== undefined) {
        effects.push(...node.entry);
      }
    }
  }

  return effects;
}

/**
 * Collects exit effects for leaving a parallel state.
 * Exits all regions bottom-up, then exits the parallel state itself.
 *
 * @internal
 */
export function collectParallelExitEffects(
  parallelPath: readonly string[],
  regionPaths: ParallelRegionPaths,
  machine: MachineAny
): readonly EffectAny[] {
  const effects: EffectAny[] = [];

  // Exit effects for each region, bottom-up within each region path
  for (const regionName of Object.keys(regionPaths.regions).sort()) {
    const regionPath = regionPaths.regions[regionName];
    if (regionPath === undefined) continue;
    // Bottom-up from leaf to (parallel state exclusive)
    for (let i = regionPath.length - 1; i >= parallelPath.length; i--) {
      const subPath = regionPath.slice(0, i + 1);
      const node = resolveStateNodeByPath(machine, subPath);
      if (node?.exit !== undefined) {
        effects.push(...node.exit);
      }
    }
  }

  // Exit effects for the parallel state itself
  const parallelNode = resolveStateNodeByPath(machine, parallelPath);
  if (parallelNode?.exit !== undefined) {
    effects.push(...parallelNode.exit);
  }

  return effects;
}

/**
 * Dispatches an event to all regions of a parallel state.
 *
 * Each region independently processes the event via bubbleEvent.
 * The event is tried in each region; a region that doesn't handle it
 * stays in its current state (no error).
 *
 * @returns ParallelTransitionResult with updated regions and effects
 */
export function transitionParallelSafe(
  regionPaths: ParallelRegionPaths,
  currentContext: unknown,
  event: { readonly type: string },
  machine: MachineAny,
  historyMap?: HistoryMap,
  enforcePureGuards?: boolean
): Result<ParallelTransitionResult, TransitionError> {
  const allEffects: EffectAny[] = [];
  const newRegions: Record<string, readonly string[]> = {};
  let anyTransitioned = false;
  let context = currentContext;

  // First, try event bubbling on the parallel state itself (not within regions).
  // Events handled by the parallel node or its ancestors take precedence.
  // However, for now we dispatch to regions first. If the parallel state itself
  // has transitions on `on`, those are handled at the parent level by the runner.

  for (const regionName of Object.keys(regionPaths.regions).sort()) {
    const regionPath = regionPaths.regions[regionName];
    if (regionPath === undefined) {
      continue;
    }

    // Bubble event within this region (from leaf up to the parallel state boundary).
    // We bubble from the leaf up to (but not past) the parallel state level,
    // so that the parallel state's own transitions are handled at a higher level.
    const bubbleFn = bubbleEventSafe(regionPath, context, event, machine.id, enforcePureGuards);
    const bubbleResult = bubbleFn(regionPath, machine);

    if (bubbleResult._tag === "Err") {
      return err(bubbleResult.error);
    }

    if (!bubbleResult.value.matched) {
      // This region doesn't handle the event — stays as-is
      newRegions[regionName] = regionPath;
      continue;
    }

    const { transition: matched, handlerDepth, handlerPath } = bubbleResult.value;

    // If the handler is at or above the parallel state level, skip (let parent handle)
    if (handlerDepth < regionPaths.parallelPath.length) {
      newRegions[regionName] = regionPath;
      continue;
    }

    // Apply actions
    const actionsResult = applyActionsSafe(
      matched,
      context,
      event,
      machine.id,
      regionPath.join(".")
    );

    if (actionsResult._tag === "Err") {
      return err(actionsResult.error);
    }

    const newContext = actionsResult.value;
    if (newContext !== undefined) {
      context = newContext;
    }

    // Resolve target path
    const targetPath = resolveTargetPath(matched.target, handlerPath, machine, historyMap);

    // Collect effects for this region transition
    const effects = collectCompoundEffects(regionPath, targetPath, handlerDepth, matched, machine);
    allEffects.push(...effects);

    // Follow always transitions
    const alwaysResult = followAlwaysTransitionsForPathSafe(
      targetPath,
      context,
      machine,
      [],
      machine.id,
      historyMap,
      0,
      enforcePureGuards
    );

    if (alwaysResult._tag === "Err") {
      return err(alwaysResult.error);
    }

    const finalPath = alwaysResult.value.newStatePath ?? targetPath;
    if (alwaysResult.value.newContext !== undefined) {
      context = alwaysResult.value.newContext;
    }
    allEffects.push(...alwaysResult.value.effects);

    newRegions[regionName] = finalPath;
    anyTransitioned = true;
  }

  // Check if all regions are in final states (parallel onDone)
  const onDoneResult = checkParallelOnDone(
    regionPaths.parallelPath,
    newRegions,
    context,
    machine,
    allEffects
  );

  return ok({
    newContext: context,
    effects: allEffects,
    transitioned: anyTransitioned,
    newRegions,
    newState: regionPaths.parallelPath[0],
    onDoneResult,
  });
}

/**
 * Checks if all regions of a parallel state have reached final states.
 * If so, fires the parallel state's onDone transition.
 *
 * @internal
 */
function checkParallelOnDone(
  parallelPath: readonly string[],
  regions: Readonly<Record<string, readonly string[]>>,
  context: unknown,
  machine: MachineAny,
  accumulatedEffects: readonly EffectAny[]
): TransitionResult | undefined {
  const parallelNode = resolveStateNodeByPath(machine, parallelPath);
  if (!parallelNode || parallelNode.onDone === undefined) {
    return undefined;
  }

  // Check if ALL regions are in final states (sorted for determinism - GxP F4)
  const regionNames = Object.keys(regions).sort();
  if (regionNames.length === 0) {
    return undefined;
  }

  for (const regionName of regionNames) {
    const regionPath = regions[regionName];
    if (regionPath === undefined) {
      return undefined;
    }
    const leafNode = resolveStateNodeByPath(machine, regionPath);
    if (!leafNode || leafNode.type !== "final") {
      return undefined;
    }
  }

  // All regions are final — fire onDone
  const onDoneTransitions = normalizeTransitions(parallelNode.onDone);
  if (onDoneTransitions.length === 0) {
    return undefined;
  }

  const doneEvent: { readonly type: string } = Object.freeze({
    type: `done.state.${parallelPath.join(".")}`,
  });

  const matched = findMatchingTransition(onDoneTransitions, context, doneEvent);
  if (matched === undefined) {
    return undefined;
  }

  // Apply actions
  const newContext = applyActions(matched, context, doneEvent);
  const resolvedContext = newContext !== undefined ? newContext : context;

  // Resolve target at the parallel state's parent level (sibling of parallel)
  const targetPath = resolveTargetPath(matched.target, parallelPath, machine);

  // Collect effects: exit all regions + parallel state, then enter new target
  const exitEffects = collectParallelExitEffects(parallelPath, { parallelPath, regions }, machine);

  // Transition effects
  const transitionEffects: EffectAny[] = [];
  if (matched.effects !== undefined) {
    transitionEffects.push(...matched.effects);
  }

  // Entry effects for the new target
  const entryEffects: EffectAny[] = [];
  for (let i = parallelPath.length - 1; i < targetPath.length; i++) {
    const node = resolveStateNodeByPath(machine, targetPath.slice(0, i + 1));
    if (node?.entry !== undefined) {
      entryEffects.push(...node.entry);
    }
  }

  const allEffects = [...accumulatedEffects, ...exitEffects, ...transitionEffects, ...entryEffects];

  // Follow always transitions on the new target
  const alwaysResult = followAlwaysTransitionsForPath(
    targetPath,
    resolvedContext,
    machine,
    allEffects
  );

  // Check onDone for compound ancestors of the new target
  const finalPath = alwaysResult.newStatePath ?? targetPath;
  const finalContext =
    alwaysResult.newContext !== undefined ? alwaysResult.newContext : resolvedContext;

  return checkOnDone(finalPath, finalContext, machine, alwaysResult.effects);
}

/**
 * Checks whether an event can trigger a transition from parallel regions.
 * Returns true if any region can handle the event.
 */
export function canTransitionParallel(
  regionPaths: ParallelRegionPaths,
  event: { readonly type: string },
  context: unknown,
  machine: MachineAny
): boolean {
  for (const regionName of Object.keys(regionPaths.regions).sort()) {
    const regionPath = regionPaths.regions[regionName];
    if (regionPath === undefined) continue;
    const result = bubbleEvent(regionPath, context, event, machine);
    if (result.matched) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if a state node at a given path is a parallel state.
 */
export function isParallelState(path: readonly string[], machine: MachineAny): boolean {
  const node = resolveStateNodeByPath(machine, path);
  return node !== undefined && node.type === "parallel";
}

/**
 * Finds the first parallel state in a path during auto-entry.
 * Returns the depth at which the parallel state is found, or -1 if none.
 *
 * This is used during initial path computation to detect when we need
 * to switch from linear path tracking to parallel region tracking.
 */
export function findParallelDepth(path: readonly string[], machine: MachineAny): number {
  for (let i = 0; i < path.length; i++) {
    const subPath = path.slice(0, i + 1);
    const node = resolveStateNodeByPath(machine, subPath);
    if (node !== undefined && node.type === "parallel") {
      return i;
    }
  }
  return -1;
}

/**
 * Computes the initial path, detecting parallel states.
 * If the initial path enters a parallel state, returns info needed to set up regions.
 *
 * Returns either:
 * - `{ parallel: false, path: string[] }` for non-parallel initial paths
 * - `{ parallel: true, path: string[], parallelPath: string[], regionPaths: ParallelRegionPaths }` for parallel
 */
export function computeInitialPathWithParallel(machine: MachineAny):
  | { readonly parallel: false; readonly path: readonly string[] }
  | {
      readonly parallel: true;
      readonly path: readonly string[];
      readonly regionPaths: ParallelRegionPaths;
    } {
  // Start auto-entering from the initial state
  const path: string[] = [machine.initial];

  let maxDepth = 50;
  while (maxDepth-- > 0) {
    const node = resolveStateNodeByPath(machine, path);
    if (!node) {
      break;
    }

    if (node.type === "parallel" && node.states) {
      // Found a parallel state — set up region paths
      const regionPaths = computeParallelRegionPaths(path, machine);
      return { parallel: true, path, regionPaths };
    }

    if (node.type !== "compound" || !node.states || !node.initial) {
      break;
    }

    path.push(node.initial);
  }

  return { parallel: false, path };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Returns a "no transition" result.
 * @internal
 */
function noTransition(): TransitionResult {
  return {
    newState: undefined,
    newStatePath: undefined,
    newContext: undefined,
    effects: [],
    transitioned: false,
  };
}

/**
 * Gets the state node configuration for a given state name at root level.
 * @internal
 */
function getStateNode(machine: MachineAny, stateName: string): StateNodeAny | undefined {
  const statesRecord = machine.states;
  if (typeof statesRecord !== "object" || statesRecord === null) {
    return undefined;
  }
  if (!(stateName in statesRecord)) {
    return undefined;
  }
  const descriptor = Object.getOwnPropertyDescriptor(statesRecord, stateName);
  const value: unknown = descriptor !== undefined ? descriptor.value : undefined;
  if (isStateNodeAny(value)) {
    return value;
  }
  return undefined;
}

/**
 * Gets the transition configuration for a given event type from a state node.
 * @internal
 */
function getTransitionConfig(stateNode: StateNodeAny, eventType: string): unknown {
  const onMap = stateNode.on;
  if (typeof onMap !== "object" || onMap === null) {
    return undefined;
  }
  if (!(eventType in onMap)) {
    return undefined;
  }
  const descriptor = Object.getOwnPropertyDescriptor(onMap, eventType);
  return descriptor !== undefined ? descriptor.value : undefined;
}

/**
 * Finds the first transition whose guard passes (or has no guard).
 * @internal
 */
function findMatchingTransition(
  transitions: readonly TransitionConfigAny[],
  context: unknown,
  event: { readonly type: string }
): TransitionConfigAny | undefined {
  for (const transitionConfig of transitions) {
    // GxP F10: Per-transition event validation — skip transitions that reject the event
    if (transitionConfig.validate !== undefined) {
      const validateFn = transitionConfig.validate;
      if (!callValidate(validateFn, event)) {
        continue;
      }
    }

    if (transitionConfig.guard === undefined) {
      return transitionConfig;
    }
    if (callGuard(transitionConfig.guard, context, event)) {
      return transitionConfig;
    }
  }
  return undefined;
}

/**
 * Safe version of findMatchingTransition.
 * @internal
 */
function findMatchingTransitionSafe(
  transitions: readonly TransitionConfigAny[],
  context: unknown,
  event: { readonly type: string },
  machineId: string,
  currentState: string,
  enforcePureGuards?: boolean
): Result<TransitionConfigAny | undefined, TransitionError> {
  for (const transitionConfig of transitions) {
    // GxP F10: Per-transition event validation — skip transitions that reject the event
    if (transitionConfig.validate !== undefined) {
      const validateFn = transitionConfig.validate;
      if (!callValidate(validateFn, event)) {
        continue;
      }
    }

    if (transitionConfig.guard === undefined) {
      return ok(transitionConfig);
    }
    const guardResult = evaluateGuard(
      transitionConfig.guard,
      context,
      event,
      machineId,
      currentState,
      enforcePureGuards
    );
    if (guardResult._tag === "Err") {
      return err(guardResult.error);
    }
    if (guardResult.value) {
      return ok(transitionConfig);
    }
  }
  return ok(undefined);
}

/**
 * Applies actions in order to compute new context.
 * @internal
 */
function applyActions(
  transitionConfig: TransitionConfigAny,
  context: unknown,
  event: { readonly type: string }
): unknown {
  const actions = transitionConfig.actions;
  if (actions === undefined || actions.length === 0) {
    return undefined;
  }
  let currentContext: unknown = context;
  for (const action of actions) {
    currentContext = callAction(action, currentContext, event);
  }
  return currentContext;
}

/**
 * Safe version of applyActions.
 * @internal
 */
function applyActionsSafe(
  transitionConfig: TransitionConfigAny,
  context: unknown,
  event: { readonly type: string },
  machineId: string,
  currentState: string
): Result<unknown, TransitionError> {
  const actions = transitionConfig.actions;
  if (actions === undefined || actions.length === 0) {
    return ok(undefined);
  }
  let currentContext: unknown = context;
  for (const action of actions) {
    const actionResult = evaluateActionSafe(action, currentContext, event, machineId, currentState);
    if (actionResult._tag === "Err") {
      return err(actionResult.error);
    }
    currentContext = actionResult.value;
  }
  return ok(currentContext);
}
