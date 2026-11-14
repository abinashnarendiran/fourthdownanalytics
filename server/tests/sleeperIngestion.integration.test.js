import { createRequire } from "node:module";
import { test } from "vitest";

const require = createRequire(import.meta.url);
const assert = require("node:assert/strict");
const axios = require("axios");

const originalCreate = axios.create;
axios.create = () => ({ get: (...args) => axios.get(...args) });

const sleeperService = require("../services/sleeper");

const { getSleeperPlayers, getSleeperRosters, getSleeperUsers } =
  sleeperService;
const { Leagues, Players } = require("../models");
const express = require("express");
const routes = require("../routes");
const userFixture = require("./fixtures/sleeper-user.json");
const leaguesFixture = require("./fixtures/sleeper-leagues.json");
const draftsFixture = require("./fixtures/sleeper-drafts.json");
const rostersFixture = require("./fixtures/sleeper-rosters.json");
const usersFixture = require("./fixtures/sleeper-users.json");
const matchupsFixture = require("./fixtures/sleeper-matchups-week-1.json");
const playersFixture = require("./fixtures/sleeper-players.json");

axios.create = originalCreate;

const startTestServer = async () => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = { userId: "integration-test-user" };
    next();
  });
  app.use("/api", routes);

  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address();
  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
  };
};

const closeTestServer = (server) =>
  new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

test("Sleeper account route ingests fixture payloads and maps league/draft data", async () => {
  const originalGet = axios.get;
  const originalFindAll = Leagues.findAll;
  const requestedUrls = [];
  axios.get = async (url) => {
    requestedUrls.push(url);
    if (url.endsWith("/user/manager")) return { data: userFixture };
    if (url.endsWith("/user/sleeper-user-1/leagues/nfl/2025")) {
      return { data: leaguesFixture };
    }
    if (url.endsWith("/league/league-2025/drafts")) {
      return { data: draftsFixture };
    }
    throw new Error(`Unexpected Sleeper request: ${url}`);
  };
  Leagues.findAll = async () => [];

  const { server, url } = await startTestServer();
  try {
    const response = await fetch(
      `${url}/api/integrations/sleeper/fetchAccount`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          connection: "close",
        },
        body: JSON.stringify({ userName: "manager", year: 2025 }),
      },
    );
    const body = await response.json();

    assert.equal(response.status, 200, JSON.stringify(body));
    assert.equal(body.platformUserId, "sleeper-user-1");
    assert.equal(body.platformDisplayName, "Fantasy Manager");
    assert.equal(body.leagues.length, 1);
    assert.equal(body.leagues[0].leagueId, "league-2025");
    assert.equal(body.leagues[0].type, "Dynasty");
    assert.equal(body.leagues[0].config.scoringType, "ppr");
    assert.deepEqual(body.leagues[0].config.draft, {
      draftId: "draft-2025",
      draftOrder: { "sleeper-user-1": 1 },
      type: "snake",
      rounds: 15,
      status: "complete",
      startTime: 1750000000000,
    });
    assert.equal(body.leagues[0].added, false);
    assert.equal(requestedUrls.length, 3);
  } finally {
    axios.get = originalGet;
    Leagues.findAll = originalFindAll;
    await closeTestServer(server);
  }
});

test("Sleeper adapter preserves roster, user, matchup, and player payloads", async () => {
  const originalGet = axios.get;
  axios.get = async (url) => {
    if (url.endsWith("/league/league-2025/rosters")) {
      return { data: rostersFixture };
    }
    if (url.endsWith("/league/league-2025/users")) {
      return { data: usersFixture };
    }
    if (url.endsWith("/league/league-2025/matchups/1")) {
      return { data: matchupsFixture };
    }
    if (url.endsWith("/players/nfl")) {
      return { data: playersFixture };
    }
    throw new Error(`Unexpected Sleeper request: ${url}`);
  };

  try {
    const [rosters, users, matchups, players] = await Promise.all([
      getSleeperRosters("league-2025"),
      getSleeperUsers("league-2025"),
      sleeperService.getSleeperWeeklyMatchups("league-2025", 1),
      getSleeperPlayers(),
    ]);

    assert.equal(rosters.error, null);
    assert.deepEqual(rosters.data, rostersFixture);
    assert.equal(users.error, null);
    assert.deepEqual(users.data, usersFixture);
    assert.equal(matchups.error, null);
    assert.deepEqual(matchups.data, matchupsFixture);
    assert.equal(players.error, null);
    assert.deepEqual(players.data, playersFixture);
  } finally {
    axios.get = originalGet;
  }
});

