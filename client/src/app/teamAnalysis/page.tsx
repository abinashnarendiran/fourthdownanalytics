"use client";

import React, { useState, useEffect } from "react";
import LeagueSelector from "../components/LeagueSelector";
import { MainLayout } from "../components/MainLayout";
import { Protected } from "../components/Protected";
import { FantasyLeague, Team } from "@/types/integration.types";
import {
  getSleeperLeagueSeasonTeams,
  getSleeperLeagueStatus,
  getSleeperTeamAnalysisSeasonData,
} from "@/api/sleeper";
import { LeagueStatusCard } from "../components/LeagueStatusCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { LEAGUE_STATUS } from "@/constants/leagueStatusSleeper";
import HeaderControls from "../components/HeaderControls";
import PreDraft from "../dashboard/PreDraftSeason/PreDraft";
import InSeason from "./InSeason/InSeason";

type LeagueStatusData = {
  leagueStatus: string;
  currentWeek?: number;
  // ...other fields
};

type TeamAnalysisData = {
  teamAnalysis: any;
};

export default function TeamAnalysis() {
  const [leagues, setLeagues] = useState<FantasyLeague[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<FantasyLeague | null>(
    null,
  );
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [dataFound, setDataFound] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [leagueMetaData, setLeagueMetaData] = useState<any>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team>({} as Team);
  const [teamAnalysisData, setTeamAnalysisData] = useState<any>(null);
  const [comparisonTeam, setComparisonTeam] = useState<Team>({} as Team);

  const handleGetLeagues = (data: FantasyLeague[]) => setLeagues(data);

  const handleSelectLeague = async (league: FantasyLeague) => {
    setSelectedWeek(1);
    setTeamAnalysisData(null);
    setSelectedLeague(league);
    setLoading(true);

    const sleeperTeams = (await getSleeperLeagueSeasonTeams(league.id)) as [
      Team | null,
      { teams: Team[] } | null,
    ];

    if (sleeperTeams[0] === null && (sleeperTeams[1]?.teams?.length ?? 0) > 0) {
      const teamsSleeper = sleeperTeams[1]!.teams;
      const defaultTeam = teamsSleeper.find(
        (team: Team) => team.default === true,
      );

      // Setting this will now trigger the useEffect we added in Step 1
      setSelectedTeam(defaultTeam ?? teamsSleeper[0]);
    }
    setLoading(false);
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
        const sleeperTeams = (await getSleeperLeagueSeasonTeams(
          latestLeague.id,
        )) as [Team | null, { teams: Team[] } | null];
        if (
          sleeperTeams[0] === null &&
          (sleeperTeams[1]?.teams?.length ?? 0) > 0
        ) {
          const teamsSleeper = sleeperTeams[1]!.teams; // we've already confirmed it's non-null above
          const defaultTeam = teamsSleeper.find(
            (team: Team) => team.default === true,
          );
          const teamToSelect = defaultTeam ?? teamsSleeper[0];
          setSelectedTeam(teamToSelect);
          await fetchLeagueData(latestLeague.id, teamToSelect, selectedWeek);
        }

        setDataFound(true);
      }
    };
    fetchLatestLeague();
  }, [leagues, selectedWeek, dataFound, selectedTeam]);

  // Trigger data fetch whenever the team OR week changes
  useEffect(() => {
    if (selectedLeague?.id && selectedTeam?.rosterId) {
      fetchLeagueData(selectedLeague.id, selectedTeam, selectedWeek);
    }
  }, [selectedTeam, selectedWeek]);

  const fetchLeagueData = async (id: string, team: Team, week: number) => {
    try {
      setLoading(true);
      let errorStatus = false;
      const sleeperStatus = (await getSleeperLeagueStatus(id)) as [
        Error | null,
        { leagueStatus: string; currentWeek?: number } | null,
      ];

      if (sleeperStatus[0] !== null) {
        errorStatus = true;
        setError(sleeperStatus[0].message);
        setLeagueMetaData(null);
      } else {
        setLeagueMetaData(sleeperStatus[1]);

        const x = (await getSleeperTeamAnalysisSeasonData(
          id,
          week,
          team.rosterId,
          sleeperStatus[1]?.leagueStatus || "X",
          null,

        )) as [Error | null, { teamAnalysis: any } | null];


        if (x[0] !== null) {
          errorStatus = true;
          setError(x[0].message);
          setTeamAnalysisData(null);
        } else {
          setTeamAnalysisData(x[1]?.teamAnalysis ?? null);
        }
        // If you want to auto-select the current week:
        // if (sleeperStatus[1]?.currentWeek) setSelectedWeek(sleeperStatus[1].currentWeek);
        setError("");
      }

      if (!errorStatus) {
        //const x =await getSleeperTeamAnalysisSeasonData(id, week, team.rosterId, leagueMetaData.leagueStatus);
        // console.log("Fetched team analysis data:", x);
        /* const sleeperTeams = await getSleeperLeagueSeasonTeams(id);
        if (sleeperStatus[0] !== null) {
          errorStatus = true;
          setError(sleeperStatus[0].message);
          setTeams([]);
        } else {
          setTeams(sleeperTeams[1]);
          setError("");
        } */
      }
    } catch (error) {
      setError("Error fetching data.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWeek = async (week: number) => {
    setSelectedWeek(week);
    setTeamAnalysisData(null);
    setLoading(true);
    const selectedLeagueDataId = selectedLeague?.id || "";
    await fetchLeagueData(selectedLeagueDataId, selectedTeam, week);
    setLoading(false);
  };

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
            chooseTeam={true}
            setTeams={setTeams}
            selectedTeam={selectedTeam}
            setSelectedTeam={setSelectedTeam}
          />
        }>
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
              {leagueMetaData && teamAnalysisData && selectedTeam ? (
                <div className="bg-white rounded-2xl border border-border shadow-sm p-8 min-h-150">
                  <header className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold">Season Performance</h3>
                    <div className="text-xs font-bold px-2 py-1 bg-accent/10 text-accent rounded uppercase">
                      Live Data
                    </div>
                  </header>
                  {leagueMetaData.leagueStatus ===
                    LEAGUE_STATUS.complete.value && (
                    <InSeason seasonData={teamAnalysisData} selectedLeague={selectedLeague} week={selectedWeek} selectedTeam={selectedTeam} comparisonTeam={comparisonTeam} setComparisonTeam={setComparisonTeam}/>
                  )}
                  {leagueMetaData.leagueStatus ===
                    LEAGUE_STATUS.preDraft.value && (
                    <PreDraft seasonData={teamAnalysisData} />
                  )}

                  {leagueMetaData.leagueStatus ===
                    LEAGUE_STATUS.inSeason.value && <p>In Season Season</p>}
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
}
