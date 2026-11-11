const { Players } = require("../models"); // Sequelize model
const { success, failure } = require("./result");

/**
 * Enrich Sleeper rosters with full player info from DB
 * @param {Array} rosters - Array of roster objects from Sleeper
 * @returns {Array} - Enriched rosters with full player objects
 */
const enrichRosters = async (rosters) => {
  if (!Array.isArray(rosters)) {
    return failure("Rosters must be an array", 400, "INVALID_ROSTERS");
  }
  if (!rosters.length) return success([]);

  try {
    // 1. Extract all unique player IDs from all roster sections
    const allPlayerIds = [
      ...new Set(
        rosters.flatMap((r) => [
          ...(r.players || []),
          ...(r.reserve || []),
          ...(r.starters || []),
          ...(r.taxi || []),
        ]),
      ),
    ];

    if (!allPlayerIds.length) return success(rosters);

    // 2. Fetch all matching players from DB
    const dbPlayers = await Players.findAll({
      where: {
        sleeperPlayerId: allPlayerIds,
      },
    });

    // 3. Create map for quick lookup
    const playerMap = {};
    dbPlayers.forEach((player) => {
      playerMap[player.sleeperPlayerId] = player;
    });

    // 4. Replace IDs with full player objects
    const enrichedRosters = rosters.map((r) => ({
      ...r,
      players:
        r.players === null
          ? null
          : (Array.isArray(r.players) ? r.players : [])
              .map((id) => playerMap[id])
              .filter(Boolean),
      reserve:
        r.reserve === null
          ? null
          : (Array.isArray(r.reserve) ? r.reserve : [])
              .map((id) => playerMap[id])
              .filter(Boolean),
      starters:
        r.starters === null
          ? null
          : (Array.isArray(r.starters) ? r.starters : [])
              .map((id) => playerMap[id])
              .filter(Boolean),
      taxi:
        r.taxi === null
          ? null
          : r.taxi.map((id) => playerMap[id]).filter(Boolean),
    }));

    return success(enrichedRosters);
  } catch (error) {
    return failure(error, 500, "ROSTER_ENRICHMENT_FAILED");
  }
};

const attachUsersToRosters = (rosters, users) => {
  if (!Array.isArray(rosters) || !Array.isArray(users)) {
    return failure(
      "Rosters and users must be arrays",
      400,
      "INVALID_ROSTER_USERS",
    );
  }
  try {
    const userMap = {};
    users.forEach((user) => {
      userMap[user.user_id] = user;
    });

    return success(
      rosters.map((r) => ({
        ...r,
        rosterId: r.roster_id,
        owner: userMap[r.owner_id] || null,
        co_owners: (r.co_owners || []).map((id) => userMap[id]).filter(Boolean),
      })),
    );
  } catch (error) {
    return failure(error, 500, "ROSTER_USER_MAPPING_FAILED");
  }
};

const getLineupSlots = (rosterPositions) =>
  rosterPositions.reduce(
    (counts, pos) => ({
      ...counts,
      [pos]: (counts[pos] || 0) + 1,
    }),
    {},
  );
// Helper to calculate league weeks
const getLeagueWeeks = (settings) => {
  const playoffStart = settings.playoffWeekStart || 15;
  const playoffTeams = settings.playoffTeams || 0;

  const regularSeasonWeeks = playoffStart - 1;
  let rounds = 0;
  if (playoffTeams > 0) {
    rounds = Math.ceil(Math.log2(playoffTeams));
  }
  const playoffWeeks = rounds * (settings.playoffRoundType === 1 ? 2 : 1);

  return {
    playoffStart,
    regularSeasonWeeks,
    playoffWeeks,
    totalScoringWeeks: regularSeasonWeeks + playoffWeeks,
  };
};

module.exports = {
  enrichRosters,
  attachUsersToRosters,
  getLineupSlots,
  getLeagueWeeks,
};
