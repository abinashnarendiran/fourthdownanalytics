const { getLeagueWeeks } = require("../../util/rosterUtils");
const { getTeamIdentity } = require("../../util/teamIdentity");

const computePowerRankings = (
  rosters,
  users,
  matchupsByWeek,
  weekSettings,
  winnersBracket = [],
  losersBracket = [],
  currentWeek = null,
  previousWeekRankings = null,
) => {
  const { regularSeasonWeeks } = getLeagueWeeks(weekSettings);
  const isSeasonComplete = currentWeek === null;
  const isInSeason = currentWeek !== null;
  const maxWeek = isInSeason
    ? Math.min(currentWeek, regularSeasonWeeks)
    : regularSeasonWeeks;

  const teams = {};

  rosters.forEach((r) => {
    const user = users.find((u) => u.display_name === r.owner?.display_name);
    const { owner, teamName } = getTeamIdentity(r, user);

    teams[r.rosterId] = {
      rosterId: r.rosterId,
      owner,
      teamName,
      points: 0,
      wins: 0,
      weeklyScores: [],
      championships: 0,
      runnerUps: 0,
      lastPlace: false,
    };
  });

  Object.entries(matchupsByWeek).forEach(([week, matchups]) => {
    const weekNum = Number(week);
    if (weekNum > maxWeek) return;

    matchups.forEach((m) => {
      const team = teams[m.rosterId];
      if (!team) return;

      const points = m.points || 0;
      const oppPoints = m.opponent_points || 0;

      team.points += points;
      team.weeklyScores.push(points);

      if (points > oppPoints) team.wins += 1;
    });
  });

  const processBrackets = isSeasonComplete || currentWeek > regularSeasonWeeks;

  const getBracketFinal = (bracket) => {
    if (!bracket.length) return null;
    const maxRound = Math.max(...bracket.map((m) => m.r));
    return bracket.find((m) => m.r === maxRound);
  };

  if (processBrackets) {
    const winnersFinal = getBracketFinal(winnersBracket);
    if (winnersFinal?.w) teams[winnersFinal.w].championships = 1;
    if (winnersFinal?.l) teams[winnersFinal.l].runnerUps = 1;

    const losersFinal = getBracketFinal(losersBracket);
    if (losersFinal?.l) teams[losersFinal.l].lastPlace = true;
  }

  const rankings = Object.values(teams).map((t) => {
    let powerScore = t.points * 1 + t.wins * 5;

    if (t.championships) powerScore += 50;
    if (t.runnerUps) powerScore += 20;
    if (t.lastPlace) powerScore -= 30;

    return {
      rosterId: t.rosterId,
      owner: t.owner,
      teamName: t.teamName,
      totalPoints: Number(t.points.toFixed(1)),
      wins: t.wins,
      championship: t.championships === 1,
      runnerUp: t.runnerUps === 1,
      lastPlace: t.lastPlace,
      powerScore: Number(powerScore.toFixed(1)),
    };
  });

  rankings.sort((a, b) => b.powerScore - a.powerScore);

  return rankings.map((r, i) => {
    const currentRank = i + 1;
    let trend = "—";
    let rankChange = 0;

    if (isInSeason && previousWeekRankings) {
      const prevRank = previousWeekRankings.find(
        (p) => p.rosterId === r.rosterId,
      )?.rank;

      if (prevRank) {
        rankChange = prevRank - currentRank;
        trend = rankChange > 0 ? "▲" : rankChange < 0 ? "▼" : "—";
      }
    }

    return {
      ...r,
      rank: currentRank,
      trend,
      rankChange,
    };
  });
};

module.exports = { computePowerRankings };
