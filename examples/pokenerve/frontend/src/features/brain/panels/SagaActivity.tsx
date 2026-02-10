/**
 * Saga Activity brain panel.
 *
 * Displays active and completed saga executions from the
 * @hex-di/saga runtime, including step counts and status.
 *
 * @packageDocumentation
 */

import { type ReactNode, useState, useEffect } from "react";
import { useSagaHistory } from "@hex-di/saga-react";
import type { SagaExecutionSummary } from "@hex-di/saga";

function SagaActivity(): ReactNode {
  const [, setTick] = useState(0);
  const history = useSagaHistory({ sagaName: "PokemonTrade" });

  // Refresh periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
      history.refresh();
    }, 2000);
    return () => {
      clearInterval(interval);
    };
  }, [history]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center border-b border-gray-800 px-4 py-2">
        <span className="text-xs font-semibold text-pink-400 uppercase tracking-wider">
          Saga Activity
        </span>
        <span className="ml-2 rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
          {history.entries.length} executions
        </span>
        {history.loading && <span className="ml-2 text-xs text-yellow-400">Loading...</span>}
      </div>

      {/* Saga executions */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {history.entries.length === 0 && (
          <div className="py-8 text-center text-xs text-gray-600">
            No saga executions yet. Navigate to Trading Post and execute a trade.
          </div>
        )}
        <div className="flex flex-col gap-3">
          {history.entries.map((execution: SagaExecutionSummary) => (
            <div
              key={execution.executionId}
              className="rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-200 font-mono">
                  {execution.sagaName}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    execution.status === "completed"
                      ? "bg-emerald-900/40 text-emerald-400"
                      : execution.status === "failed"
                        ? "bg-red-900/40 text-red-400"
                        : execution.status === "running"
                          ? "bg-yellow-900/40 text-yellow-400"
                          : execution.status === "compensating"
                            ? "bg-orange-900/40 text-orange-400"
                            : "bg-gray-800 text-gray-500"
                  }`}
                >
                  {execution.status}
                </span>
              </div>
              <div className="mt-1 flex gap-4 text-xs text-gray-500">
                <span className="font-mono">{execution.executionId.substring(0, 12)}...</span>
                <span>
                  Steps: {execution.completedStepCount}/{execution.stepCount}
                </span>
                {execution.compensated && <span className="text-orange-400">Compensated</span>}
                <span>{new Date(execution.startedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { SagaActivity };
