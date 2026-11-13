const { assignRosterSlots } = require("./lineupUtils");

/**
 * Given a roster's players for a specific week (with their actual points),
 * calculates the highest-scoring valid lineup based on league slot settings.
 *
 * @param {Array} playerScores - Array of { player_id, position, points } for the week
 * @param {Array<string>} rosterPositions - e.g. ["QB", "RB", "FLEX", "BN"]
 * @returns {number} The optimal (maximum possible) score
 */
/**
 * Best Ball Logic: Calculates the highest possible score based on roster requirements.
 */
const calculateOptimalScore = (playerScores, rosterPositions) => {
  const result = assignRosterSlots(
    { players: playerScores },
    rosterPositions,
    (player) => player.points,
    true,
  );
  if (result.error) throw new Error(result.error.message);
  if (!result.data.matchingComplete) {
    throw new Error("Unable to calculate optimal score");
  }
  return Math.round(result.data.totalPoints * 100) / 100;
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
