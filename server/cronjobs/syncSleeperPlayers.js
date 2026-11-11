const cron = require("node-cron");
const { Players } = require("../models");
const { getSleeperPlayers } = require("../services/sleeper");
const { success, failure } = require("../util/result");

const syncSleeperPlayers = async () => {
  try {
    const sleeperPlayersResult = await getSleeperPlayers();
    if (sleeperPlayersResult.error) return sleeperPlayersResult;
    const sleeperPlayers = sleeperPlayersResult.data;
    if (!sleeperPlayers) {
      return failure(
        "No player data received",
        502,
        "EMPTY_SLEEPER_PLAYERS_RESPONSE",
      );
    }

    const players = Object.entries(sleeperPlayers)
      .filter(([, p]) => p.position)
      .map(([id, p]) => ({
        sleeperPlayerId: id,
        fantasyDataId: p.fantasy_data_id ?? null,
        espnId: p.espn_id ?? null,
        yahooId: p.yahoo_id ?? null,
        rotoworldId: p.rotoworld_id ?? null,
        firstName: p.first_name ?? null,
        lastName: p.last_name ?? null,
        fullName: p.full_name ?? `${p.first_name} ${p.last_name}`,
        position: p.position,
        fantasyPositions: p.fantasy_positions ?? [],
        team: p.team ?? null,
        number: p.number ?? null,
        status: p.status ?? null,
        metadata: {
          college: p.college ?? null,
          height: p.height ?? null,
          weight: p.weight ? parseInt(p.weight, 10) : null,
          age: p.age ?? null,
          birthCountry: p.birth_country ?? null,
          injuryStartDate: p.injury_start_date ?? null,
          injuryStatus: p.injury_status ?? null,
          statsId: p.stats_id ?? null,
          rotowireId: p.rotowire_id ?? null,
          sportradarId: p.sportradar_id ?? null,
        },
      }));

    await Players.bulkCreate(players, {
      updateOnDuplicate: [
        "firstName",
        "lastName",
        "fullName",
        "position",
        "team",
        "number",
        "status",
        "espnId",
        "yahooId",
        "rotoworldId",
        "fantasyPositions",
        "fantasyDataId",
        "metadata",
      ],
    });
    return success({ syncedPlayerCount: players.length });
  } catch (err) {
    console.error("❌ Sleeper sync failed:", err.message);
    return failure(err, 500, "SLEEPER_PLAYER_SYNC_FAILED");
  }
};

// Optional scheduler
function scheduleSyncSleperPlayers() {
  return cron.schedule("0 4 * * *", async () => {
    const result = await syncSleeperPlayers();
    if (result.error) {
      console.error("Sleeper player sync did not complete", result.error);
    }
  });
}

// Export both
module.exports = {
  scheduleSyncSleperPlayers,
};
