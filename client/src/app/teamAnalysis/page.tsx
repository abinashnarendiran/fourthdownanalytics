"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MainLayout } from "../components/MainLayout";
import { Protected } from "../components/Protected";
import type { FantasyLeague } from "@/types/viewModels/integrations";
import type { DashboardLeagueStatus } from "@/types/viewModels/dashboard";
import type {
  TeamAnalysisData,
  TeamAnalysisMetricTab,
  TeamRosterOption,
} from "@/types/viewModels/teamAnalysis";
import type { ApiResult } from "@/apiConfig/client";
import {
  getSleeperLeagueStatus,
  getSleeperTeamAnalysisSeasonData,
} from "@/api/sleeper";
import type { SleeperLeagueStatusDTO } from "@/types/api/sleeper";
import { LeagueStatusCard } from "../components/LeagueStatusCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { LEAGUE_STATUS } from "@/constants/leagueStatusSleeper";
import HeaderControls from "../components/HeaderControls";
import InSeason from "./InSeason/InSeason";
import TeamComparisonDrawer from "./components/TeamComparisonDrawer";

const readQueryId = (name: string): number | null => {
  if (typeof window === "undefined") return null;
  const value = Number(new URLSearchParams(window.location.search).get(name));
  return Number.isInteger(value) && value > 0 ? value : null;
};

const readMetricTab = (): TeamAnalysisMetricTab => {
  if (typeof window === "undefined") return "overview";
  const value = new URLSearchParams(window.location.search).get("metric");
  return value === "schedule" || value === "positions" ? value : "overview";
};

