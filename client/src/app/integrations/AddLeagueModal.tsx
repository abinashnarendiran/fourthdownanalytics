"use client";

import React, { useState } from "react";
import { Platform, League, PlatformUser } from "../../types/integration.types";
import { LeaguePicker } from "./LeaguePicker";
import { fetchSleeperAccount } from "@/api/intergrations";

interface AddLeagueModalProps {
  platform: Platform;
  onClose: () => void;
  onLeaguesAdded: (
    platformUser: PlatformUser | null,
    newLeagues: League[]
  ) => void;
  addError: boolean;
  addErrorMessage: string;
}

export const AddLeagueModal: React.FC<AddLeagueModalProps> = ({
  platform,
  onClose,
  onLeaguesAdded,
  addError,
  addErrorMessage
}) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState("");
  const [year, setYear] = useState(currentYear);
  const [userData, setUserData] = useState<PlatformUser | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Step 1: Fetch leagues based on username and year
  const handleContinue = async () => {
    if (!username) return;

    setLoading(true);
    setError(false);
    setErrorMessage("");

    try {
      if (platform.platform === "Sleeper") {
        const getSleeperUser = await fetchSleeperAccount(username, year);

        if (getSleeperUser[0] === null) {
          setError(false);
          setErrorMessage("");
          setUserData(getSleeperUser[1]);
          setLeagues((getSleeperUser[1]?.leagues as League[]) || []);
          setStep(2);
        } else {
          setError(true);
          setErrorMessage(
            getSleeperUser[0]?.message || "Failed to fetch Sleeper account"
          );
        }
      }
    } catch (err) {
      console.error(err);
      setError(true);
      setErrorMessage("Failed to fetch leagues. Try again.");
    }

    setLoading(false);
  };

  // Step 2: Add selected leagues
  const handleAddLeagues = (selectedLeagueIds: string[]) => {
    if (selectedLeagueIds.length === 0) return;

    const filteredLeagues = leagues.filter((league) =>
      selectedLeagueIds.includes(league.leagueId)
    );

    setLoading(true);
    try {
      onLeaguesAdded(userData, filteredLeagues);
    } catch (err) {
      console.error(err);
      alert("Failed to add leagues.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-lg p-6 w-full max-w-md"
        style={{
          backgroundColor: "var(--background)",
          color: "var(--foreground)"
        }}
      >
        <button className="text-gray-500 text-sm mb-4" onClick={onClose}>
          ✕ Close
        </button>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              Add {platform.platform} League
            </h2>
            <p>How would you like to find your leagues?</p>

            <input
              type="text"
              placeholder={`${platform.platform} Username`}
              className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <select
              className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {errorMessage}
              </div>
            )}

            <button
              onClick={handleContinue}
              className="w-full px-4 py-2 rounded text-white hover:opacity-90 transition"
              style={{ backgroundColor: "var(--accent)" }}
            >
              {loading ? "Loading..." : "Continue"}
            </button>
          </div>
        )}

        {step === 2 && (
          <LeaguePicker
            leagues={leagues}
            onSubmit={handleAddLeagues}
            addError={addError}
            addErrorMessage={addErrorMessage}
          />
        )}
      </div>
    </div>
  );
};
