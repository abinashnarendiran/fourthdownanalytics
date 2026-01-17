// server/cronjobs/index.js
const { scheduleSyncSleperPlayers } = require("./syncSleeperPlayers");

if (process.env.NODE_ENV === "production") {
  scheduleSyncSleperPlayers(); // schedule the sleeper job
  // anotherJob(); // schedule others
  console.log("🟢 All cron jobs scheduled (production only)");
} else {
  console.log("⚠️ Development environment: cron jobs disabled");
  // scheduleSyncSleperPlayers(); // for testing purposes
}
