import { createRequire } from "node:module";
import { test } from "vitest";

const require = createRequire(import.meta.url);
const assert = require("node:assert/strict");
const { calculateLuckIndex } = require("../services/analytics/luckIndex");
const {
  calculateLineupEfficiency,
} = require("../services/analytics/lineupEfficiency");

test("Luck Index gives tied head-to-head and all-play results half credit", () => {
  const result = calculateLuckIndex(
    [{ rosterId: "A" }, { rosterId: "B" }],
    {
      1: [
        { rosterId: "A", points: 100, opponent_points: 100 },
        { rosterId: "B", points: 100, opponent_points: 100 },
      ],
    },
    1,
  );

  assert.equal(result.error, null);
  assert.deepEqual(
    result.data.map(({ actualWins, expectedWins, luckIndex }) => ({
      actualWins,
      expectedWins,
      luckIndex,
    })),
    [
      { actualWins: 0.5, expectedWins: 0.5, luckIndex: 0 },
      { actualWins: 0.5, expectedWins: 0.5, luckIndex: 0 },
    ],
  );
});

test("Luck Index avoids division by zero in a one-team league", () => {
  const result = calculateLuckIndex(
    [{ rosterId: "solo" }],
    {
      1: [{ rosterId: "solo", points: 12, opponent_points: 12 }],
    },
    1,
  );

  assert.equal(result.error, null);
  assert.deepEqual(result.data, [
    { rosterId: "solo", actualWins: 0.5, expectedWins: 0, luckIndex: 0.5 },
  ]);
});

test("Luck Index and lineup efficiency accept empty leagues", () => {
  const luckResult = calculateLuckIndex([], {}, 0);
  const lineupResult = calculateLineupEfficiency([], {}, ["QB"], {}, 0);

  assert.equal(luckResult.error, null);
  assert.deepEqual(luckResult.data, []);
  assert.equal(lineupResult.error, null);
  assert.deepEqual(lineupResult.data, []);
});

test("Lineup Efficiency treats an empty roster as unscored instead of dividing by zero", () => {
  const result = calculateLineupEfficiency(
    [{ rosterId: 1, players: [], starters: [] }],
    {
      1: [
        {
          rosterId: 1,
          players: [],
          starters: [],
          players_points: {},
        },
      ],
    },
    ["QB"],
    {},
    1,
  );

  assert.equal(result.error, null);
  assert.deepEqual(result.data, [
    {
      rosterId: 1,
      actualStarterPoints: 0,
      optimalStarterPoints: 0,
      weeksScored: 0,
      weeksUnscored: 1,
      weeksUnavailable: 0,
      metadataWarnings: [],
      lineupEfficiency: null,
    },
  ]);
});

test("Lineup Efficiency reports missing required player projections as an error", () => {
  const result = calculateLineupEfficiency(
    [{ rosterId: 1 }],
    {
      1: [
        {
          rosterId: 1,
          players: ["qb"],
          starters: ["qb"],
          players_points: {},
        },
      ],
    },
    ["QB"],
    { qb: { sleeperPlayerId: "qb", position: "QB" } },
    1,
  );

  assert.equal(result.data, null);
  assert.equal(result.error.code, "INVALID_PLAYER_POINTS");
  assert.match(result.error.message, /week 1 points for player qb/i);
});

test("Lineup Efficiency marks positive scores without player metadata unavailable", () => {
  const result = calculateLineupEfficiency(
    [{ rosterId: 1 }],
    {
      1: [
        {
          rosterId: 1,
          players: ["unknown-qb"],
          starters: ["unknown-qb"],
          players_points: { "unknown-qb": 10 },
        },
      ],
    },
    ["QB"],
    {},
    1,
  );

  assert.equal(result.error, null);
  assert.equal(result.data[0].weeksUnavailable, 1);
  assert.equal(result.data[0].lineupEfficiency, null);
  assert.deepEqual(result.data[0].metadataWarnings, [
    "Missing player metadata for unknown-qb",
  ]);
});
