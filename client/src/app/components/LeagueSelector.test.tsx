import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import LeagueSelector from "./LeagueSelector";
import { apiUrl, server } from "@/test/server";
import { makeLeague } from "@/test/fixtures";

describe("LeagueSelector", () => {
  it("lists the user's leagues once loaded and reports them to the parent", async () => {
    const leagues = [
      makeLeague({ id: "db-1", leagueId: "sl-1", leagueName: "Gridiron Gods", seasonYear: 2024 }),
      makeLeague({ id: "db-2", leagueId: "sl-2", leagueName: "Sunday Scrum", seasonYear: 2023 }),
    ];
    server.use(
      http.get(apiUrl("leagues/getUserLeagues"), () =>
        HttpResponse.json({ leagues }),
      ),
    );
    const onGetLeagues = vi.fn();

    render(<LeagueSelector onGetLeagues={onGetLeagues} onSelect={vi.fn()} />);

    expect(
      await screen.findByRole("option", { name: "Gridiron Gods (2024)" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Sunday Scrum (2023)" })).toBeInTheDocument();
    expect(onGetLeagues).toHaveBeenCalledWith(leagues);
  });

  it("calls onSelect with the full league object when the user picks a different league", async () => {
    const leagues = [
      makeLeague({ id: "db-1", leagueId: "sl-1", leagueName: "Gridiron Gods", seasonYear: 2024 }),
      makeLeague({ id: "db-2", leagueId: "sl-2", leagueName: "Sunday Scrum", seasonYear: 2023 }),
    ];
    server.use(
      http.get(apiUrl("leagues/getUserLeagues"), () =>
        HttpResponse.json({ leagues }),
      ),
    );
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(<LeagueSelector selected={leagues[0]} onSelect={onSelect} />);
    await screen.findByRole("option", { name: "Sunday Scrum (2023)" });

    await user.selectOptions(screen.getByRole("combobox"), "sl-2");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(leagues[1]);
  });

  it("shows an empty-state option when the user has no leagues", async () => {
    render(<LeagueSelector />);

    expect(
      await screen.findByRole("option", { name: "No leagues available" }),
    ).toBeInTheDocument();
  });

  it("surfaces the API error message and keeps the select empty when loading fails", async () => {
    server.use(
      http.get(apiUrl("leagues/getUserLeagues"), () =>
        HttpResponse.json({ message: "Sleeper is unreachable" }, { status: 500 }),
      ),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(<LeagueSelector onSelect={vi.fn()} />);

    expect(await screen.findByText("Sleeper is unreachable")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("combobox")).not.toBeDisabled(),
    );
    expect(screen.queryByRole("option", { name: /Gridiron/ })).not.toBeInTheDocument();
  });
});
