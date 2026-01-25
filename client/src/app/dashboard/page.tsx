"use client";

import React, { useState, useEffect } from "react";
import LeagueSelector from "../components/LeagueSelector";
import { MainLayout } from "../components/MainLayout";
import { Protected } from "../components/Protected";
import { FantasyLeague } from "@/types/integration.types";
import { get } from "http";
import {
  getSleeperCompleteSeasonData,
  getSleeperLeagueStatus,
} from "@/api/sleeper";
import { set } from "zod";
import { LEAGUE_STATUS_LABELS } from "@/constants/leagueStatusSleeper";
import { LeagueStatusCard } from "../components/LeagueStatusCard";
import { fa } from "zod/locales";
import CompleteSeason from "./CompleteSeason/CompleteSeason";
import LoadingSpinner from "../components/LoadingSpinner";

export const Dashboard = () => {
  const [leagues, setLeagues] = useState<FantasyLeague[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<FantasyLeague | null>(
    null,
  );
  const [dataFound, setDataFound] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [leagueMetaData, setLeagueMetaData] = useState<any>(null);
  const [seasonData, setSeasonData] = useState<any>(null);

  // Called when LeagueSelector fetches leagues
  const handleGetLeagues = (data: FantasyLeague[]) => {
    setLeagues(data);
  };

  // Called when user selects a league manually
  const handleSelectLeague = async (league: FantasyLeague) => {
    setSeasonData(null);
    setSelectedLeague(league);
    setLoading(true);
    await fetchLeagueData(league.id);
    setLoading(false);
  };

  // Auto-select latest season league on first load
  useEffect(() => {
    const fetchLatestLeague = async () => {
      if (leagues.length === 0) return;

      // Find latest season league
      const latestLeague = leagues.reduce((prev, curr) =>
        curr.seasonYear > prev.seasonYear ? curr : prev,
      );

      // Only set if not already selected
      if (
        !selectedLeague ||
        (selectedLeague.id !== latestLeague.id && dataFound === false)
      ) {
        setLoading(true);
        setSelectedLeague(latestLeague);
        await fetchLeagueData(latestLeague.id);
        setDataFound(true);
        setLoading(false);
      }
    };
    fetchLatestLeague();
  }, [leagues, dataFound]);

  // Example fetch function for selected league
  const fetchLeagueData = async (id: string) => {
    let errorStatus = false;
    const sleeperStatus = await getSleeperLeagueStatus(id);

    if (sleeperStatus[0]) {
      errorStatus = true;
      setError(true);
      setLeagueMetaData(null);
    } else {
      setLeagueMetaData(sleeperStatus[1]);
      errorStatus = false;
    }

    if (!errorStatus) {
      const data = await getSleeperCompleteSeasonData(id);
      if (data[0] === null) {
        console.log(data[1])
        setSeasonData(data[1]);
        setError(false);
      } else {
        setError(true);
      }
    }
    // API call here...
  };

  return (
    <Protected>
      <MainLayout title="Dashboard">
        <LeagueSelector
          selected={selectedLeague ?? undefined}
          onGetLeagues={handleGetLeagues}
          onSelect={handleSelectLeague}
        />

        {loading && <LoadingSpinner />}

        {!loading && leagueMetaData && seasonData && (
          <>
            <LeagueStatusCard leagueMetaData={leagueMetaData} />
            {leagueMetaData.leagueStatus === "complete" && (
              <CompleteSeason seasonData={seasonData} />
            )}
          </>
        )}
      </MainLayout>
    </Protected>
  );
};
