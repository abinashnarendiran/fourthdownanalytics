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
    const nflState = await getNFLState();
    const currentSeason = nflState?.season;
    const currentWeek = nflState?.week;

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
            const weeklyStats = await getSleeperPlayerRegularSeasonStats(
              player.sleeperPlayerId,
              season,
              "week",
            );

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
            const projectedStats =
              await getSleeperPlayerProjectedRegularSeasonStats(
                player.sleeperPlayerId,
                season,
                "week",
              );

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
          }
        }
      }),
    );
  } catch (err) {
    console.error("PlayerWeekStats sync failed:", err);
  }
};

/**
 * Historical backfill (runs only once)
 * @param {number} yearsBack - number of years to backfill
 */
const backfillHistoricalStatsOnce = async () => {
  const jobName = "historicalStatsBackfill";

  // Check if already done
  const job = await Jobs.findOne({ where: { name: jobName } });
  if (job?.done) {
    return;
  }

  // Run historical backfill
  const nflState = await getNFLState();

  // Only include regular seasons
  const seasons = [parseInt(nflState.season, 10)];

  // Call syncPlayerWeekStats
  await syncPlayerWeekStats(seasons);

  // Mark as done
  await Jobs.upsert({
    name: jobName,
    done: true,
    completedAt: new Date(),
  });
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
      await backfillHistoricalStatsOnce();

      /**
       * 2️. Run daily sync for current season only
       */

      const nflState = await getNFLState();

      if (nflState?.season_type === "regular") {
        await syncPlayerWeekStats([parseInt(nflState.season, 10)]);
      }
    } catch (err) {
      console.error("❌ Cron Job failed:", err.message);
    }
  });

// Export functions
module.exports = {
  scheduleSyncSleperPlayersStats,
};
