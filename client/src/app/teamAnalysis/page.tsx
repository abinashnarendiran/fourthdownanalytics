"use client";

import React, { useCallback, useEffect, useState } from "react";
import { MainLayout } from "../components/MainLayout";
import { Protected } from "../components/Protected";
import type { FantasyLeague } from "@/types/viewModels/integrations";
import type { DashboardLeagueStatus } from "@/types/viewModels/dashboard";
import type {
  TeamAnalysisData,
  TeamRosterOption,
} from "@/types/viewModels/teamAnalysis";
import {
  getSleeperLeagueStatus,
  getSleeperTeamAnalysisSeasonData,
} from "@/api/sleeper";
import { LeagueStatusCard } from "../components/LeagueStatusCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { LEAGUE_STATUS } from "@/constants/leagueStatusSleeper";
import HeaderControls from "../components/HeaderControls";
import InSeason from "./InSeason/InSeason";

export default function TeamAnalysis() {
  const [selectedLeague, setSelectedLeague] = useState<FantasyLeague | null>(
    null,
  );
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [leagueMetaData, setLeagueMetaData] =
    useState<DashboardLeagueStatus | null>(null);
  const [teams, setTeams] = useState<TeamRosterOption[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamRosterOption | null>(
    null,
  );
  const [teamAnalysisData, setTeamAnalysisData] =
    useState<TeamAnalysisData | null>(null);

  const loading = loadingStatus || loadingAnalysis;

  useEffect(() => {
    if (!selectedLeague) return;

    let active = true;

    const fetchStatus = async () => {
      const [requestError, status] = await getSleeperLeagueStatus(
        selectedLeague.id,
      );
      if (!active) return;

      if (requestError) {
        setError(requestError.message);
        setLeagueMetaData(null);
        setLoadingAnalysis(false);
      } else {
        setLeagueMetaData(status);
        if (status.currentWeek !== null) setSelectedWeek(status.currentWeek);
        if (status.leagueStatus === LEAGUE_STATUS.preDraft.value) {
          setLoadingAnalysis(false);
        }
      }
      setLoadingStatus(false);
    };

    void fetchStatus().catch((requestError: unknown) => {
      if (!active) return;
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load league status",
      );
      setLeagueMetaData(null);
      setLoadingAnalysis(false);
      setLoadingStatus(false);
    });

    return () => {
      active = false;
    };
  }, [selectedLeague]);

  useEffect(() => {
    if (!selectedLeague || !selectedTeam || !leagueMetaData) return;

    if (leagueMetaData.leagueStatus === LEAGUE_STATUS.preDraft.value) {
      return;
    }

    let active = true;

    const fetchAnalysis = async () => {
      const [requestError, analysis] = await getSleeperTeamAnalysisSeasonData(
        selectedLeague.id,
        selectedWeek,
        selectedTeam.rosterId,
        leagueMetaData.leagueStatus,
        null,
      );
      if (!active) return;

      if (requestError) {
        setError(requestError.message);
        setTeamAnalysisData(null);
      } else {
        setTeamAnalysisData(analysis);
      }
      setLoadingAnalysis(false);
    };

    void fetchAnalysis().catch((requestError: unknown) => {
      if (!active) return;
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load team analysis",
      );
      setTeamAnalysisData(null);
      setLoadingAnalysis(false);
    });

    return () => {
      active = false;
    };
  }, [leagueMetaData, selectedLeague, selectedTeam, selectedWeek]);

  const handleGetLeagues = useCallback((availableLeagues: FantasyLeague[]) => {
    if (availableLeagues.length === 0) return;
    const latestLeague = availableLeagues.reduce((latest, league) =>
      league.seasonYear > latest.seasonYear ? league : latest,
    );
    setSelectedLeague((currentLeague) => {
      if (currentLeague) return currentLeague;
      return latestLeague;
    });
    setLoadingStatus(true);
    setLoadingAnalysis(false);
  }, []);

  const handleSelectLeague = (league: FantasyLeague) => {
    setLoadingStatus(true);
    setSelectedWeek(1);
    setSelectedTeam(null);
    setTeams([]);
    setLeagueMetaData(null);
    setTeamAnalysisData(null);
    setError("");
    setSelectedLeague(league);
  };

  const handleSelectWeek = (week: number) => {
    setLoadingAnalysis(true);
    setTeamAnalysisData(null);
    setError("");
    setSelectedWeek(week);
  };

  const handleSelectTeam = useCallback(
    (team: TeamRosterOption) => {
      setLoadingAnalysis(
        leagueMetaData?.leagueStatus !== LEAGUE_STATUS.preDraft.value,
      );
      setTeamAnalysisData(null);
      setError("");
      setSelectedTeam(team);
    },
    [leagueMetaData],
  );

  return (
    <Protected>
      <MainLayout
        title="Team Analysis"
        headerControls={
          <HeaderControls
            selectedLeague={selectedLeague}
            handleGetLeagues={handleGetLeagues}
            handleSelectLeague={handleSelectLeague}
            selectedWeek={selectedWeek}
            handleSelectWeek={handleSelectWeek}
            loading={loading}
            leagueMetaData={leagueMetaData}
            chooseTeam
            setTeams={setTeams}
            selectedTeam={selectedTeam}
            setSelectedTeam={handleSelectTeam}
          />
        }
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <LoadingSpinner />
            <p className="text-sm font-medium uppercase tracking-widest opacity-50">
              Fetching Stats
            </p>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800"
          >
            <h3 className="font-bold">Unable to load team analysis</h3>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        ) : !selectedLeague ? (
          <div className="flex h-96 items-center justify-center rounded-2xl border-2 border-dashed border-border text-lg font-medium text-muted-foreground">
            Connect a league to view team analysis.
          </div>
        ) : leagueMetaData?.leagueStatus === LEAGUE_STATUS.preDraft.value ? (
          <div className="rounded-2xl border border-border bg-background p-8 text-center">
            <h3 className="text-xl font-bold">
              Weekly stats are not available yet
            </h3>
            <p className="mt-2 text-muted-foreground">
              Team analysis will appear once the season has scoring data. League
              rosters remain available in the team selector.
            </p>
          </div>
        ) : teamAnalysisData && selectedTeam ? (
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <div className="min-h-150 rounded-2xl border border-border bg-background p-8 shadow-sm">
                <header className="mb-8 flex items-center justify-between">
                  <h3 className="text-xl font-bold">Season Performance</h3>
                  <span className="rounded bg-accent/10 px-2 py-1 text-xs font-bold uppercase text-accent">
                    Live Data
                  </span>
                </header>
                <InSeason data={teamAnalysisData} />
              </div>
            </div>
            <div className="space-y-6 lg:col-span-4">
              {leagueMetaData && (
                <div className="sticky top-8">
                  <LeagueStatusCard leagueMetaData={leagueMetaData} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-background p-8 text-center">
            <h3 className="text-xl font-bold">
              {teams.length === 0
                ? "No league rosters are available"
                : "Weekly stats are not available yet"}
            </h3>
            <p className="mt-2 text-muted-foreground">
              {teams.length === 0
                ? "Check back after a team roster is available."
                : "Select a roster above. Weekly analysis will appear when scoring data is available."}
            </p>
          </div>
        )}
      </MainLayout>
    </Protected>
  );
}
