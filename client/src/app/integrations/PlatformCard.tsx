"use client";

import React from "react";
import { Platform } from "@/types/integration.types";

interface Props {
  platform: Platform;
  onAddLeague: () => void;
  onDeleteLeague: (id: string) => void; // use `id` (your internal one) for deletion
  onDeletePlatform?: (id: string) => void; // use `id` (your internal one) for deletion
  isResyncing?: boolean;
  onResyncing?: () => void;
}

export const PlatformCard = ({ platform, onAddLeague, onDeleteLeague, onDeletePlatform, isResyncing, onResyncing }: Props) =>{
  const { platform: name, account } = platform;

  // Platform colors/icons
  const platformColors: Record<string, string> = {
    Sleeper: "bg-purple-600",
    espn: "bg-blue-500",
    yahoo: "bg-yellow-400",
  };

  return (
    <div
      className="border rounded-lg p-4 shadow hover:shadow-md transition relative"
      style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
    >
      {/* Header */}
      <div className="flex items-center mb-2">
        <span
          className={`w-3 h-3 rounded-full mr-2 ${platformColors[name] || "bg-gray-400"}`}
        />
        <h2
          className="text-lg font-semibold capitalize"
          style={{ color: "var(--primary)" }}
        >
          {name}
        </h2>
      </div>

      {/* Account info or placeholder */}
      {account ? (
        <div className="mt-2 space-y-3">
          {/* Account header */}
          <p className="text-sm text-gray-700">
            <span className="font-medium">Account:</span> {account.username} ({name})
          </p>

          {/* Leagues */}
          <div>
            <p className="font-medium text-gray-800 mb-1">Leagues</p>
            <ul className="space-y-1 text-sm text-gray-700">
              {account.leagues.map((league) => (
                <li
                  key={league.leagueId}
                  className="flex items-center justify-between rounded px-2 py-1 hover:bg-gray-50"
                >
                  <span>
                    {league.leagueName} ({league.seasonYear})
                  </span>
                  <button
                    onClick={() => onDeleteLeague(league.id)}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center space-x-2">
              <button
                onClick={onAddLeague}
                className="px-3 py-1 rounded text-white text-sm hover:opacity-90 transition"
                style={{ backgroundColor: "var(--accent)" }}
              >
                + Add League
              </button>

              <button className="text-gray-500 hover:text-gray-700 text-sm" disabled={isResyncing || !account} onClick={onResyncing}>
                {isResyncing ? "⟳ Syncing..." : "⟳ Sync"}
              </button>
            </div>

            {/* Delete Account */}
            <button
              onClick={() => onDeletePlatform?.(account.fantasyPlatformId)}
              className="text-red-700 text-sm hover:underline"
            >
              Delete account
            </button>
          </div>
        </div>
      ) : (
        // If no account yet, allow adding account + league
        <div className="mt-4">
          <p className="text-sm text-gray-700 mb-2">No account connected yet.</p>
          <button
            onClick={onAddLeague}
            className="px-3 py-1 rounded text-white hover:opacity-90 transition"
            style={{ backgroundColor: "var(--accent)" }}
          >
            + Connect Account / Add League
          </button>
        </div>
      )}
    </div>
  );
}