test("Sleeper account route returns 404 for a missing profile payload", async () => {
  const originalGet = axios.get;
  const originalFindAll = Leagues.findAll;
  axios.get = async () => ({ data: null });
  Leagues.findAll = async () => {
    throw new Error("No database lookup should occur for a missing user");
  };

  const { server, url } = await startTestServer();
  try {
    const response = await fetch(
      `${url}/api/integrations/sleeper/fetchAccount`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          connection: "close",
        },
        body: JSON.stringify({ userName: "missing", year: 2025 }),
      },
    );

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      message: "Sleeper user not found",
    });
  } finally {
    axios.get = originalGet;
    Leagues.findAll = originalFindAll;
    await closeTestServer(server);
  }
});

test("Sleeper account route maps an upstream failure to a gateway error", async () => {
  const originalGet = axios.get;
  const originalFindAll = Leagues.findAll;
  axios.get = async () => {
    const error = new Error("Sleeper service unavailable");
    error.response = { status: 503 };
    throw error;
  };
  Leagues.findAll = async () => {
    throw new Error(
      "No database lookup should occur after an upstream failure",
    );
  };

  const { server, url } = await startTestServer();
  try {
    const response = await fetch(
      `${url}/api/integrations/sleeper/fetchAccount`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          connection: "close",
        },
        body: JSON.stringify({ userName: "manager", year: 2025 }),
      },
    );
    const body = await response.json();

    assert.equal(response.status, 502);
    assert.equal(body.code, "SLEEPER_USER_REQUEST_FAILED");
    assert.equal(body.message, "Sleeper service unavailable");
  } finally {
    axios.get = originalGet;
    Leagues.findAll = originalFindAll;
    await closeTestServer(server);
  }
});

test("in-season analytics route builds rankings and math metrics from Sleeper fixtures", async () => {
  const originalGet = axios.get;
  const originalFindOne = Leagues.findOne;
  const originalFindAll = Players.findAll;
  const playersById = {
    "player-qb": {
      sleeperPlayerId: "player-qb",
      position: "QB",
      fantasyPositions: ["QB"],
      fullName: "Fixture Quarterback",
    },
    "player-rb": {
      sleeperPlayerId: "player-rb",
      position: "RB",
      fantasyPositions: ["RB"],
      fullName: "Fixture Running Back",
    },
  };
  axios.get = async (url) => {
    if (url.endsWith("/league/league-2025")) {
      return { data: leaguesFixture[0] };
    }
    if (url.endsWith("/league/league-2025/rosters")) {
      return { data: rostersFixture };
    }
    if (url.endsWith("/league/league-2025/users")) {
      return { data: usersFixture };
    }
    if (url.endsWith("/league/league-2025/matchups/1")) {
      return { data: matchupsFixture };
    }
    throw new Error(`Unexpected Sleeper request: ${url}`);
  };
  Leagues.findOne = async () => ({
    leagueId: "league-2025",
    seasonYear: 2025,
    type: "Dynasty",
    config: {
      rosterPositions: ["SUPER_FLEX"],
      playoffWeekStart: 2,
      playoffTeams: 0,
      playoffRoundType: 0,
    },
    FantasyPlatform: { displayName: "Fantasy Manager" },
  });
  Players.findAll = async ({ where }) =>
    where.sleeperPlayerId.map((id) => playersById[id]).filter(Boolean);

  const { server, url } = await startTestServer();
  try {
    const response = await fetch(
      `${url}/api/sleeper/getSleeperPowerRankingsSeasonData`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          connection: "close",
        },
        body: JSON.stringify({ id: "league-record-1", week: 1 }),
      },
    );
    const body = await response.json();

    assert.equal(response.status, 200, JSON.stringify(body));
    assert.equal(body.status, "in_season");
    assert.deepEqual(
      body.league.powerRankings.map(
        ({ rosterId, powerScore, actualWins, expectedWins, luckIndex }) => ({
          rosterId,
          powerScore,
          actualWins,
          expectedWins,
          luckIndex,
        }),
      ),
      [
        {
          rosterId: 1,
          powerScore: 105,
          actualWins: 1,
          expectedWins: 1,
          luckIndex: 0,
        },
        {
          rosterId: 2,
          powerScore: 90,
          actualWins: 0,
          expectedWins: 0,
          luckIndex: 0,
        },
      ],
    );
    assert.deepEqual(
      body.league.powerRankings.map(({ lineupEfficiency }) => lineupEfficiency),
      [100, 100],
    );
  } finally {
    axios.get = originalGet;
    Leagues.findOne = originalFindOne;
    Players.findAll = originalFindAll;
    await closeTestServer(server);
  }
});
