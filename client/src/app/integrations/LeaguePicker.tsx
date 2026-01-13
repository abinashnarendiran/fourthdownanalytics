"use client";

import React, { useState } from "react";
import { League } from "../../types/integration.types";

interface Props {
  leagues: League[];
  onSubmit: (selectedLeagueIds: string[]) => void;
  addError: boolean;
  addErrorMessage: string;
}

export const LeaguePicker = ({ leagues, onSubmit, addError, addErrorMessage }: Props) => {
  // State to track selected leagues
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Toggle league selection
  const toggleLeague = (id: string, alreadyAdded: boolean) => {
    if (alreadyAdded) return; // cannot deselect already added
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Submit selected leagues
  const handleSubmit = () => {
    onSubmit(selectedIds);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Select leagues to add</h2>
      <ul className="space-y-2 max-h-64 overflow-y-auto">
        {leagues.map(league => (
          <li key={league.leagueId} className="flex items-center">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                className="accent-purple-600"
                checked={selectedIds.includes(league.leagueId)}
                disabled={league.added}
                onChange={() => toggleLeague(league.leagueId, league.added)}
              />
              <span className={league.added ? "text-gray-400" : "text-gray-800"}>
                {league.leagueName} {league.added && "(Already added)"}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <button
        className="w-full px-4 py-2 rounded text-white hover:opacity-90 transition"
        style={{ backgroundColor: "var(--accent)" }}
        onClick={handleSubmit}
      >
        Add Selected Leagues
      </button>
      {addError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {addErrorMessage}
        </div>
      )}
    </div>
  );
}
