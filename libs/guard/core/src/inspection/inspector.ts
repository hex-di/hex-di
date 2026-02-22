import type { GuardEvent } from "../guard/events.js";

/**
 * Snapshot of guard runtime state for devtools display.
 */
export interface GuardInspectionSnapshot {
  readonly activePolicies: Readonly<Record<string, string>>;
  readonly recentDecisions: ReadonlyArray<{
    readonly evaluationId: string;
    readonly portName: string;
    readonly decision: "allow" | "deny";
    readonly subjectId: string;
    readonly evaluatedAt: string;
  }>;
  readonly permissionStats: Readonly<Record<string, { readonly allow: number; readonly deny: number }>>;
}

/**
 * A listener function for guard inspection events.
 */
export type GuardInspectionEventListener = (event: GuardEvent) => void;

/**
 * Maximum number of recent decisions to retain in the snapshot.
 */
const MAX_RECENT_DECISIONS = 100;

/**
 * DevTools inspector for the guard library.
 * Implements the LibraryInspector protocol for integration with HexDI DevTools.
 *
 * Call onEvent() from guard enforcement hooks to feed events into the inspector.
 */
export class GuardInspector {
  readonly name = "guard";

  private readonly _activePolicies = new Map<string, string>();
  private readonly _recentDecisions: Array<{
    evaluationId: string;
    portName: string;
    decision: "allow" | "deny";
    subjectId: string;
    evaluatedAt: string;
  }> = [];
  private readonly _permissionStats = new Map<string, { allow: number; deny: number }>();
  private readonly _listeners = new Set<GuardInspectionEventListener>();

  /**
   * Returns a snapshot of the current guard state.
   */
  getSnapshot(): GuardInspectionSnapshot {
    const activePolicies: Record<string, string> = {};
    for (const [key, value] of this._activePolicies) {
      activePolicies[key] = value;
    }

    const permissionStats: Record<string, { allow: number; deny: number }> = {};
    for (const [key, value] of this._permissionStats) {
      permissionStats[key] = { ...value };
    }

    return Object.freeze({
      activePolicies: Object.freeze(activePolicies),
      recentDecisions: Object.freeze(this._recentDecisions.map((d) => Object.freeze({ ...d }))),
      permissionStats: Object.freeze(permissionStats),
    });
  }

  /**
   * Subscribes to guard inspection events.
   * Returns an unsubscribe function.
   */
  subscribe(listener: GuardInspectionEventListener): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  /**
   * Called by guard enforcement hooks to feed events into the inspector.
   */
  onEvent(event: GuardEvent): void {
    switch (event.kind) {
      case "guard.allow": {
        this._recordDecision({
          evaluationId: event.evaluationId,
          portName: event.portName,
          decision: "allow",
          subjectId: event.subjectId,
          evaluatedAt: event.timestamp,
        });
        this._recordStat(event.portName, "allow");
        break;
      }
      case "guard.deny": {
        this._recordDecision({
          evaluationId: event.evaluationId,
          portName: event.portName,
          decision: "deny",
          subjectId: event.subjectId,
          evaluatedAt: event.timestamp,
        });
        this._recordStat(event.portName, "deny");
        break;
      }
      case "guard.error": {
        // Errors are noted but don't affect stats
        break;
      }
    }

    // Notify all listeners
    for (const listener of this._listeners) {
      listener(event);
    }
  }

  /**
   * Registers an active policy for a named port.
   */
  registerPolicy(portName: string, policyKind: string): void {
    this._activePolicies.set(portName, policyKind);
  }

  /**
   * Clears all recorded state (useful for testing).
   */
  reset(): void {
    this._activePolicies.clear();
    this._recentDecisions.length = 0;
    this._permissionStats.clear();
  }

  private _recordDecision(decision: {
    evaluationId: string;
    portName: string;
    decision: "allow" | "deny";
    subjectId: string;
    evaluatedAt: string;
  }): void {
    this._recentDecisions.push(decision);
    if (this._recentDecisions.length > MAX_RECENT_DECISIONS) {
      this._recentDecisions.shift();
    }
  }

  private _recordStat(portName: string, outcome: "allow" | "deny"): void {
    const existing = this._permissionStats.get(portName);
    if (existing !== undefined) {
      existing[outcome] += 1;
    } else {
      this._permissionStats.set(portName, { allow: 0, deny: 0, [outcome]: 1 });
    }
  }
}
