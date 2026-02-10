/**
 * Guard condition status display.
 *
 * Lists each possible evolution from the current state with a visual
 * indicator of whether each guard condition is satisfied. Shows current
 * value vs required value for each condition.
 *
 * @packageDocumentation
 */

import type { ReactNode } from "react";
import type { EvolutionContext } from "../../machines/evolution-context.js";
import type { ConditionDescription } from "../../machines/evolution-guards.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EvolutionTarget {
  readonly targetName: string;
  readonly conditions: readonly ConditionDescription[];
}

interface GuardConditionsProps {
  readonly targets: readonly EvolutionTarget[];
  readonly context: EvolutionContext;
}

// ---------------------------------------------------------------------------
// Condition Row
// ---------------------------------------------------------------------------

function ConditionRow({
  condition,
  context,
}: {
  readonly condition: ConditionDescription;
  readonly context: EvolutionContext;
}): ReactNode {
  const satisfied = condition.satisfiedFn(context);
  const currentValue = condition.currentValueFn(context);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={satisfied ? "text-emerald-400" : "text-gray-500"}>
        {satisfied ? "\u2713" : "\u2717"}
      </span>
      <span className={satisfied ? "text-gray-200" : "text-gray-500"}>{condition.label}</span>
      <span className="ml-auto text-xs text-gray-500">(current: {currentValue})</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Target Card
// ---------------------------------------------------------------------------

function TargetCard({
  target,
  context,
}: {
  readonly target: EvolutionTarget;
  readonly context: EvolutionContext;
}): ReactNode {
  const allSatisfied =
    target.conditions.length === 0 || target.conditions.every(c => c.satisfiedFn(context));

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            allSatisfied ? "bg-emerald-400" : "bg-gray-600"
          }`}
        />
        <span className="text-sm font-medium capitalize text-gray-200">{target.targetName}</span>
        {allSatisfied && <span className="ml-auto text-xs text-emerald-400">Ready</span>}
      </div>
      {target.conditions.length === 0 ? (
        <p className="text-xs text-gray-500">No conditions required</p>
      ) : (
        <div className="space-y-1">
          {target.conditions.map((condition, idx) => (
            <ConditionRow key={idx} condition={condition} context={context} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GuardConditions
// ---------------------------------------------------------------------------

function GuardConditions({ targets, context }: GuardConditionsProps): ReactNode {
  if (targets.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
        <p className="text-sm text-gray-500">
          No evolutions available from this state. This is a final form.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
        Evolution Conditions
      </h3>
      {targets.map(target => (
        <TargetCard key={target.targetName} target={target} context={context} />
      ))}
    </div>
  );
}

export { GuardConditions };
export type { EvolutionTarget, GuardConditionsProps };
