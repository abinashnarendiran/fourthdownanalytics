"use client";

import React, { useState } from "react";
import { Platform, League } from "../../types/integration.types";
import LeaguePicker from "./LeaguePicker";
import { pl } from "zod/locales";
import { fetchSleeperAccount } from "@/api/intergrations";

interface Props {
  platform: Platform;
  onClose: () => void;
  onLeaguesAdded: (platformId: string, newLeagues: League[]) => void;
}

export default function AddLeagueModal({ platform, onClose, onLeaguesAdded }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState("");
  const [year, setYear] = useState("2025");
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(false);

  const handleContinue = async (platformName: string) => {
    if(!username) return;

    setLoading(true);

    if(platformName === "Sleeper") {
        const getSleeperUser =  await  fetchSleeperAccount(username, parseInt(year));

        console.log("Sleeper user fetch result:", getSleeperUser);
    }
      
    setLoading(false);
    /* if (!username) return;
    setLoading(true);
    try {
      const res = await resolveSleeperAccount(username, parseInt(year));
      setLeagues(res.leagues);
      setStep(2);
    } catch (err) {
      console.error(err);
      alert("Failed to resolve account. Check username/year.");
    }
    setLoading(false); */
  };

  const handleAddLeagues = async (selectedLeagueIds: string[]) => {
    /* if (selectedLeagueIds.length === 0) return;
    setLoading(true);
    try {
      // Use accountId from resolved leagues (assume first league has accountId)
      const accountId = leagues.find(l => l.added !== undefined)?.accountId || "";
      await attachSleeperLeagues(accountId, selectedLeagueIds);
      const newLeagues = leagues.filter(l => selectedLeagueIds.includes(l.id));
      onLeaguesAdded(platform.platform, newLeagues);
    } catch (err) {
      console.error(err);
      alert("Failed to add leagues.");
    }
    setLoading(false); */
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-lg p-6 w-full max-w-md"
        style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
      >
        <button
          className="text-gray-500 text-sm mb-4"
          onClick={onClose}
        >
          ✕ Close
        </button>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Add {platform.platform} League</h2>
            <p>How would you like to find your leagues?</p>

            <input
              type="text"
              placeholder={`${platform.platform} Username`}
              className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />

            <select
              className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={year}
              onChange={e => setYear(e.target.value)}
            >
              <option>2025</option>
              <option>2024</option>
            </select>

            <button
              onClick={() => handleContinue(platform.platform)}
              className="w-full px-4 py-2 rounded text-white hover:opacity-90 transition"
              style={{ backgroundColor: "var(--accent)" }}
            >
              {loading ? "Loading..." : "Continue"}
            </button>
          </div>
        )}

        {step === 2 && (
          <LeaguePicker leagues={leagues} onSubmit={handleAddLeagues} />
        )}
      </div>
    </div>
  );
}
