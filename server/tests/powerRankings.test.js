import { createRequire } from "node:module";
import { test } from "vitest";

const require = createRequire(import.meta.url);
const assert = require("node:assert/strict");
const { computePowerRankings } = require("../services/analytics/powerRankings");

test("Power Rankings apply the exact points and win weights and rank trends", () => {
  const result = computePowerRankings(
    [
      { rosterId: 1, owner: { display_name: "one" } },
      { rosterId: 2, owner: { display_name: "two" } },
    ],
    [
      { display_name: "one", username: "manager-one" },
      { display_name: "two", username: "manager-two" },
    ],
    {
      1: [
        { rosterId: 1, points: 100, opponent_points: 90 },
        { rosterId: 2, points: 90, opponent_points: 100 },
      ],
    },
    { playoffWeekStart: 2, playoffTeams: 0, playoffRoundType: 0 },
    [],
    [],
    1,
    [
      { rosterId: 1, rank: 2 },
      { rosterId: 2, rank: 1 },
    ],
  );

  assert.equal(result.error, null);
  assert.deepEqual(
    result.data.map(({ rosterId, totalPoints, wins, powerScore, rank }) => ({
      rosterId,
      totalPoints,
      wins,
      powerScore,
      rank,
    })),
    [
      { rosterId: 1, totalPoints: 100, wins: 1, powerScore: 105, rank: 1 },
      { rosterId: 2, totalPoints: 90, wins: 0, powerScore: 90, rank: 2 },
    ],
  );
  assert.deepEqual(
    result.data.map(({ trend, rankChange }) => ({ trend, rankChange })),
    [
      { trend: "▲", rankChange: 1 },
      { trend: "▼", rankChange: -1 },
    ],
  );
});

test("Power Rankings do not award wins for tied scores", () => {
  const result = computePowerRankings(
    [{ rosterId: 1 }, { rosterId: 2 }],
    [],
    {
      1: [
        { rosterId: 1, points: 100, opponent_points: 100 },
        { rosterId: 2, points: 100, opponent_points: 100 },
      ],
    },
    { playoffWeekStart: 2, playoffTeams: 0, playoffRoundType: 0 },
    [],
    [],
    1,
  );

  assert.equal(result.error, null);
  assert.deepEqual(
    result.data.map(({ wins, powerScore }) => ({ wins, powerScore })),
    [
      { wins: 0, powerScore: 100 },
      { wins: 0, powerScore: 100 },
    ],
  );
});

test("Power Rankings return an empty result for an empty league", () => {
  const result = computePowerRankings(
    [],
    [],
    {},
    { playoffWeekStart: 2, playoffTeams: 0, playoffRoundType: 0 },
  );

  assert.equal(result.error, null);
  assert.deepEqual(result.data, []);
});

test("Power Rankings apply championship, runner-up, and last-place modifiers", () => {
  const result = computePowerRankings(
    [{ rosterId: 1 }, { rosterId: 2 }, { rosterId: 3 }, { rosterId: 4 }],
    [],
    {},
    { playoffWeekStart: 2, playoffTeams: 0, playoffRoundType: 0 },
    [
      { r: 1, w: 3, l: 4 },
      { r: 2, w: 1, l: 2 },
    ],
    [
      { r: 1, w: 1, l: 2 },
      { r: 2, w: 3, l: 4 },
    ],
  );

  assert.equal(result.error, null);
  assert.deepEqual(
    result.data.map(
      ({ rosterId, powerScore, championship, runnerUp, lastPlace }) => ({
        rosterId,
        powerScore,
        championship,
        runnerUp,
        lastPlace,
      }),
    ),
    [
      {
        rosterId: 1,
        powerScore: 50,
        championship: true,
        runnerUp: false,
        lastPlace: false,
      },
      {
        rosterId: 2,
        powerScore: 20,
        championship: false,
        runnerUp: true,
        lastPlace: false,
      },
      {
        rosterId: 3,
        powerScore: 0,
        championship: false,
        runnerUp: false,
        lastPlace: false,
      },
      {
        rosterId: 4,
        powerScore: -30,
        championship: false,
        runnerUp: false,
        lastPlace: true,
      },
    ],
  );
});
