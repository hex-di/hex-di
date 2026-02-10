/**
 * Query Cache brain panel.
 *
 * Displays the current state of the @hex-di/query cache, including
 * active queries, their status, cache hit/miss indicators, and
 * stale time configuration.
 *
 * @packageDocumentation
 */

import { type ReactNode, useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@hex-di/query-react";

function QueryCache(): ReactNode {
  const client = useQueryClient();
  const [, setTick] = useState(0);

  // Refresh every 2 seconds to show live cache state
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 2000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleClearCache = useCallback(() => {
    client.cache.clear();
    setTick(t => t + 1);
  }, [client]);

  const cacheEntries = [...client.cache.getAll()];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-pink-400 uppercase tracking-wider">
            Query Cache
          </span>
          <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
            {cacheEntries.length} entries
          </span>
        </div>
        <button
          type="button"
          onClick={handleClearCache}
          className="rounded border border-gray-700 px-2 py-0.5 text-xs text-gray-400 transition-colors hover:border-red-500 hover:text-red-400"
        >
          Clear Cache
        </button>
      </div>

      {/* Cache entries */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {cacheEntries.length === 0 && (
          <div className="py-8 text-center text-xs text-gray-600">
            No cached queries. Navigate to Discovery Hub to see queries appear.
          </div>
        )}
        <div className="flex flex-col gap-2">
          {cacheEntries.map(([key, entry]) => (
            <div key={key} className="rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-200 font-mono">{key}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    entry.status === "success"
                      ? "bg-emerald-900/40 text-emerald-400"
                      : entry.status === "error"
                        ? "bg-red-900/40 text-red-400"
                        : entry.status === "pending"
                          ? "bg-yellow-900/40 text-yellow-400"
                          : "bg-gray-800 text-gray-500"
                  }`}
                >
                  {entry.status}
                </span>
              </div>
              <div className="mt-1 flex gap-4 text-xs text-gray-500">
                {entry.dataUpdatedAt !== undefined && (
                  <span>Updated: {new Date(entry.dataUpdatedAt).toLocaleTimeString()}</span>
                )}
                {entry.isInvalidated && <span className="text-amber-500">Invalidated</span>}
                {entry.fetchCount !== undefined && <span>Fetches: {entry.fetchCount}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { QueryCache };
