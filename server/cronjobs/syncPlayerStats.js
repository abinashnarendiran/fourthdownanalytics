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
} = require("../services/sleeperStats");

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
    console.log(
      `🔄 Starting PlayerWeekStats & Projections sync for seasons: ${seasons.join(", ")}`,
    );

    const players = await Players.findAll({
      where: { sleeperPlayerId: { [Op.ne]: null } },
    });

    console.log("players", players.length);

    // Get current NFL state to determine current week
    const nflState = await getNFLState();
    const currentSeason = nflState?.season;
    const currentWeek = nflState?.week;

    await Promise.all(
      seasons.map(async (season) => {
        console.log(`⏳ Syncing season ${season}...`);

        // eslint-disable-next-line no-restricted-syntax
        for (const player of players) {
          try {
            // Determine max week
            const maxWeek =
              season === currentSeason && nflState.season_type === "regular"
                ? currentWeek
                : 17;

            console.log(
              "➡️ Player",
              player.sleeperPlayerId,
              "maxWeek",
              maxWeek,
            );

            /**
             * 1️⃣ Fetch weekly ACTUAL stats
             */
            const weeklyStats = await getSleeperPlayerRegularSeasonStats(
              player.sleeperPlayerId,
              season,
              "week",
            );

            console.log("weeklyStats received for", player.sleeperPlayerId);

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

            console.log("projectedStats received for", player.sleeperPlayerId);

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
              `❌ Failed player ${player.sleeperPlayerId} season ${season}:`,
              err.message,
            );
          }
        }
      }),
    );
    console.log("✅ All seasons sync completed");
  } catch (err) {
    console.error("❌ PlayerWeekStats sync failed:", err);
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
    console.log("✅ Historical backfill already completed. Skipping...");
    return;
  }

  // Run historical backfill
  const nflState = await getNFLState();

  console.log("nflState", nflState);

  // Only include regular seasons
  const seasons = [parseInt(nflState.season, 10)];

  console.log("season", seasons);

  await syncPlayerWeekStats(seasons);

  // Mark as done
  await Jobs.upsert({
    name: jobName,
    done: true,
    completedAt: new Date(),
  });

  console.log("✅ Historical backfill completed and marked as done.");
};

/**
 * Daily cron for syncing only current season
 */
const scheduleSyncSleperPlayersStats = () =>
  cron.schedule("0 6 * * *", async () => {
    // daily at 6:00 UTC
    console.log("⏰ Cron Job: Starting PlayerWeekStats sync...");

    try {
      /**
       * 1️⃣ Run historical backfill ONCE
       * Safe to call every day — Jobs table prevents re-run
       */
      await backfillHistoricalStatsOnce();

      /**
       * 2️⃣ Run daily sync for current season only
       */

      const nflState = await getNFLState();

      if (nflState.season_type !== "regular") {
        await syncPlayerWeekStats([parseInt(nflState.season, 10)]);
      }

      console.log("✅ Cron Job: Completed PlayerWeekStats sync");
    } catch (err) {
      console.error("❌ Cron Job failed:", err.message);
    }
  });

// Export functions
module.exports = {
  scheduleSyncSleperPlayersStats,
};
