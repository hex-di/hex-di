/**
 * Store State brain panel.
 *
 * Displays the current state of all registered @hex-di/store ports,
 * including state ports, atom ports, and derived ports with their
 * current values rendered as JSON.
 *
 * @packageDocumentation
 */

import { type ReactNode, useState, useEffect } from "react";
import { useStatePort, useAtom, useDerived } from "@hex-di/store-react";
import { TrainerProfilePort } from "../../../store/ports/trainer-profile.js";
import { TeamPort } from "../../../store/ports/team.js";
import { FavoritesPort } from "../../../store/ports/favorites.js";
import { AppSettingsPort } from "../../../store/ports/app-settings.js";
import { TeamPowerPort } from "../../../store/ports/team-power.js";
import { TypeCoveragePort } from "../../../store/ports/type-coverage.js";

function StoreEntry({
  name,
  category,
  value,
}: {
  readonly name: string;
  readonly category: string;
  readonly value: unknown;
}): ReactNode {
  const [expanded, setExpanded] = useState(false);

  const displayValue =
    value instanceof Set ? JSON.stringify([...value], null, 2) : JSON.stringify(value, null, 2);

  const isLong = displayValue.length > 80;

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-200 font-mono">{name}</span>
          <span className="rounded-full bg-gray-800 px-1.5 py-0.5 text-xs text-gray-500">
            {category}
          </span>
        </div>
        {isLong && (
          <button
            type="button"
            onClick={() => {
              setExpanded(e => !e);
            }}
            className="text-xs text-pink-400 hover:text-pink-300"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        )}
      </div>
      <pre
        className={`mt-1 text-xs text-gray-400 font-mono ${!expanded && isLong ? "max-h-12 overflow-hidden" : ""}`}
      >
        {displayValue}
      </pre>
    </div>
  );
}

function StoreState(): ReactNode {
  const [, setTick] = useState(0);

  // Re-render every 3 seconds to pick up store changes
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 3000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Read all store values
  const trainerProfile = useStatePort(TrainerProfilePort);
  const team = useStatePort(TeamPort);
  const [favorites] = useAtom(FavoritesPort);
  const [appSettings] = useAtom(AppSettingsPort);
  const teamPower = useDerived(TeamPowerPort);
  const typeCoverage = useDerived(TypeCoveragePort);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center border-b border-gray-800 px-4 py-2">
        <span className="text-xs font-semibold text-pink-400 uppercase tracking-wider">
          Store State
        </span>
        <span className="ml-2 rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
          6 ports
        </span>
      </div>

      {/* Store entries */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="flex flex-col gap-2">
          <StoreEntry name="TrainerProfile" category="state" value={trainerProfile.state} />
          <StoreEntry name="Team" category="state" value={team.state} />
          <StoreEntry name="Favorites" category="atom" value={favorites} />
          <StoreEntry name="AppSettings" category="atom" value={appSettings} />
          <StoreEntry name="TeamPower" category="derived" value={teamPower} />
          <StoreEntry name="TypeCoverage" category="derived" value={typeCoverage} />
        </div>
      </div>
    </div>
  );
}

export { StoreState };
