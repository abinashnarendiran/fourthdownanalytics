const { Players } = require("../models"); // Sequelize model

/**
 * Enrich Sleeper rosters with full player info from DB
 * @param {Array} rosters - Array of roster objects from Sleeper
 * @returns {Array} - Enriched rosters with full player objects
 */
const enrichRosters = async (rosters) => {
  if (!rosters || !rosters.length) return [];

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

  if (!allPlayerIds.length) return rosters;

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
        : r.players.map((id) => playerMap[id]).filter(Boolean),
    reserve:
      r.reserve === null
        ? null
        : r.reserve.map((id) => playerMap[id]).filter(Boolean),
    starters:
      r.starters === null
        ? null
        : r.starters.map((id) => playerMap[id]).filter(Boolean),
    taxi:
      r.taxi === null
        ? null
        : r.taxi.map((id) => playerMap[id]).filter(Boolean),
  }));

  return enrichedRosters;
};

const attachUsersToRosters = (rosters, users) => {
  const userMap = {};
  users.forEach((user) => {
    userMap[user.user_id] = user;
  });

  return rosters.map((r) => ({
    ...r,
    rosterId: r.roster_id,
    owner: userMap[r.owner_id] || null,
    co_owners: (r.co_owners || []).map((id) => userMap[id]).filter(Boolean),
  }));
};

const getLineupSlots = (settings = {}) => ({
  QB: Number(settings.slots_qb) || 1,
  RB: Number(settings.slots_rb) || 2,
  WR: Number(settings.slots_wr) || 2,
  TE: Number(settings.slots_te) || 1,
  FLEX: Number(settings.slots_flex) || 0,
  DST: Number(settings.slots_def) || 0,
  K: Number(settings.slots_k) || 0,
});

// Helper to calculate league weeks
const getLeagueWeeks = (settings) => {
  const playoffStart = settings.playoff_week_start || 15;
  const playoffTeams = settings.playoff_teams || 0;

  const regularSeasonWeeks = playoffStart - 1;
  let rounds = 0;
  if (playoffTeams > 0) {
    rounds = Math.ceil(Math.log2(playoffTeams));
  }
  const playoffWeeks = rounds * (settings.playoff_round_type === 1 ? 2 : 1);

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
