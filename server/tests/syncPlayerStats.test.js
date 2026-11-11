const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  Jobs,
  Players,
  PlayerWeekStats,
  PlayerWeekProjections,
} = require("../models");
const sleeperService = require("../services/sleeper");
const { runScheduledPlayerStatsSync } = require("../cronjobs/syncPlayerStats");

test("incomplete historical backfill retries without blocking the daily sync", async () => {
  const originalModelMethods = {
    findPlayers: Players.findAll,
    findJob: Jobs.findOne,
    upsertJob: Jobs.upsert,
    upsertStats: PlayerWeekStats.upsert,
    upsertProjections: PlayerWeekProjections.upsert,
  };
  const originalSleeperMethods = {
    getNFLState: sleeperService.getNFLState,
    getActualStats: sleeperService.getSleeperPlayerRegularSeasonStats,
    getProjectedStats:
      sleeperService.getSleeperPlayerProjectedRegularSeasonStats,
  };
  let actualStatsRequests = 0;
  const jobUpdates = [];
  Players.findAll = async () => [
    { playerId: "player-1", sleeperPlayerId: "sleeper-player-1" },
  ];
  Jobs.findOne = async () => null;
  Jobs.upsert = async (values) => {
    jobUpdates.push(values);
  };
  PlayerWeekStats.upsert = async () => {};
  PlayerWeekProjections.upsert = async () => {};
  sleeperService.getNFLState = async () => ({
    data: { season: "2025", week: 1, season_type: "regular" },
    error: null,
  });
  sleeperService.getSleeperPlayerRegularSeasonStats = async () => {
    actualStatsRequests += 1;
    if (actualStatsRequests === 1) {
      return {
        data: null,
        error: {
          code: "SLEEPER_STATS_REQUEST_FAILED",
          message: "Temporary player stats failure",
          status: 502,
        },
      };
    }

    return {
      data: { 1: { week: 1, stats: { points: 10 } } },
      error: null,
    };
  };
  sleeperService.getSleeperPlayerProjectedRegularSeasonStats = async () => ({
    data: null,
    error: null,
  });
  try {
    await runScheduledPlayerStatsSync();

    assert.equal(actualStatsRequests, 2);
    assert.equal(jobUpdates.length, 1);
    assert.deepEqual(jobUpdates[0], {
      name: "historicalStatsBackfill",
      done: false,
      completedAt: null,
    });
  } finally {
    Players.findAll = originalModelMethods.findPlayers;
    Jobs.findOne = originalModelMethods.findJob;
    Jobs.upsert = originalModelMethods.upsertJob;
    PlayerWeekStats.upsert = originalModelMethods.upsertStats;
    PlayerWeekProjections.upsert = originalModelMethods.upsertProjections;
    Object.assign(sleeperService, {
      getNFLState: originalSleeperMethods.getNFLState,
      getSleeperPlayerRegularSeasonStats: originalSleeperMethods.getActualStats,
      getSleeperPlayerProjectedRegularSeasonStats:
        originalSleeperMethods.getProjectedStats,
    });
  }
});
