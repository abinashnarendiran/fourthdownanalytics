const { assignRosterSlots } = require("../../util/lineupUtils");
const { sumTop, calculateFantasyPoints } = require("../../util/statsUtil");

// Retained for future use; no current server module calls this function.
const computeTeamProjections = (
  rosters,
  projectedPlayersMap,
  rosterPositions,
) => {
  const rankings = rosters.map((roster) => {
    const players = roster.players || [];
    const projected = players
      .map((player) => {
        const playerId = player.player_id || player;
        const projection = projectedPlayersMap[playerId];
        return projection ? { ...projection, player_id: playerId } : null;
      })
      .filter(Boolean);
    const result = assignRosterSlots(
      { players: projected },
      rosterPositions,
      (player) => player.projectedPoints,
      true,
    );
    if (result.error) throw new Error(result.error.message);
    if (!result.data.matchingComplete) {
      throw new Error("Unable to calculate team projections");
    }

    return {
      rosterId: roster.rosterId,
      owner: roster.owner?.display_name || "Unknown",
      projectedPoints: Number(result.data.totalPoints.toFixed(2)),
    };
  });

  rankings.sort((a, b) => b.projectedPoints - a.projectedPoints);

  return rankings.map((r, i) => ({
    ...r,
    rank: i + 1,
  }));
};

module.exports = {
  calculateFantasyPoints,
  computeTeamProjections,
  sumTop,
};
