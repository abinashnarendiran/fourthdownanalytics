/**
 * Given a roster's players for a specific week (with their actual points),
 * calculates the highest-scoring valid lineup based on league slot settings.
 *
 * @param {Array} playerScores - Array of { player_id, position, points } for the week
 * @param {Object} rosterPositions - e.g. { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, BN: 6 }
 * @returns {number} The optimal (maximum possible) score
 */
/**
 * Best Ball Logic: Calculates the highest possible score based on roster requirements.
 */
const calculateOptimalScore = (playerScores, rosterPositions) => {
  // 1. Identify requirements (e.g., { QB: 2, RB: 2, WR: 3, TE: 1, FLEX: 2 })
  const requirements = {};
  const startingSlots = rosterPositions.filter((pos) => pos !== "BN");

  startingSlots.forEach((pos) => {
    requirements[pos] = (requirements[pos] || 0) + 1;
  });

  // 2. Sort all players by points descending
  const sortedPlayers = [...playerScores].sort((a, b) => b.points - a.points);
  const usedPlayerIds = new Set();
  let totalOptimal = 0;

  // 3. Fill specific positions first (QB, RB, WR, TE, DEF)
  const positionCategories = Object.keys(requirements).filter(
    (req) => req !== "FLEX",
  );

  positionCategories.forEach((pos) => {
    let slotsToFill = requirements[pos];

    // eslint-disable-next-line no-restricted-syntax
    for (const player of sortedPlayers) {
      if (
        slotsToFill > 0 &&
        player.position === pos &&
        !usedPlayerIds.has(player.player_id)
      ) {
        totalOptimal += player.points;
        usedPlayerIds.add(player.player_id);
        slotsToFill -= 1;
      }
    }
  });

  // 4. Fill FLEX slots with the remaining highest scorers (usually RB/WR/TE)
  if (requirements.FLEX) {
    let flexSlots = requirements.FLEX;
    const flexEligiblePos = ["RB", "WR", "TE"];

    // eslint-disable-next-line no-restricted-syntax
    for (const player of sortedPlayers) {
      if (
        flexSlots > 0 &&
        flexEligiblePos.includes(player.position) &&
        !usedPlayerIds.has(player.player_id)
      ) {
        totalOptimal += player.points;
        usedPlayerIds.add(player.player_id);
        flexSlots -= 1;
      }
    }
  }

  // Round to 2 decimal places to match fantasy scoring
  return Math.round(totalOptimal * 100) / 100;
};

const calculateLuckIndex = (matchupsByWeek, rosterId) => {
  let actualWins = 0;
  let expectedWins = 0;

  Object.entries(matchupsByWeek).forEach(([, weekMatchups]) => {
    const scores = weekMatchups.map((m) => m.points);
    const median = [...scores].sort((a, b) => a - b)[
      Math.floor(scores.length / 2)
    ];

    const team = weekMatchups.find((m) => m.rosterId === rosterId);
    if (!team) return;

    if (team.points >= median) expectedWins += 1;
    if (team.points > team.opponent_points) actualWins += 1;
  });

  return {
    actualWins,
    expectedWins,
    luckIndex: Number((actualWins - expectedWins).toFixed(2)),
  };
};

const calculateLeagueAverages = (matchupsByWeek) => {
  const allScores = [];
  const weeklyPoints = [];

  Object.entries(matchupsByWeek).forEach(([, weekMatchups]) => {
    const weekScores = weekMatchups.map(({ points }) => points);
    const weekMean = weekScores.reduce((a, b) => a + b, 0) / weekScores.length;

    weeklyPoints.push(Number(weekMean.toFixed(2)));
    allScores.push(...weekScores);
  });

  const avgPoints = allScores.reduce((a, b) => a + b, 0) / allScores.length;

  const stdDev = Math.sqrt(
    allScores.reduce((acc, val) => acc + (val - avgPoints) ** 2, 0) /
      allScores.length,
  );

  return {
    weeklyPoints,
    avgPoints: Number(avgPoints.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
  };
};

module.exports = {
  calculateOptimalScore,
  calculateLuckIndex,
  calculateLeagueAverages,
};
