import { createRequire } from "node:module";
import { test } from "vitest";

const require = createRequire(import.meta.url);

const assert = require("node:assert/strict");
const axios = require("axios");

const originalCreate = axios.create;
axios.create = () => ({ get: (...args) => axios.get(...args) });

const sleeperService = require("../services/sleeper");

axios.create = originalCreate;
const { getAllMatchups, getSleeperByLeagueId } = sleeperService;
const {
  calculateLineupEfficiency,
} = require("../services/analytics/lineupEfficiency");
const { calculateLuckIndex } = require("../services/analytics/luckIndex");
const { assignRosterSlots } = require("../util/lineupUtils");
const { addSeasonMetrics } = require("../services/seasonDataService");
const { Players } = require("../models");
const { sendResultError } = require("../util/result");

const rosters = ["A", "B", "C", "D"].map((rosterId) => ({ rosterId }));

test("Luck Index accumulates actual and All-Play wins and excludes playoff weeks", () => {
  const matchupsByWeek = {
    1: [
      { rosterId: "A", points: 100, opponent_points: 90 },
      { rosterId: "B", points: 90, opponent_points: 100 },
      { rosterId: "C", points: 80, opponent_points: 70 },
      { rosterId: "D", points: 70, opponent_points: 80 },
    ],
    2: [
      { rosterId: "A", points: 100, opponent_points: 100 },
      { rosterId: "B", points: 100, opponent_points: 100 },
      { rosterId: "C", points: 50, opponent_points: 50 },
      { rosterId: "D", points: 50, opponent_points: 50 },
    ],
    3: [
      { rosterId: "A", points: 1000, opponent_points: 0 },
      { rosterId: "B", points: 0, opponent_points: 1000 },
      { rosterId: "C", points: 0, opponent_points: 0 },
      { rosterId: "D", points: 0, opponent_points: 0 },
    ],
  };

  assert.deepEqual(
    calculateLuckIndex(rosters, matchupsByWeek, 2).data.map(
      ({ actualWins, expectedWins, luckIndex }) => ({
        actualWins,
        expectedWins,
        luckIndex,
      }),
    ),
    [
      { actualWins: 1.5, expectedWins: 1.83, luckIndex: -0.33 },
      { actualWins: 0.5, expectedWins: 1.5, luckIndex: -1 },
      { actualWins: 1.5, expectedWins: 0.5, luckIndex: 1 },
      { actualWins: 0.5, expectedWins: 0.17, luckIndex: 0.33 },
    ],
  );
});

test("Luck Index returns explicit errors for incomplete and invalid data", () => {
  const incompleteResult = calculateLuckIndex(
    [{ rosterId: "A" }, { rosterId: "B" }],
    { 1: [{ rosterId: "A", points: 10, opponent_points: 0 }] },
    1,
  );
  assert.equal(incompleteResult.data, null);
  assert.match(
    incompleteResult.error.message,
    /exactly one matchup score per roster/,
  );

  const invalidResult = calculateLuckIndex(
    [{ rosterId: "A" }],
    { 1: [{ rosterId: "A", points: NaN, opponent_points: 0 }] },
    1,
  );
  assert.equal(invalidResult.data, null);
  assert.match(invalidResult.error.message, /invalid matchup points/);
});

