import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, delay } from "msw";
import TeamAnalysis from "./page";
import { renderWithProviders } from "@/test/renderWithProviders";
import { apiUrl, server } from "@/test/server";
import { makeLeague } from "@/test/fixtures";

const league = makeLeague({ id: "db-1", leagueId: "sl-1", leagueName: "Gridiron Gods", seasonYear: 2024 });

const inSeasonStatus = { seasonYear: 2024, currentWeek: 5, leagueStatus: "in_season", seasonFinished: false };

const rosters = [
  { rosterId: 1, teamName: "Top Dogs", default: true },
  { rosterId: 2, teamName: "Second Place Hustle" },
];

const makeTeamAnalysis = (overrides: Record<string, unknown> = {}) => ({
  team: {
    rosterId: 1,
    name: "Top Dogs",
    owner: "alice",
    actualWins: 6,
    winAnalysis: {
      actualWins: 6,
      actualLosses: 4,
      actualTies: 0,
      expectedWins: 4.5,
      expectedLosses: 5.5,
      winDiff: 1.5,
      record: "6-4",
    },
    consistency: 12.3,
    efficiency: { actual: 0.9, projected: 0.85, optimal: 0.95 },
    actualStarterPoints: 1200,
    optimalStarterPoints: 1300,
    lineupEfficiencyMetadataWarnings: [],
    coaching: {
      actualPoints: 1200,
      optimalPoints: 1300,
      pointsLeft: 100,
      coachingIQ: 92,
      weeksIncluded: 8,
      weeksUnavailable: 0,
      weeklyScoreStdDev: 12.3,
      metadataWarnings: [],
    },
    scheduleLuck: {
      distribution: [],
      schedulesAvailable: 0,
      schedulesEvaluated: 0,
      incompleteSchedules: 0,
      weeksPerSchedule: 0,
    },
    positionalRadar: [],
    dataCoverage: { requestedWeeks: 8, scoredWeeks: 8, omittedWeeks: 0 },
    champion: false,
    runner_up: false,
    lastPlace: false,
    luck: { luckIndex: 1.5, luckVariance: 0.4, weeklyLuckHistory: [] },
    averages: {
      teamAvg: 150,
      stdDev: 12,
      weeklyVsLeague: [
        { week: 1, teamPoints: 145, leagueAvg: 140 },
        { week: 2, teamPoints: 160, leagueAvg: 142 },
      ],
      leagueAvg: 141,
    },
    positionalOverview: [
      {
        position: "QB",
        rosterCount: 1,
        totalPoints: 300,
        averagePoints: 20,
        leagueAveragePoints: 18,
        vsLeagueAverage: 2,
        players: [{ playerId: "p1", name: "Josh Allen", position: "QB", team: "BUF", status: "Active" }],
      },
    ],
    scoredWeeks: 8,
    ...(overrides.team as object | undefined),
  },
  compareTeamId: null,
});

interface TeamAnalysisApiOptions {
  leagues?: unknown[];
  status?: Record<string, unknown>;
  teams?: unknown[];
  analysisError?: string;
  analysisDelayMs?: number;
  onAnalysis?: (body: { rosterId: number; week: number; seasonStatus: string }) => void;
}

function mockTeamAnalysisApi({
  leagues = [league],
  status = inSeasonStatus,
  teams = rosters,
  analysisError,
  analysisDelayMs = 0,
  onAnalysis,
}: TeamAnalysisApiOptions = {}) {
  server.use(
    http.get(apiUrl("leagues/getUserLeagues"), () => HttpResponse.json({ leagues })),
    http.get(apiUrl("sleeper/getSleeperLeagueStatus/:id"), () => HttpResponse.json(status)),
    http.get(apiUrl("sleeper/getSleeperLeagueSeasonTeams/:id"), () => HttpResponse.json({ teams })),
    http.post(apiUrl("sleeper/getSleeperTeamAnalysisSeasonData"), async ({ request }) => {
      const body = (await request.json()) as { rosterId: number; week: number; seasonStatus: string };
      onAnalysis?.(body);
      if (analysisDelayMs) await delay(analysisDelayMs);
      if (analysisError) {
        return HttpResponse.json({ message: analysisError }, { status: 500 });
      }
      const team = teams.find((t) => (t as { rosterId: number }).rosterId === body.rosterId) as
        | { teamName: string }
        | undefined;
      return HttpResponse.json({
        teamAnalysis: makeTeamAnalysis({
          team: { rosterId: body.rosterId, name: team?.teamName ?? "Unknown" },
        }),
      });
    }),
  );
}

