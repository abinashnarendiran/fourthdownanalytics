/* eslint-disable no-await-in-loop */
const cron = require("node-cron");
const { Op } = require("sequelize");
const {
  Players,
  PlayerWeekStats,
  PlayerWeekProjections,
  Jobs,
} = require("../models");
const { getNFLState } = require("../services/sleeper");
const {
  getSleeperPlayerRegularSeasonStats,
  getSleeperPlayerProjectedRegularSeasonStats,
} = require("../services/sleeper");
const { regularSeasonWeeks } = require("../constants/nflState");
const { success, failure } = require("../util/result");

/**
 * Determine which seasons to sync (historical + current)
 * @param {number} yearsBack - number of historical seasons
 * @returns array of seasons
 */

/**
 * Core function to sync PlayerWeekStats and PlayerWeekProjections for given seasons
 * @param {number[]} seasons - array of seasons
 */
const syncPlayerWeekStats = async (seasons) => {
  try {
    const players = await Players.findAll({
      where: { sleeperPlayerId: { [Op.ne]: null } },
    });

    // Get current NFL state to determine current week
    const nflStateResult = await getNFLState();
    if (nflStateResult.error) return nflStateResult;
    const nflState = nflStateResult.data;
    const currentSeason = nflState?.season;
    const currentWeek = nflState?.week;
    const syncErrors = [];

    await Promise.all(
      seasons.map(async (season) => {
        // eslint-disable-next-line no-restricted-syntax
        for (const player of players) {
          try {
            // Determine max week
            const maxWeek =
              season === currentSeason && nflState.season_type === "regular"
                ? currentWeek
                : regularSeasonWeeks;

            /**
             * 1️⃣ Fetch weekly ACTUAL stats
             */
            const weeklyStatsResult = await getSleeperPlayerRegularSeasonStats(
              player.sleeperPlayerId,
              season,
              "week",
            );
            if (weeklyStatsResult.error) {
              syncErrors.push(
                `Actual stats for player ${player.sleeperPlayerId}, season ${season}: ${weeklyStatsResult.error.message}`,
              );
            }
            const weeklyStats = weeklyStatsResult.data;

            if (weeklyStats) {
              // eslint-disable-next-line no-restricted-syntax
              for (const weekData of Object.values(weeklyStats)) {
                // eslint-disable-next-line no-continue
                if (!weekData) continue;
                // eslint-disable-next-line no-continue
                if (parseInt(weekData.week, 10) > maxWeek) continue;

                await PlayerWeekStats.upsert({
                  playerId: player.playerId,
                  season,
                  week: weekData.week,
                  stats: weekData.stats,
                  source: "sleeper",
                });
              }
            }

            /**
             * 2️⃣ Fetch weekly PROJECTIONS
             */
            const projectedStatsResult =
              await getSleeperPlayerProjectedRegularSeasonStats(
                player.sleeperPlayerId,
                season,
                "week",
              );
            if (projectedStatsResult.error) {
              syncErrors.push(
                `Projected stats for player ${player.sleeperPlayerId}, season ${season}: ${projectedStatsResult.error.message}`,
              );
            }
            const projectedStats = projectedStatsResult.data;

            if (projectedStats) {
              // eslint-disable-next-line no-restricted-syntax
              for (const weekData of Object.values(projectedStats)) {
                // eslint-disable-next-line no-continue
                if (!weekData) continue;

                await PlayerWeekProjections.upsert({
                  playerId: player.playerId,
                  season,
                  week: weekData.week,
                  projections: weekData.stats,
                  source: "sleeper",
                });
              }
            }

            // 🧠 Optional: be nice to Sleeper API
            // eslint-disable-next-line no-promise-executor-return
            await new Promise((r) => setTimeout(r, 150));
          } catch (err) {
            console.error(
              `Failed player ${player.sleeperPlayerId} season ${season}:`,
              err.message,
            );
            syncErrors.push(
              `Player ${player.sleeperPlayerId}, season ${season}: ${err.message}`,
            );
          }
        }
      }),
    );
    if (syncErrors.length) {
      return failure(
        syncErrors.join("; "),
        502,
        "PLAYER_WEEK_STATS_SYNC_PARTIAL",
      );
    }
    return success({ syncedSeasons: seasons });
  } catch (err) {
    console.error("PlayerWeekStats sync failed:", err);
    return failure(err, 500, "PLAYER_WEEK_STATS_SYNC_FAILED");
  }
};

/**
 * Historical backfill (runs only once)
 * @param {number} yearsBack - number of years to backfill
 */
const backfillHistoricalStatsOnce = async () => {
  try {
    const jobName = "historicalStatsBackfill";

    // Check if already done
    const job = await Jobs.findOne({ where: { name: jobName } });
    if (job?.done) {
      return success({ skipped: true, reason: "already completed" });
    }

    // Run historical backfill
    const nflStateResult = await getNFLState();
    if (nflStateResult.error) return nflStateResult;
    const nflState = nflStateResult.data;

    // Only include regular seasons
    const seasons = [parseInt(nflState.season, 10)];

    // Call syncPlayerWeekStats
    const syncResult = await syncPlayerWeekStats(seasons);
    if (syncResult.error) return syncResult;

    // Mark as done
    await Jobs.upsert({
      name: jobName,
      done: true,
      completedAt: new Date(),
    });
    return success({ backfilledSeasons: seasons });
  } catch (error) {
    return failure(error, 500, "HISTORICAL_STATS_BACKFILL_FAILED");
  }
};

/**
 * Daily cron for syncing only current season
 */
const scheduleSyncSleperPlayersStats = () =>
  cron.schedule("0 6 * * *", async () => {
    // daily at 6:00 UTC

    try {
      /**
       * 1. Run historical backfill ONCE
       * Safe to call every day — Jobs table prevents re-run
       */
      const backfillResult = await backfillHistoricalStatsOnce();
      if (backfillResult.error) {
        console.error(
          "Historical player stats backfill failed",
          backfillResult.error,
        );
        return;
      }

      /**
       * 2️. Run daily sync for current season only
       */

      const nflStateResult = await getNFLState();
      if (nflStateResult.error) {
        console.error(
          "Unable to read NFL state for player sync",
          nflStateResult.error,
        );
        return;
      }
      const nflState = nflStateResult.data;

      if (nflState?.season_type === "regular") {
        const syncResult = await syncPlayerWeekStats([
          parseInt(nflState.season, 10),
        ]);
        if (syncResult.error) {
          console.error("Current player stats sync failed", syncResult.error);
        }
      }
    } catch (err) {
      console.error("❌ Cron Job failed:", err.message);
    }
  });

// Export functions
module.exports = {
  scheduleSyncSleperPlayersStats,
};
