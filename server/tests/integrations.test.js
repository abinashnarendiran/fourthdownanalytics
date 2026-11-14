import { createRequire } from "node:module";
import { test } from "vitest";

const require = createRequire(import.meta.url);

const assert = require("node:assert/strict");
const { ENABLED_PLATFORMS } = require("../constants/platforms");
const { FantasyPlatforms, Leagues } = require("../models");
const sleeperService = require("../services/sleeper");

const originalSleeperMethods = {
  getSleeperUser: sleeperService.getSleeperUser,
  getSleeperLeagues: sleeperService.getSleeperLeagues,
  getSleeperDraftSettings: sleeperService.getSleeperDraftSettings,
  getSleeperByLeagueId: sleeperService.getSleeperByLeagueId,
};
const originalModelMethods = {
  platformFindOne: FantasyPlatforms.findOne,
  leagueFindOne: Leagues.findOne,
  leagueFindAll: Leagues.findAll,
};

sleeperService.getSleeperUser = async () => ({
  data: {
    user_id: "sleeper-user",
    username: "manager",
    display_name: "Manager",
  },
  error: null,
});
sleeperService.getSleeperLeagues = async () => ({
  data: [
    {
      league_id: "league-success",
      name: "Successful Draft Lookup",
      season: "2025",
      total_rosters: 12,
      roster_positions: ["QB"],
      scoring_settings: {},
      settings: {},
    },
    {
      league_id: "league-fallback",
      name: "Failed Draft Lookup",
      season: "2025",
      total_rosters: 12,
      roster_positions: ["QB"],
      scoring_settings: {},
      settings: {},
    },
  ],
  error: null,
});
sleeperService.getSleeperDraftSettings = async (leagueId) =>
  leagueId === "league-success"
    ? {
        data: [
          {
            draft_id: "draft-1",
            type: "snake",
            settings: { rounds: 15 },
            status: "complete",
          },
        ],
        error: null,
      }
    : {
        data: null,
        error: {
          code: "SLEEPER_DRAFT_REQUEST_FAILED",
          message: "Sleeper draft settings unavailable",
          status: 502,
        },
      };
sleeperService.getSleeperByLeagueId = async (leagueId) => ({
  data: {
    league_id: leagueId,
    name: `Updated ${leagueId}`,
    season: "2025",
    total_rosters: 12,
    roster_positions: ["QB"],
    scoring_settings: {},
    settings: {},
  },
  error: null,
});

const {
  fetchSleeperAccount,
  resyncPlatform,
} = require("../controllers/integrations");

const createResponse = () => ({
  statusCode: 200,
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const defaultDraftSettings = {
  draftId: "",
  type: null,
  rounds: null,
  status: null,
  startTime: null,
  draftOrder: {},
};

test("draft lookup failures use mapper defaults for mixed league sync and resync", async () => {
  const warnings = [];
  // Capture the controller's warning so the fallback is observable in tests.
  // eslint-disable-next-line no-console
  const originalWarn = console.warn;
  const syncedLeagues = new Map();
  const platform = {
    fantasyPlatformId: 7,
    save() {
      return Promise.resolve();
    },
  };
  const leagues = ["league-success", "league-fallback"].map((leagueId) => ({
    id: leagueId,
    leagueId,
    fantasyPlatformId: platform.fantasyPlatformId,
    async save() {
      syncedLeagues.set(leagueId, this);
    },
  }));

  FantasyPlatforms.findOne = async () => platform;
  Leagues.findAll = async () => [];
  Leagues.findOne = async ({ where }) =>
    leagues.find((league) => league.leagueId === where.leagueId) || null;
  // eslint-disable-next-line no-console
  console.warn = (...args) => warnings.push(args);

  try {
    const fetchResponse = createResponse();
    await fetchSleeperAccount(
      {
        user: { userId: 5 },
        body: { userName: "manager", year: 2025 },
      },
      fetchResponse,
    );

    assert.equal(fetchResponse.statusCode, 200);
    assert.equal(fetchResponse.body.leagues.length, 2);
    assert.deepEqual(fetchResponse.body.leagues[0].config.draft, {
      ...defaultDraftSettings,
      draftId: "draft-1",
      type: "snake",
      rounds: 15,
      status: "complete",
    });
    assert.deepEqual(
      fetchResponse.body.leagues[1].config.draft,
      defaultDraftSettings,
    );

    const resyncResponse = createResponse();
    await resyncPlatform(
      {
        user: { userId: 5 },
        body: {
          platformData: {
            platform: ENABLED_PLATFORMS.SLEEPER,
            account: {
              fantasyPlatformId: platform.fantasyPlatformId,
              username: "manager",
              leagues: leagues.map(({ id, leagueId }) => ({ id, leagueId })),
            },
          },
        },
      },
      resyncResponse,
    );

    assert.equal(resyncResponse.statusCode, 200);
    assert.equal(syncedLeagues.size, 2);
    assert.deepEqual(
      syncedLeagues.get("league-fallback").config.draft,
      defaultDraftSettings,
    );
    assert.equal(warnings.length, 2);
    assert.deepEqual(
      warnings.map(([message, details]) => [message, details.leagueId]),
      [
        [
          "Sleeper draft settings unavailable; using defaults",
          "league-fallback",
        ],
        [
          "Sleeper draft settings unavailable; using defaults",
          "league-fallback",
        ],
      ],
    );
  } finally {
    // eslint-disable-next-line no-console
    console.warn = originalWarn;
    Object.assign(sleeperService, originalSleeperMethods);
    FantasyPlatforms.findOne = originalModelMethods.platformFindOne;
    Leagues.findOne = originalModelMethods.leagueFindOne;
    Leagues.findAll = originalModelMethods.leagueFindAll;
  }
});
