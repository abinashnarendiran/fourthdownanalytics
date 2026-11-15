import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, delay } from "msw";
import { Dashboard } from "./page";
import { renderWithProviders } from "@/test/renderWithProviders";
import { apiUrl, server } from "@/test/server";
import { makeLeague, makeRanking } from "@/test/fixtures";

const league = makeLeague({ id: "db-1", leagueId: "sl-1", leagueName: "Gridiron Gods", seasonYear: 2024 });

const inSeasonStatus = { seasonYear: 2024, currentWeek: 5, leagueStatus: "in_season", seasonFinished: false };

const inSeasonRankings = [
  makeRanking({ rosterId: 2, teamName: "Second Place Hustle", owner: "bob", rank: 2, powerScore: 80, rankChange: -1, trend: "▼" }),
  makeRanking({ rosterId: 1, teamName: "Top Dogs", owner: "alice", rank: 1, powerScore: 92.5, rankChange: 2, trend: "▲" }),
];

interface DashboardApiOptions {
  leagues?: unknown[];
  status?: Record<string, unknown>;
  statusError?: string;
  league?: unknown;
  onPowerRankings?: (body: { id: string; week: number }) => void;
  powerRankingsDelayMs?: number;
}

function mockDashboardApi({
  leagues = [league],
  status = inSeasonStatus,
  statusError,
  league: seasonLeague = { powerRankings: inSeasonRankings },
  onPowerRankings,
  powerRankingsDelayMs = 0,
}: DashboardApiOptions = {}) {
  server.use(
    http.get(apiUrl("leagues/getUserLeagues"), () => HttpResponse.json({ leagues })),
    http.get(apiUrl("sleeper/getSleeperLeagueStatus/:id"), () =>
      statusError
        ? HttpResponse.json({ message: statusError }, { status: 500 })
        : HttpResponse.json(status),
    ),
    http.post(apiUrl("sleeper/getSleeperPowerRankingsSeasonData"), async ({ request }) => {
      const body = (await request.json()) as { id: string; week: number };
      onPowerRankings?.(body);
      if (powerRankingsDelayMs) await delay(powerRankingsDelayMs);
      return HttpResponse.json({ status: "in_season", league: seasonLeague });
    }),
  );
}

describe("Dashboard page", () => {
  it("shows the connect prompt and makes no analytics request when the user has no leagues", async () => {
    const onPowerRankings = vi.fn();
    mockDashboardApi({ leagues: [], onPowerRankings });

    renderWithProviders(<Dashboard />);

    expect(await screen.findByText("Connect a league to view analytics")).toBeInTheDocument();
    expect(onPowerRankings).not.toHaveBeenCalled();
  });

  it("shows a loading state while the latest league is being fetched", async () => {
    mockDashboardApi({ powerRankingsDelayMs: 200 });

    renderWithProviders(<Dashboard />);

    expect(await screen.findByText("Fetching Stats")).toBeInTheDocument();
    expect(await screen.findByText("Season Performance")).toBeInTheDocument();
    expect(screen.queryByText("Fetching Stats")).not.toBeInTheDocument();
  });

  it("auto-selects the most recent league and renders its power rankings sorted by rank", async () => {
    mockDashboardApi();

    renderWithProviders(<Dashboard />);

    expect(await screen.findByText("Season Performance")).toBeInTheDocument();
    const names = screen.getAllByText(/Top Dogs|Second Place Hustle/).map((el) => el.textContent);
    expect(names).toEqual(["Top Dogs", "Second Place Hustle"]);
    expect(screen.getByText("Power Score: 92.5")).toBeInTheDocument();
    expect(screen.getByText("Current Week:").parentElement).toHaveTextContent("Week 5");
    expect(screen.getByText("Live Data")).toBeInTheDocument();
  });

  it("shows a sync error card with the API message when the league status request fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockDashboardApi({ statusError: "Sleeper API is down" });

    renderWithProviders(<Dashboard />);

    const errorCard = await screen.findByText("Sync Error");
    expect(errorCard.parentElement).toHaveTextContent("Sleeper API is down");
    expect(screen.queryByText("Season Performance")).not.toBeInTheDocument();
  });

  it("requests the newly selected week and renders that week's data when the user changes week", async () => {
    const onPowerRankings = vi.fn();
    mockDashboardApi({ onPowerRankings });
    const user = userEvent.setup();

    renderWithProviders(<Dashboard />);
    await screen.findByText("Season Performance");

    const weekSelect = screen.getByRole("combobox", { name: "Select Week" });
    await screen.findByRole("option", { name: "Week 3" });
    await user.selectOptions(weekSelect, "3");

    await waitFor(() =>
      expect(onPowerRankings).toHaveBeenLastCalledWith({ id: "db-1", week: 3 }),
    );
    expect(await screen.findByText("Season Performance")).toBeInTheDocument();
  });

  it("renders the complete-season view for a finished league", async () => {
    mockDashboardApi({
      status: { seasonYear: 2024, currentWeek: null, leagueStatus: "complete", seasonFinished: true },
      league: { finalPowerRankings: [makeRanking({ teamName: "Final Champs", rank: 1, championship: true })] },
    });

    renderWithProviders(<Dashboard />);

    expect(await screen.findByText("Final Champs")).toBeInTheDocument();
    expect(screen.queryByText(/Current Week:/)).toBeInTheDocument();
    expect(screen.queryByText("Live Data")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Select Week" })).not.toBeInTheDocument();
  });

  it("renders the pre-draft view for a league that has not drafted", async () => {
    mockDashboardApi({
      status: { seasonYear: 2025, currentWeek: null, leagueStatus: "pre_draft", seasonFinished: false },
      league: {
        leagueId: "sl-1",
        seasonYear: 2025,
        leagueType: "Redraft",
        draftType: "snake",
        draftDate: "2025-09-04T19:00:00",
        scoringType: "ppr",
        draftComplete: "No",
        draftPosition: 3,
        wavierType: "FAAB",
        rosterPositions: ["QB", "RB", "RB"],
        IRSlots: 1,
        playoffTeams: 6,
        playoffWeeks: 3,
        regularSeasonWeeks: 14,
        taxiSlots: 0,
        tradeDeadlineWeek: 10,
        teams: [{ teamName: "Draft Day Dynasty", ownerName: "carol", coOwners: [] }],
      },
    });

    renderWithProviders(<Dashboard />);

    expect(await screen.findByText("Pre-Draft League Info")).toBeInTheDocument();
    expect(screen.getByText("Draft Day Dynasty")).toBeInTheDocument();
    expect(screen.getByText("Sep 4, 2025 7:00 PM")).toBeInTheDocument();
  });

  it("contains a rendering crash inside the analytics view and keeps the page chrome usable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    // A null powerScore makes PowerRankings throw when it calls toFixed.
    mockDashboardApi({
      league: { powerRankings: [makeRanking({ powerScore: null as unknown as number })] },
    });
    const user = userEvent.setup();

    renderWithProviders(<Dashboard />);

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Dashboard failed to load")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument();

    // The data is unchanged, so a retry re-renders the same crash and the fallback stays.
    await user.click(within(alert).getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Dashboard failed to load");
    expect(screen.queryByText("Season Performance")).not.toBeInTheDocument();
  });
});
