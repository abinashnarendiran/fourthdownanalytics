// server/cronjobs/index.js
const { scheduleSyncSleperPlayersStats } = require("./syncPlayerStats");
const { scheduleSyncSleperPlayers } = require("./syncSleeperPlayers");

if (process.env.NODE_ENV === "production") {
  scheduleSyncSleperPlayers(); // schedule the sleeper job
  scheduleSyncSleperPlayersStats();
  // anotherJob(); // schedule others
  console.log("🟢 All cron jobs scheduled (production only)");
} else {
  console.log("⚠️ Development environment: cron jobs disabled");
}