test("Lineup Efficiency uses season point totals and excludes reserve and taxi", () => {
  const playersById = {
    qb: { sleeperPlayerId: "qb", position: "QB" },
    rb: { sleeperPlayerId: "rb", position: "RB" },
    wr: { sleeperPlayerId: "wr", position: "WR" },
    te: { sleeperPlayerId: "te", position: "TE" },
    reserve: { sleeperPlayerId: "reserve", position: "WR" },
    taxi: { sleeperPlayerId: "taxi", position: "TE" },
  };
  const matchupsByWeek = {
    1: [
      {
        rosterId: "A",
        players: ["qb", "rb", "wr", "te", "reserve", "taxi"],
        starters: ["qb", "rb", "te"],
        reserve: ["reserve"],
        taxi: ["taxi"],
        players_points: {
          qb: 10,
          rb: 8,
          wr: 20,
          te: 15,
        },
      },
    ],
    2: [
      {
        rosterId: "A",
        players: ["qb", "rb", "wr", "te", "reserve", "taxi"],
        starters: ["qb", "rb", "te"],
        reserve: ["reserve"],
        taxi: ["taxi"],
        players_points: {
          qb: 20,
          rb: 10,
          wr: 40,
          te: 0,
        },
      },
    ],
    3: [
      {
        rosterId: "A",
        players: ["qb", "rb", "wr", "te"],
        starters: ["qb", "rb", "te"],
        players_points: { qb: 100, rb: 100, wr: 100, te: 100 },
      },
    ],
  };

  assert.deepEqual(
    calculateLineupEfficiency(
      [
        {
          rosterId: "A",
          reserve: [{ sleeperPlayerId: "reserve" }],
          taxi: [{ sleeperPlayerId: "taxi" }],
        },
      ],
      matchupsByWeek,
      ["QB", "RB", "FLEX"],
      playersById,
      2,
    ).data,
    [
      {
        rosterId: "A",
        actualStarterPoints: 63,
        optimalStarterPoints: 108,
        weeksScored: 2,
        weeksUnscored: 0,
        weeksUnavailable: 0,
        metadataWarnings: [],
        lineupEfficiency: 58.33,
      },
    ],
  );
});

test("Lineup Efficiency uses current roster reserve/taxi lists when matchups omit them", () => {
  const playersById = {
    qb: { sleeperPlayerId: "qb", position: "QB" },
    wr: { sleeperPlayerId: "wr", position: "WR" },
    reserve: { sleeperPlayerId: "reserve", position: "WR" },
    taxi: { sleeperPlayerId: "taxi", position: "TE" },
  };
  const [result] = calculateLineupEfficiency(
    [
      {
        rosterId: "A",
        reserve: [{ sleeperPlayerId: "reserve" }],
        taxi: [{ sleeperPlayerId: "taxi" }],
      },
    ],
    {
      1: [
        {
          rosterId: "A",
          players: ["qb", "wr", "reserve", "taxi"],
          starters: ["qb"],
          players_points: { qb: 10, wr: 20, reserve: 1000, taxi: 900 },
        },
      ],
    },
    ["QB", "FLEX"],
    playersById,
    1,
  ).data;

  assert.equal(result.actualStarterPoints, 10);
  assert.equal(result.optimalStarterPoints, 30);
  assert.equal(result.lineupEfficiency, 33.33);
});

test("Lineup Efficiency excludes current starters absent from historical matchups", () => {
  const playersById = {
    "historical-qb": {
      sleeperPlayerId: "historical-qb",
      position: "QB",
    },
    "current-qb": {
      sleeperPlayerId: "current-qb",
      position: "QB",
    },
  };
  const result = calculateLineupEfficiency(
    [
      {
        rosterId: "A",
        starters: [{ sleeperPlayerId: "current-qb" }],
      },
    ],
    {
      1: [
        {
          rosterId: "A",
          players: ["historical-qb"],
          starters: ["historical-qb"],
          players_points: { "historical-qb": 18 },
        },
      ],
    },
    ["QB"],
    playersById,
    1,
  );

  assert.equal(result.error, null);
  assert.equal(result.data[0].actualStarterPoints, 18);
  assert.equal(result.data[0].optimalStarterPoints, 18);
  assert.equal(result.data[0].lineupEfficiency, 100);
});

test("Lineup Efficiency skips zero-optimal weeks and reports them", () => {
  const playersById = {
    qb: { sleeperPlayerId: "qb", position: "QB" },
  };

  assert.deepEqual(
    calculateLineupEfficiency(
      [{ rosterId: "A" }],
      {
        1: [
          {
            rosterId: "A",
            players: ["qb"],
            starters: ["qb"],
            players_points: { qb: 0 },
          },
        ],
      },
      ["QB"],
      playersById,
      1,
    ).data,
    [
      {
        rosterId: "A",
        actualStarterPoints: 0,
        optimalStarterPoints: 0,
        weeksScored: 0,
        weeksUnscored: 1,
        weeksUnavailable: 0,
        metadataWarnings: [],
        lineupEfficiency: null,
      },
    ],
  );
});

