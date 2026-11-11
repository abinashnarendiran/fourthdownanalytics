"use client";

import React, { useState, useEffect } from "react";
import { MainLayout } from "../components/MainLayout";
import { Protected } from "../components/Protected";
import type { FantasyLeague } from "@/types/viewModels/integrations";
import { getSleeperSeasonData, getSleeperLeagueStatus } from "@/api/sleeper";
import { LeagueStatusCard } from "../components/LeagueStatusCard";
import LoadingSpinner from "../components/LoadingSpinner";
import InSeason from "./InSeason/InSeason";
import CurrentWeekSelector from "../components/CurrentWeekSelector";
import CompleteSeason from "./CompleteSeason/CompleteSeason";
import PreDraft from "./PreDraftSeason/PreDraft";
import { LEAGUE_STATUS } from "@/constants/leagueStatusSleeper";
import type {
  DashboardLeagueStatus,
  DashboardSeasonData,
} from "@/types/viewModels/dashboard";
import LeagueSelector from "../components/LeagueSelector";

export const Dashboard = () => {
  const [leagues, setLeagues] = useState<FantasyLeague[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<FantasyLeague | null>(
    null,
  );
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [dataFound, setDataFound] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [leagueMetaData, setLeagueMetaData] =
    useState<DashboardLeagueStatus | null>(null);
  const [seasonData, setSeasonData] = useState<DashboardSeasonData | null>(
    null,
  );

  const handleGetLeagues = (data: FantasyLeague[]) => setLeagues(data);

  const handleSelectLeague = async (league: FantasyLeague) => {
    setSelectedWeek(1);
    setSeasonData(null);
    setSelectedLeague(league);
    setLoading(true);
    try {
      await fetchLeagueData(league.id, 1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchLatestLeague = async () => {
      if (leagues.length === 0) return;
      const latestLeague = leagues.reduce((prev, curr) =>
        curr.seasonYear > prev.seasonYear ? curr : prev,
      );
      if (
        !selectedLeague ||
        (selectedLeague.id !== latestLeague.id && !dataFound)
      ) {
        setLoading(true);
        setSelectedLeague(latestLeague);
        try {
          await fetchLeagueData(latestLeague.id, selectedWeek);
          setDataFound(true);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchLatestLeague();
  }, [leagues, dataFound]);

  const fetchLeagueData = async (id: string, selectedWeek: number) => {
    try {
      setError("");
      const sleeperStatus = await getSleeperLeagueStatus(id);

      if (sleeperStatus[0] !== null) {
        setError(sleeperStatus[0].message);
        setLeagueMetaData(null);
        setSeasonData(null);
        return;
      }

      setLeagueMetaData(sleeperStatus[1]);
      const data = await getSleeperSeasonData(id, selectedWeek);
      if (data[0] === null) {
        setSeasonData(data[1].league);
      } else {
        setError(data[0].message);
        setSeasonData(null);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load league data",
      );
      setSeasonData(null);
    }
  };

  const handleSelectWeek = async (week: number) => {
    setSelectedWeek(week);
    setSeasonData(null);
    setLoading(true);
    const selectedLeagueDataId = selectedLeague?.id || "";
    try {
      await fetchLeagueData(selectedLeagueDataId, week);
    } finally {
      setLoading(false);
    }
  };

  const headerControls = (
    <div className="flex items-center gap-4">
      <div className="flex flex-col">
        <LeagueSelector
          selected={selectedLeague ?? undefined}
          onGetLeagues={handleGetLeagues}
          onSelect={handleSelectLeague}
          disabled={loading}
        />
      </div>

      {leagueMetaData?.leagueStatus === LEAGUE_STATUS.inSeason.value && (
        <div className="flex flex-col">
          <CurrentWeekSelector
            currentWeek={selectedWeek}
            disabled={loading}
            onSelect={handleSelectWeek}
          />
        </div>
      )}
    </div>
  );

  return (
    <Protected>
      <MainLayout title="Dashboard" headerControls={headerControls}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <LoadingSpinner />
            <p className="text-sm font-medium opacity-50 tracking-widest uppercase">
              Fetching Stats
            </p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-xl">
            <h3 className="font-bold">Sync Error</h3>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* MAIN ANALYTICS COLUMN */}
            <div className="lg:col-span-8">
              {leagueMetaData && seasonData ? (
                <div className="bg-white rounded-2xl border border-border shadow-sm p-8 min-h-150">
                  <header className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold">Season Performance</h3>
                    <div className="text-xs font-bold px-2 py-1 bg-accent/10 text-accent rounded uppercase">
                      Live Data
                    </div>
                  </header>
                  {leagueMetaData.leagueStatus ===
                    LEAGUE_STATUS.complete.value &&
                    "finalPowerRankings" in seasonData && (
                      <CompleteSeason seasonData={seasonData} />
                    )}
                  {leagueMetaData.leagueStatus ===
                    LEAGUE_STATUS.preDraft.value &&
                    "teams" in seasonData && (
                      <PreDraft seasonData={seasonData} />
                    )}

                  {leagueMetaData.leagueStatus ===
                    LEAGUE_STATUS.inSeason.value &&
                    "powerRankings" in seasonData && (
                      <InSeason seasonData={seasonData} />
                    )}
                </div>
              ) : (
                <div className="h-96 border-2 border-dashed border-border rounded-2xl flex items-center justify-center opacity-30 text-lg font-medium">
                  Connect a league to view analytics
                </div>
              )}
            </div>

            {/* SIDEBAR REFERENCE COLUMN */}
            <div className="lg:col-span-4 space-y-6">
              {leagueMetaData && (
                <div className="sticky top-8">
                  <LeagueStatusCard leagueMetaData={leagueMetaData} />
                </div>
              )}
            </div>
          </div>
        )}
      </MainLayout>
    </Protected>
  );
};

export default Dashboard;
