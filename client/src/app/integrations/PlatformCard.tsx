"use client";

import React from "react";
import { Platform } from "@/types/integration.types";

interface Props {
  platform: Platform;
  onAddLeague: () => void;
}

export default function PlatformCard({ platform, onAddLeague }: Props) {
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
        <div className="mt-2">
          <p className="text-sm text-gray-700">
            Account: {account.username} ({name})
          </p>

          {/* Leagues */}
          <div className="mt-2 space-y-1">
            <p className="font-medium text-gray-800">Leagues:</p>
            <ul className="pl-4 list-disc text-gray-700 text-sm">
              {account.leagues.map(league => (
                <li key={league.id}>
                  {league.name} ({league.year})
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="mt-3 flex space-x-2">
            <button
              onClick={onAddLeague}
              className="px-3 py-1 rounded text-white hover:opacity-90 transition"
              style={{ backgroundColor: "var(--accent)" }}
            >
              + Add League
            </button>

            <button className="text-gray-600 hover:text-gray-800 text-sm">
              ⟳ Sync
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