test("Lineup Efficiency optimizes SUPER_FLEX assignments", () => {
  const playersById = {
    qb: { sleeperPlayerId: "qb", position: "QB" },
    rb: { sleeperPlayerId: "rb", position: "RB" },
    wr: { sleeperPlayerId: "wr", position: "WR" },
  };

  const [result] = calculateLineupEfficiency(
    [{ rosterId: "A" }],
    {
      1: [
        {
          rosterId: "A",
          players: ["qb", "rb", "wr"],
          starters: ["qb", "rb", "wr"],
          players_points: { qb: 20, rb: 30, wr: 28 },
        },
      ],
    },
    ["QB", "SUPER_FLEX", "FLEX"],
    playersById,
    1,
  ).data;

  assert.equal(result.actualStarterPoints, 78);
  assert.equal(result.optimalStarterPoints, 78);
  assert.equal(result.lineupEfficiency, 100);
});

test("Lineup Efficiency returns errors for missing and invalid player points", () => {
  const playersById = {
    qb: { sleeperPlayerId: "qb", position: "QB" },
  };
  const baseMatchup = {
    rosterId: "A",
    players: ["qb"],
    starters: ["qb"],
  };

  const missingPointsResult = calculateLineupEfficiency(
    [{ rosterId: "A" }],
    { 1: [{ ...baseMatchup, players_points: {} }] },
    ["QB"],
    playersById,
    1,
  );
  assert.equal(missingPointsResult.data, null);
  assert.match(
    missingPointsResult.error.message,
    /missing or invalid week 1 points for player qb/i,
  );

  const invalidPointsResult = calculateLineupEfficiency(
    [{ rosterId: "A" }],
    { 1: [{ ...baseMatchup, players_points: { qb: "not-a-number" } }] },
    ["QB"],
    playersById,
    1,
  );
  assert.equal(invalidPointsResult.data, null);
  assert.match(
    invalidPointsResult.error.message,
    /missing or invalid week 1 points for player qb/i,
  );
});

test("Season metrics ignore missing metadata for an unscored playoff player", async () => {
  const originalFindAll = Players.findAll;
  let lookupOptions;
  Players.findAll = async (options) => {
    lookupOptions = options;
    return [
      {
        sleeperPlayerId: "regular-qb",
        position: "QB",
        fantasyPositions: [],
        fullName: "Regular Season QB",
      },
    ];
  };

  try {
    const result = await addSeasonMetrics({
      rankings: [{ rosterId: 1 }],
      rosters: [{ rosterId: 1 }],
      matchupsByWeek: {
        1: [
          {
            rosterId: 1,
            players: ["regular-qb"],
            starters: ["regular-qb"],
            players_points: { "regular-qb": 10 },
            points: 10,
            opponent_points: 0,
          },
        ],
        2: [
          {
            rosterId: 1,
            players: ["missing-playoff-player"],
            starters: ["missing-playoff-player"],
            players_points: { "missing-playoff-player": 0 },
            points: 0,
            opponent_points: 0,
          },
        ],
      },
      rosterPositions: ["QB"],
      weekSettings: { playoffWeekStart: 2 },
      throughWeek: 2,
    });

    assert.equal(result.error, null);
    assert.deepEqual(lookupOptions.where.sleeperPlayerId, ["regular-qb"]);
    assert.equal(result.data[0].lineupEfficiencyWeeksUnavailable, 0);
    assert.deepEqual(result.data[0].lineupEfficiencyMetadataWarnings, []);
  } finally {
    Players.findAll = originalFindAll;
  }
});

test("Season metrics retain rankings when regular-season player metadata is missing", async () => {
  const originalFindAll = Players.findAll;
  Players.findAll = async () => [];

  try {
    const result = await addSeasonMetrics({
      rankings: [{ rosterId: 1 }],
      rosters: [{ rosterId: 1 }],
      matchupsByWeek: {
        1: [
          {
            rosterId: 1,
            players: ["historical-player"],
            starters: ["historical-player"],
            players_points: { "historical-player": 10 },
            points: 10,
            opponent_points: 0,
          },
        ],
      },
      rosterPositions: ["QB"],
      weekSettings: { playoffWeekStart: 2 },
      throughWeek: 1,
    });

    assert.equal(result.error, null);
    assert.equal(result.data[0].lineupEfficiency, null);
    assert.equal(result.data[0].lineupEfficiencyWeeksUnavailable, 1);
    assert.deepEqual(result.data[0].lineupEfficiencyMetadataWarnings, [
      "Missing player metadata for historical-player",
    ]);
  } finally {
    Players.findAll = originalFindAll;
  }
});

