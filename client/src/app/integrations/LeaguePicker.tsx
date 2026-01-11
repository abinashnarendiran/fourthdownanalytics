"use client";

import React, { useState } from "react";
import { League } from "../../types/integration.types";

interface Props {
  leagues: League[];
  onSubmit: (selectedLeagueIds: string[]) => void;
}

export default function LeaguePicker({ leagues, onSubmit }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    leagues.filter(l => l.added).map(l => l.id)
  );

  const toggleLeague = (id: string, alreadyAdded: boolean) => {
    if (alreadyAdded) return; // cannot deselect already added
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    onSubmit(selectedIds);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Select leagues to add</h2>
      <ul className="space-y-2 max-h-64 overflow-y-auto">
        {leagues.map(league => (
          <li key={league.id}>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                className="accent-purple-600"
                checked={selectedIds.includes(league.id)}
                disabled={league.added}
                /* onChange={() => toggleLeague(league.id, league.added)} */
              />
              <span className={league.added ? "text-gray-400" : "text-gray-800"}>
                {league.name} {league.added && "(Already added)"}
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
    </div>
  );
}
