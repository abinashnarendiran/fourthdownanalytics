import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, delay } from "msw";
import IntegrationsPage from "./page";
import { renderWithProviders } from "@/test/renderWithProviders";
import { apiUrl, server } from "@/test/server";
import type { ConnectedLeague, PlatformUser } from "@/types/viewModels/integrations";

const gridironGods: ConnectedLeague = {
  id: "db-1",
  leagueId: "sl-1",
  leagueName: "Gridiron Gods",
  seasonYear: 2024,
  type: "redraft",
};

const sleeperLookup: PlatformUser = {
  platformUserId: "u-1",
  platformUserName: "alice_sleeper",
  platformDisplayName: "Alice",
  platform: "Sleeper",
  leagues: [
    { leagueId: "sl-1", leagueName: "Gridiron Gods", seasonYear: 2024, added: true },
    { leagueId: "sl-2", leagueName: "Bench Warmers", seasonYear: 2024 },
  ],
};

interface RecordedRequest {
  route: string;
  body?: any;
  id?: string;
}

interface IntegrationsApiOptions {
  connected?: boolean;
  resyncDelayMs?: number;
  saveError?: string;
}

// Stateful fake of the integrations API: mutations change what later GETs return,
// and every mutation is recorded so tests can assert the exact payloads sent.
function mockIntegrationsApi({
  connected = true,
  resyncDelayMs = 0,
  saveError,
}: IntegrationsApiOptions = {}) {
  const requests: RecordedRequest[] = [];
  const state = {
    account: connected,
    leagues: connected ? [gridironGods] : ([] as ConnectedLeague[]),
  };

  const currentPlatforms = () => ({
    platforms: [
      {
        platform: "Sleeper",
        account: state.account
          ? { fantasyPlatformId: "fp-1", username: "alice_sleeper", leagues: state.leagues }
          : null,
      },
    ],
  });

  server.use(
    http.get(apiUrl("integrations/userPlatforms"), () => HttpResponse.json(currentPlatforms())),
    http.post(apiUrl("integrations/sleeper/fetchAccount"), async ({ request }) => {
      const body = await request.json();
      requests.push({ route: "fetchAccount", body });
      if ((body as { userName: string }).userName === "ghost") {
        return HttpResponse.json({ message: "Sleeper user not found" }, { status: 404 });
      }
      return HttpResponse.json(sleeperLookup);
    }),
    http.post(apiUrl("integrations/addLeagues"), async ({ request }) => {
      const body = (await request.json()) as { platformData: { leagues: { leagueId: string; leagueName: string; seasonYear: number }[] } };
      requests.push({ route: "addLeagues", body });
      if (saveError) {
        return HttpResponse.json({ message: saveError }, { status: 500 });
      }
      state.account = true;
      state.leagues = [
        ...state.leagues,
        ...body.platformData.leagues.map((l) => ({
          id: `db-${l.leagueId}`,
          leagueId: l.leagueId,
          leagueName: l.leagueName,
          seasonYear: l.seasonYear,
          type: "redraft",
        })),
      ];
      return HttpResponse.json({ ok: true });
    }),
    http.delete(apiUrl("integrations/deleteLeague/:id"), ({ params }) => {
      requests.push({ route: "deleteLeague", id: params.id as string });
      state.leagues = state.leagues.filter((l) => l.id !== params.id);
      return HttpResponse.json({ ok: true });
    }),
    http.delete(apiUrl("integrations/deleteFantasyPlatform/:id"), ({ params }) => {
      requests.push({ route: "deleteFantasyPlatform", id: params.id as string });
      state.account = false;
      state.leagues = [];
      return HttpResponse.json({ ok: true });
    }),
    http.post(apiUrl("integrations/resyncPlatform"), async ({ request }) => {
      const body = await request.json();
      requests.push({ route: "resyncPlatform", body });
      if (resyncDelayMs) await delay(resyncDelayMs);
      return HttpResponse.json({ ok: true });
    }),
  );

  return { requests };
}

const modalFor = (heading: string) =>
  screen.getByRole("heading", { name: heading }).closest(".fixed") as HTMLElement;

async function connectSleeperAndOpenPicker(user: ReturnType<typeof userEvent.setup>, username: string) {
  await user.click(await screen.findByRole("button", { name: /Add League|Connect Account/ }));
  await user.type(screen.getByPlaceholderText("Sleeper Username"), username);
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByRole("heading", { name: "Select leagues to add" });
}