test("optimal slot assignment leaves negative-score slots unfilled", () => {
  const result = assignRosterSlots(
    {
      players: [{ sleeperPlayerId: "qb", position: "QB" }],
      starters: [],
    },
    ["QB"],
    () => -1,
  );

  assert.equal(result.error, null);
  assert.equal(result.data.totalPoints, 0);
  assert.deepEqual(result.data.unfilledSlots, ["QB"]);
});

test("Sleeper matchup fetching preserves per-player points for analytics", async () => {
  const originalGet = axios.get;
  axios.get = async () => ({
    data: [
      {
        matchup_id: 1,
        roster_id: 1,
        points: 20,
        starters: ["qb"],
        players: ["qb", "rb"],
        players_points: { qb: 15, rb: 5 },
      },
      {
        matchup_id: 1,
        roster_id: 2,
        points: 10,
        starters: ["wr"],
        players: ["wr"],
        players_points: { wr: 10 },
      },
    ],
  });

  try {
    const matchupsResult = await getAllMatchups(
      "league",
      {
        playoffWeekStart: 3,
        playoffTeams: 0,
        playoffRoundType: 0,
      },
      1,
    );
    assert.equal(matchupsResult.error, null);
    const matchups = matchupsResult.data;

    assert.deepEqual(matchups["1"][0].players_points, { qb: 15, rb: 5 });
    assert.deepEqual(matchups["1"][0].players, ["qb", "rb"]);
  } finally {
    axios.get = originalGet;
  }
});

test("Sleeper matchup requests reuse the bounded five-minute cache", async () => {
  const originalGet = axios.get;
  let requestCount = 0;
  axios.get = async () => {
    requestCount += 1;
    return {
      data: [
        {
          matchup_id: 1,
          roster_id: 1,
          points: 10,
          starters: [],
          players: [],
          players_points: {},
        },
        {
          matchup_id: 1,
          roster_id: 2,
          points: 8,
          starters: [],
          players: [],
          players_points: {},
        },
      ],
    };
  };

  try {
    const weekSettings = {
      playoffWeekStart: 2,
      playoffTeams: 0,
      playoffRoundType: 0,
    };
    const first = await getAllMatchups("cached-league", weekSettings, 1);
    const second = await getAllMatchups("cached-league", weekSettings, 1);

    assert.equal(first.error, null);
    assert.equal(second.error, null);
    assert.equal(requestCount, 1);
    assert.deepEqual(second.data, first.data);
  } finally {
    axios.get = originalGet;
  }
});

test("Sleeper league lookup preserves 404 and maps upstream failures to 502", async () => {
  const originalGet = axios.get;
  const notFoundError = new Error("Request failed with status code 404");
  notFoundError.response = { status: 404 };
  axios.get = async () => {
    throw notFoundError;
  };

  try {
    const notFoundResult = await getSleeperByLeagueId("missing-league");
    assert.deepEqual(notFoundResult, {
      data: null,
      error: {
        code: "SLEEPER_LEAGUE_NOT_FOUND",
        message: "League not found on Sleeper",
        status: 404,
      },
    });

    const response = {
      status(statusCode) {
        this.statusCode = statusCode;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };
    sendResultError(response, notFoundResult.error);
    assert.equal(response.statusCode, 404);
    assert.deepEqual(response.body, {
      message: "League not found on Sleeper",
      code: "SLEEPER_LEAGUE_NOT_FOUND",
    });

    axios.get = async () => {
      const serverError = new Error("Request failed with status code 503");
      serverError.response = { status: 503 };
      throw serverError;
    };
    const serverFailureResult = await getSleeperByLeagueId("league");
    assert.equal(serverFailureResult.error.status, 502);
    assert.equal(
      serverFailureResult.error.code,
      "SLEEPER_LEAGUE_REQUEST_FAILED",
    );

    axios.get = async () => {
      throw new Error("Network timeout");
    };
    const networkFailureResult = await getSleeperByLeagueId("league");
    assert.equal(networkFailureResult.error.status, 502);
  } finally {
    axios.get = originalGet;
  }
});
