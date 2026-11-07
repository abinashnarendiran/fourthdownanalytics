// -----------------------------
// 1. Pre-playoff standings → seeds
// -----------------------------
const buildPlayoffSeeds = (preStandings, playoffSize) =>
  preStandings.slice(0, playoffSize).map((t) => ({
    ...t,
    seed: t.rank,
  }));

// -----------------------------
// 2. Winners bracket processing
// -----------------------------
const processWinnersBracket = (winnersBracket) => {
  const results = {};

  winnersBracket.forEach((m) => {
    const { w, l, p } = m;

    if (!p) return;

    // winners bracket is already correct direction
    if (w != null) results[w] = Math.min(results[w] ?? p, p);
    if (l != null) results[l] = Math.min(results[l] ?? p + 1, p + 1);
  });

  return results;
};

// -----------------------------
// 3. Losers bracket processing
// -----------------------------
const processLosersBracket = (losersBracket) => {
  const results = {};

  // find max p (to invert properly)
  const maxP = Math.max(...losersBracket.map((m) => m.p || 0));

  losersBracket.forEach((m) => {
    const { w, l, p } = m;

    if (p == null) return;

    // INVERT p so:
    // p=1 → last place
    // p=max → best loser finish
    const invertedRank = maxP - p + 1;

    const rankA = invertedRank * 2 - 1;
    const rankB = invertedRank * 2;

    if (w != null) results[w] = rankA;
    if (l != null) results[l] = rankB;
  });

  return results;
};

// -----------------------------
// 4. Main function
// -----------------------------
const getFinalPlayoffStandings = (
  preStandings,
  winnersBracket,
  losersBracket,
  rosters,
  users,
  playoffSize = 6,
) => {
  const seeds = buildPlayoffSeeds(preStandings, playoffSize);

  const seedMap = {};
  seeds.forEach((s) => {
    seedMap[s.rosterId] = s;
  });

  const winners = processWinnersBracket(winnersBracket);
  const losers = processLosersBracket(losersBracket);

  // Convert string Object.entries keys to numbers during sorting/mapping
  const winnerOrdered = Object.entries(winners)
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => Number(id));

  const loserOrdered = Object.entries(losers)
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => Number(id));

  const ordered = [...winnerOrdered, ...loserOrdered];

  // Set now safely contains numbers matching r.roster_id
  const used = new Set(ordered);

  const rest = rosters
    .map((r) => r.roster_id)
    .filter((id) => id != null && !used.has(id));

  const finalList = [...ordered, ...rest];

  return finalList.map((rosterId, i) => {
    const r = rosters.find((x) => x.roster_id === rosterId);
    const user = users.find((u) => u.user_id === r?.owner_id);

    return {
      finalRank: i + 1,
      rosterId,
      teamName: user?.metadata?.team_name || user?.display_name,
      owner: user?.display_name,
      seed: seedMap[rosterId]?.seed,
    };
  });
};

const getPrePlayoffStandings = (rosters, users) =>
  rosters
    .map((r) => {
      const user = users.find((u) => u.user_id === r.owner_id);

      return {
        rosterId: r.roster_id,
        teamName: user?.metadata?.team_name || user?.display_name,
        owner: user?.display_name,

        wins: r.settings?.wins || 0,
        losses: r.settings?.losses || 0,

        pointsFor: r.settings?.fpts || 0,
        pointsAgainst: r.settings?.fpts_against || 0,
      };
    })
    .sort((a, b) => {
      // 1. Wins
      if (b.wins !== a.wins) return b.wins - a.wins;

      // 2. Losses (lower is better)
      if (a.losses !== b.losses) return a.losses - b.losses;

      // 3. Points For (main scoring strength)
      if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;

      // 4. Points Against (optional tiebreaker, sometimes used for luck-based leagues)
      if (b.pointsAgainst !== a.pointsAgainst)
        return a.pointsAgainst - b.pointsAgainst;

      // 5. final stable tie-breaker
      return a.rosterId - b.rosterId;
    })
    .map((t, i) => ({
      rank: i + 1,
      ...t,
    }));

module.exports = {
  getFinalPlayoffStandings,
  getPrePlayoffStandings,
  buildPlayoffSeeds,
  processWinnersBracket,
  processLosersBracket,
};