describe("Integrations page", () => {
  it("shows the connect prompt and loads no leagues when no account is linked", async () => {
    mockIntegrationsApi({ connected: false });

    renderWithProviders(<IntegrationsPage />);

    expect(await screen.findByText("No account connected yet.")).toBeInTheDocument();
    expect(screen.queryByText(/Gridiron Gods/)).not.toBeInTheDocument();
  });

  it("lists the connected account and its leagues with their season", async () => {
    mockIntegrationsApi();

    renderWithProviders(<IntegrationsPage />);

    expect(await screen.findByText("Gridiron Gods (2024)")).toBeInTheDocument();
    expect(screen.getByText("Account:").parentElement).toHaveTextContent("alice_sleeper (Sleeper)");
  });

  it("looks up a Sleeper account, adds only the selected leagues, and refreshes the list", async () => {
    const { requests } = mockIntegrationsApi({ connected: false });
    const user = userEvent.setup();

    renderWithProviders(<IntegrationsPage />);
    await connectSleeperAndOpenPicker(user, "alice_sleeper");

    expect(requests).toContainEqual({
      route: "fetchAccount",
      body: { userName: "alice_sleeper", year: new Date().getFullYear() },
    });
    expect(screen.getByRole("checkbox", { name: /Gridiron Gods/ })).toBeDisabled();
    expect(screen.getByText(/Gridiron Gods.*\(Already added\)/)).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /Bench Warmers/ }));
    await user.click(screen.getByRole("button", { name: "Add Selected Leagues" }));

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Select leagues to add" })).not.toBeInTheDocument());
    const addRequest = requests.find((r) => r.route === "addLeagues");
    expect(addRequest?.body.platformData.leagues.map((l: { leagueId: string }) => l.leagueId)).toEqual(["sl-2"]);
    expect(await screen.findByText("Bench Warmers (2024)")).toBeInTheDocument();
  });

  it("shows the Sleeper lookup error in the modal and stays on the username step", async () => {
    mockIntegrationsApi({ connected: false });
    const user = userEvent.setup();

    renderWithProviders(<IntegrationsPage />);
    await user.click(await screen.findByRole("button", { name: /Connect Account/ }));
    await user.type(screen.getByPlaceholderText("Sleeper Username"), "ghost");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("Sleeper user not found")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Add Sleeper League" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Select leagues to add" })).not.toBeInTheDocument();
  });

  it("keeps the picker open and shows the message when saving leagues fails", async () => {
    mockIntegrationsApi({ connected: false, saveError: "Could not save leagues" });
    const user = userEvent.setup();

    renderWithProviders(<IntegrationsPage />);
    await connectSleeperAndOpenPicker(user, "alice_sleeper");
    await user.click(screen.getByRole("checkbox", { name: /Bench Warmers/ }));
    await user.click(screen.getByRole("button", { name: "Add Selected Leagues" }));

    expect(await screen.findByText("Could not save leagues")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Select leagues to add" })).toBeInTheDocument();
    expect(screen.queryByText("Bench Warmers (2024)")).not.toBeInTheDocument();
  });

  it("deletes a league only after confirmation and removes it from the list", async () => {
    const { requests } = mockIntegrationsApi();
    const user = userEvent.setup();

    renderWithProviders(<IntegrationsPage />);
    await user.click(await screen.findByRole("button", { name: "Delete" }));

    const modal = modalFor("Delete League");
    expect(requests.some((r) => r.route === "deleteLeague")).toBe(false);

    await user.click(within(modal).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByText("Gridiron Gods (2024)")).not.toBeInTheDocument());
    expect(requests).toContainEqual({ route: "deleteLeague", id: "db-1" });
    expect(screen.queryByRole("heading", { name: "Delete League" })).not.toBeInTheDocument();
  });

  it("deletes the platform account after confirmation and returns the card to the connect state", async () => {
    const { requests } = mockIntegrationsApi();
    const user = userEvent.setup();

    renderWithProviders(<IntegrationsPage />);
    await user.click(await screen.findByRole("button", { name: "Delete account" }));
    await user.click(within(modalFor("Delete Platform Account")).getByRole("button", { name: "Delete Account" }));

    expect(await screen.findByText("No account connected yet.")).toBeInTheDocument();
    expect(requests).toContainEqual({ route: "deleteFantasyPlatform", id: "fp-1" });
  });

  it("resyncs the platform and disables the sync button while the request is in flight", async () => {
    const { requests } = mockIntegrationsApi({ resyncDelayMs: 150 });
    const user = userEvent.setup();

    renderWithProviders(<IntegrationsPage />);
    await user.click(await screen.findByRole("button", { name: "⟳ Sync" }));

    const syncing = await screen.findByRole("button", { name: "⟳ Syncing..." });
    expect(syncing).toBeDisabled();

    expect(await screen.findByRole("button", { name: "⟳ Sync" }, { timeout: 2000 })).toBeEnabled();
    const resync = requests.find((r) => r.route === "resyncPlatform");
    expect(resync?.body.platformData.account.fantasyPlatformId).toBe("fp-1");
  });
});
