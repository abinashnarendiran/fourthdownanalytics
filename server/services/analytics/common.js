const { getLineupSlots } = require("../../util/rosterUtils");
const { sumTop, calculateFantasyPoints } = require("../../util/statsUtils");

// Retained for future use; no current server module calls this function.
const computeTeamProjections = (
  rosters,
  projectedPlayersMap,
  rosterPositions,
) => {
  const slots = getLineupSlots(rosterPositions);

  const rankings = rosters.map((roster) => {
    const players = roster.players || [];
    const projected = players
      .map((p) => projectedPlayersMap[p.player_id || p])
      .filter(Boolean);

    const byPos = projected.reduce(
      (acc, p) => {
        if (acc[p.position]) acc[p.position].push(p);
        return acc;
      },
      { QB: [], RB: [], WR: [], TE: [] },
    );

    Object.keys(byPos).forEach((pos) =>
      byPos[pos].sort((a, b) => b.projectedPoints - a.projectedPoints),
    );

    let total =
      sumTop(byPos.QB, slots.QB) +
      sumTop(byPos.RB, slots.RB) +
      sumTop(byPos.WR, slots.WR) +
      sumTop(byPos.TE, slots.TE);

    const flexPool = [
      ...byPos.RB.slice(slots.RB),
      ...byPos.WR.slice(slots.WR),
      ...byPos.TE.slice(slots.TE),
    ].sort((a, b) => b.projectedPoints - a.projectedPoints);

    total += sumTop(flexPool, slots.FLEX);

    return {
      rosterId: roster.rosterId,
      owner: roster.owner?.display_name || "Unknown",
      projectedPoints: Number(total.toFixed(2)),
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