export default function TeamAnalysis() {
  const router = useRouter();
  const pathname = usePathname();
  const [requestedTeamId] = useState(() => readQueryId("teamId"));
  const [initialTeamId, setInitialTeamId] = useState(requestedTeamId);
  const [compareRosterFromUrl, setCompareRosterFromUrl] = useState<
    number | null
  >(() => readQueryId("compareWith"));
  const compareRosterFromUrlRef = useRef(compareRosterFromUrl);
  const teamsRef = useRef<TeamRosterOption[]>([]);
  const initialSelectionPending = useRef(true);
  const analysisRequests = useRef(
    new Map<string, Promise<ApiResult<TeamAnalysisData>>>(),
  );
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
  const [comparisonOpen, setComparisonOpen] = useState(
    () => readQueryId("compareWith") !== null,
  );
  const [metricTab, setMetricTab] =
    useState<TeamAnalysisMetricTab>(readMetricTab);

  const loading = loadingStatus || loadingAnalysis;

  const updateQuery = useCallback(
    (
      updates: Partial<
        Record<"teamId" | "compareWith" | "metric", string | null>
      >,
    ) => {
      const params = new URLSearchParams(window.location.search);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) params.delete(key);
        else if (value !== undefined) params.set(key, value);
      });
      const query = params.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}`, {
        scroll: false,
      });
    },
    [pathname, router],
  );

  const requestTeamAnalysis = useCallback(
    (
      leagueId: string,
      week: number,
      rosterId: number,
      status: SleeperLeagueStatusDTO["leagueStatus"],
    ) => {
      const key = `${leagueId}:${week}:${rosterId}:${status}`;
      const requests = analysisRequests.current;
      const existing = requests.get(key);
      if (existing) return existing;
      const request = getSleeperTeamAnalysisSeasonData(
        leagueId,
        week,
        rosterId,
        status,
        null,
      ).catch((requestError: unknown): ApiResult<TeamAnalysisData> => [
        requestError instanceof Error
          ? requestError
          : new Error("Unable to load team analysis"),
        null,
      ]);
      if (requests.size >= 40) {
        const oldestKey = requests.keys().next().value;
        if (oldestKey) requests.delete(oldestKey);
      }
      requests.set(key, request);
      return request;
    },
    [],
  );

  const prefetchTeamAnalysis = useCallback(
    (team: TeamRosterOption) => {
      if (
        selectedLeague &&
        leagueMetaData &&
        leagueMetaData.leagueStatus !== LEAGUE_STATUS.preDraft.value
      ) {
        void requestTeamAnalysis(
          selectedLeague.id,
          selectedWeek,
          team.rosterId,
          leagueMetaData.leagueStatus,
        );
      }
    },
    [leagueMetaData, requestTeamAnalysis, selectedLeague, selectedWeek],
  );

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
      const [requestError, analysis] = await requestTeamAnalysis(
        selectedLeague.id,
        selectedWeek,
        selectedTeam.rosterId,
        leagueMetaData.leagueStatus,
      );
      if (!active) return;

      if (requestError) {
        analysisRequests.current.delete(
          `${selectedLeague.id}:${selectedWeek}:${selectedTeam.rosterId}:${leagueMetaData.leagueStatus}`,
        );
        setError(requestError.message);
        setTeamAnalysisData(null);
        setComparisonOpen(false);
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
  }, [
    leagueMetaData,
    requestTeamAnalysis,
    selectedLeague,
    selectedTeam,
    selectedWeek,
  ]);

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

  const handleGetTeams = useCallback(
    (availableTeams: TeamRosterOption[]) => {
      teamsRef.current = availableTeams;
      setTeams(availableTeams);
      const compareRosterId = compareRosterFromUrlRef.current;
      if (
        compareRosterId !== null &&
        !availableTeams.some((team) => team.rosterId === compareRosterId)
      ) {
        compareRosterFromUrlRef.current = null;
        setCompareRosterFromUrl(null);
        setComparisonOpen(false);
        updateQuery({ compareWith: null });
      }
    },
    [updateQuery],
  );

  const handleSelectLeague = (league: FantasyLeague) => {
    setLoadingStatus(true);
    setSelectedWeek(1);
    setSelectedTeam(null);
    setTeams([]);
    setLeagueMetaData(null);
    setTeamAnalysisData(null);
    setError("");
    setSelectedLeague(league);
    setInitialTeamId(null);
    teamsRef.current = [];
    setCompareRosterFromUrl(null);
    compareRosterFromUrlRef.current = null;
    setComparisonOpen(false);
    initialSelectionPending.current = false;
    updateQuery({ teamId: null, compareWith: null });
  };

  const handleSelectWeek = (week: number) => {
    setComparisonOpen(false);
    setCompareRosterFromUrl(null);
    compareRosterFromUrlRef.current = null;
    updateQuery({ compareWith: null });
    setLoadingAnalysis(true);
    setTeamAnalysisData(null);
    setError("");
    setSelectedWeek(week);
  };

  const handleSelectTeam = useCallback(
    (team: TeamRosterOption) => {
      const isInitialDeepLink =
        initialSelectionPending.current && team.rosterId === requestedTeamId;
      initialSelectionPending.current = false;
      setInitialTeamId(null);
      const compareRosterId = compareRosterFromUrlRef.current;
      const preservedCompareId =
        isInitialDeepLink &&
        compareRosterId !== null &&
        compareRosterId !== team.rosterId &&
        teamsRef.current.some(
          (candidate) => candidate.rosterId === compareRosterId,
        )
          ? compareRosterId
          : null;
      if (!isInitialDeepLink) {
        setComparisonOpen(false);
        setCompareRosterFromUrl(null);
        compareRosterFromUrlRef.current = null;
      } else if (preservedCompareId === null) {
        setComparisonOpen(false);
        setCompareRosterFromUrl(null);
        compareRosterFromUrlRef.current = null;
      } else {
        compareRosterFromUrlRef.current = preservedCompareId;
      }
      updateQuery({
        teamId: String(team.rosterId),
        compareWith:
          preservedCompareId === null ? null : String(preservedCompareId),
      });
      setLoadingAnalysis(
        leagueMetaData?.leagueStatus !== LEAGUE_STATUS.preDraft.value,
      );
      setTeamAnalysisData(null);
      setError("");
      setSelectedTeam(team);
    },
    [leagueMetaData, requestedTeamId, updateQuery],
  );

  const handleMetricTabChange = (tab: TeamAnalysisMetricTab) => {
    setMetricTab(tab);
    updateQuery({ metric: tab });
  };

  const handleComparisonRosterChange = (rosterId: number | null) => {
    compareRosterFromUrlRef.current = rosterId;
    setCompareRosterFromUrl(rosterId);
    updateQuery({
      compareWith: rosterId === null ? null : String(rosterId),
    });
  };

  const closeComparison = () => {
    setComparisonOpen(false);
    handleComparisonRosterChange(null);
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
            chooseTeam
            setTeams={handleGetTeams}
            selectedTeam={selectedTeam}
            setSelectedTeam={handleSelectTeam}
            onPrefetchTeam={prefetchTeamAnalysis}
            initialTeamId={initialTeamId}
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
        ) : teamAnalysisData && selectedTeam && leagueMetaData ? (
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <div className="min-h-150 rounded-2xl border border-border bg-background p-8 shadow-sm">
                <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold">Season Performance</h3>
                    <span className="mt-2 inline-flex rounded bg-accent/10 px-2 py-1 text-xs font-bold uppercase text-accent">
                      Live Data
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setComparisonOpen(true)}
                    aria-expanded={comparisonOpen}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                  >
                    Compare Team
                  </button>
                </header>
                <InSeason
                  data={teamAnalysisData}
                  activeMetric={metricTab}
                  onMetricChange={handleMetricTabChange}
                />
              </div>
            </div>
            <div className="space-y-6 lg:col-span-4">
              {leagueMetaData && (
                <div className="sticky top-8">
                  <LeagueStatusCard leagueMetaData={leagueMetaData} />
                </div>
              )}
            </div>
            <TeamComparisonDrawer
              open={comparisonOpen}
              onClose={closeComparison}
              leagueId={selectedLeague.id}
              week={selectedWeek}
              seasonStatus={leagueMetaData.leagueStatus}
              primaryTeam={selectedTeam}
              teams={teams}
              initialRosterId={compareRosterFromUrl}
              onSelectRoster={handleComparisonRosterChange}
            />
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