describe("Team analysis page", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("shows the connect prompt and makes no analysis request when the user has no leagues", async () => {
    const onAnalysis = vi.fn();
    mockTeamAnalysisApi({ leagues: [], onAnalysis });

    renderWithProviders(<TeamAnalysis />);

    expect(await screen.findByText("Connect a league to view team analysis.")).toBeInTheDocument();
    expect(onAnalysis).not.toHaveBeenCalled();
  });

  it("shows a loading state while the team analysis is still being fetched", async () => {
    mockTeamAnalysisApi({ analysisDelayMs: 200 });

    renderWithProviders(<TeamAnalysis />);

    expect(await screen.findByText("Fetching Stats")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Top Dogs" })).toBeInTheDocument();
    expect(screen.queryByText("Fetching Stats")).not.toBeInTheDocument();
  });

  it("does not request team analysis for a pre-draft league and explains why", async () => {
    const onAnalysis = vi.fn();
    mockTeamAnalysisApi({
      status: { seasonYear: 2025, currentWeek: null, leagueStatus: "pre_draft", seasonFinished: false },
      onAnalysis,
    });

    renderWithProviders(<TeamAnalysis />);

    expect(await screen.findByText("Weekly stats are not available yet")).toBeInTheDocument();
    expect(
      screen.getByText(/Team analysis will appear once the season has scoring data/),
    ).toBeInTheDocument();
    expect(onAnalysis).not.toHaveBeenCalled();
  });

  it("requests the default roster for the current week and renders its record and luck summary", async () => {
    const onAnalysis = vi.fn();
    mockTeamAnalysisApi({ onAnalysis });

    renderWithProviders(<TeamAnalysis />);

    expect(await screen.findByRole("heading", { name: "Top Dogs" })).toBeInTheDocument();
    expect(screen.getByText(/Manager: alice · 6-4 record/)).toBeInTheDocument();
    expect(screen.getByText("Lucky")).toBeInTheDocument();
    expect(screen.getByText("+1.50")).toBeInTheDocument();
    expect(screen.getByText("Live Data")).toBeInTheDocument();
    expect(onAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ rosterId: 1, week: 5, seasonStatus: "in_season" }),
    );
  });

  it("selects the roster named in the teamId deep link and requests its analysis", async () => {
    window.history.replaceState(null, "", "/teamAnalysis?teamId=2");
    const onAnalysis = vi.fn();
    mockTeamAnalysisApi({ onAnalysis });

    renderWithProviders(<TeamAnalysis />);

    expect(await screen.findByRole("heading", { name: "Second Place Hustle" })).toBeInTheDocument();
    expect(onAnalysis).toHaveBeenCalledWith(expect.objectContaining({ rosterId: 2 }));
    expect(onAnalysis).not.toHaveBeenCalledWith(expect.objectContaining({ rosterId: 1 }));
  });

  it("switches metric tabs and only shows the overview chart on the overview tab", async () => {
    mockTeamAnalysisApi();
    const user = userEvent.setup();

    renderWithProviders(<TeamAnalysis />);

    expect(await screen.findByText("Weekly Points")).toBeInTheDocument();
    const tabs = screen.getByRole("navigation", { name: "Team analysis metrics" });
    const overviewTab = within(tabs).getByRole("button", { name: "Overview" });
    const positionsTab = within(tabs).getByRole("button", { name: "Positions" });
    expect(overviewTab).toHaveAttribute("aria-current", "page");
    expect(positionsTab).not.toHaveAttribute("aria-current");

    await user.click(positionsTab);

    expect(positionsTab).toHaveAttribute("aria-current", "page");
    expect(overviewTab).not.toHaveAttribute("aria-current");
    expect(screen.queryByText("Weekly Points")).not.toBeInTheDocument();
    expect(await screen.findByText("Josh Allen")).toBeInTheDocument();
  });

  it("shows an alert with the API message when the team analysis request fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockTeamAnalysisApi({ analysisError: "Scoring data is unavailable" });

    renderWithProviders(<TeamAnalysis />);

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("heading", { name: "Unable to load team analysis" })).toBeInTheDocument();
    expect(within(alert).getByText("Scoring data is unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Top Dogs" })).not.toBeInTheDocument();
  });
});
