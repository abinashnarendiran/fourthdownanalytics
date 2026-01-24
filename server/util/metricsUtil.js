const {
  getSleeperPlayerProjectedRegularSeasonStats,
  getSleeperPlayerRegularSeasonStats,
} = require("../services/sleeperStats");
const { getLineupSlots, getLeagueWeeks } = require("./rosterUtils");
const {
  sumTop,
  getStatsForWeek,
  calculateFantasyPoints,
} = require("./statsUtiil");

const computeLeagueAverages = (projectedPlayers) => {
  const totals = {};
  const counts = {};

  projectedPlayers.forEach((p) => {
    const pos = p.position;

    if (!totals[pos]) {
      totals[pos] = 0;
      counts[pos] = 0;
    }

    totals[pos] += p.projectedPoints;
    counts[pos] += 1;
  });

  const averagesByPosition = {};
  Object.keys(totals).forEach((pos) => {
    averagesByPosition[pos] = Number((totals[pos] / counts[pos]).toFixed(2));
  });

  const leagueAveragePlayer = Number(
    (
      projectedPlayers.reduce((sum, p) => sum + p.projectedPoints, 0) /
      projectedPlayers.length
    ).toFixed(2),
  );

  return {
    byPosition: averagesByPosition,
    overall: leagueAveragePlayer,
  };
};

const computeTeamProjections = (
  rosters,
  projectedPlayersMap,
  rosterPositions,
) => {
  const slots = getLineupSlots(rosterPositions);

  const rankings = rosters.map((roster) => {
    const players = roster.players || [];

    // Map players to projected stats
    const projected = players
      .map((p) => projectedPlayersMap[p.player_id || p])
      .filter(Boolean);

    // Group by position
    const byPos = projected.reduce(
      (acc, p) => {
        if (acc[p.position]) acc[p.position].push(p);
        return acc;
      },
      { QB: [], RB: [], WR: [], TE: [] },
    );

    // Sort each position by projected points descending
    Object.keys(byPos).forEach((pos) =>
      byPos[pos].sort((a, b) => b.projectedPoints - a.projectedPoints),
    );

    // Sum top players for core positions
    let total =
      sumTop(byPos.QB, slots.QB) +
      sumTop(byPos.RB, slots.RB) +
      sumTop(byPos.WR, slots.WR) +
      sumTop(byPos.TE, slots.TE);

    // FLEX (best remaining RB/WR/TE)
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

  // Sort best → worst
  rankings.sort((a, b) => b.projectedPoints - a.projectedPoints);

  // Assign rank
  const ranked = rankings.map((r, i) => ({
    ...r,
    rank: i + 1,
  }));

  return ranked;
};

const computeFinalPowerRankings = (
  rosters,
  matchupsByWeek,
  weekSettings,
  winnersBracket = [],
  losersBracket = [],
) => {
  const { regularSeasonWeeks } = getLeagueWeeks(weekSettings);

  const teams = {};
  const leagueScores = [];

  // -----------------------------
  // INIT TEAMS
  // -----------------------------
  rosters.forEach((r) => {
    teams[r.rosterId] = {
      rosterId: r.rosterId,
      owner: r.owner?.display_name || "Unknown",
      points: 0,
      wins: 0,
      expectedWins: 0,
      opponentPoints: [],
      weeklyScores: [],
      playoffPoints: 0,
      championships: 0,
      runnerUps: 0,
      toiletBowlWins: 0,
      lastPlace: false,
    };
  });

  // -----------------------------
  // REGULAR SEASON ONLY
  // -----------------------------
  Object.entries(matchupsByWeek).forEach(([week, matchups]) => {
    // Only process weeks up to regularSeasonWeeks
    if (Number(week) > regularSeasonWeeks) return;
    console.log(week);
    console.log(matchups);

    const scores = matchups.map((m) => m.points);
    if (!scores.length) return;

    const sorted = [...scores].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    matchups.forEach((m) => {
      const team = teams[m.rosterId];
      if (!team) return;

      team.points += m.points;
      team.weeklyScores.push(m.points);
      team.opponentPoints.push(m.opponent_points);
      leagueScores.push(m.points);

      if (m.points > m.opponent_points) team.wins += 1;
      if (m.points >= median) team.expectedWins += 1;
    });
  });

  // -----------------------------
  // PLAYOFF POINTS ONLY
  // -----------------------------
  Object.entries(matchupsByWeek).forEach(([week, matchups]) => {
    if (Number(week) <= regularSeasonWeeks) return;

    matchups.forEach((m) => {
      if (teams[m.rosterId]) {
        teams[m.rosterId].playoffPoints += m.points || 0;
      }
    });
  });

  // -----------------------------
  // BRACKET HELPERS
  // -----------------------------
  const getBracketFinal = (bracket) => {
    if (!bracket.length) return null;
    const maxRound = Math.max(...bracket.map((m) => m.r));
    return bracket.find((m) => m.r === maxRound);
  };

  // -----------------------------
  // WINNERS BRACKET
  // -----------------------------
  const winnersFinal = getBracketFinal(winnersBracket);
  if (winnersFinal?.w) teams[winnersFinal.w].championships += 1;
  if (winnersFinal?.l) teams[winnersFinal.l].runnerUps += 1;

  // -----------------------------
  // LOSERS BRACKET
  // -----------------------------
  const losersFinal = getBracketFinal(losersBracket);
  if (losersFinal?.w) teams[losersFinal.l].toiletBowlWins += 1;
  if (losersFinal?.l) teams[losersFinal.w].lastPlace = true;

  // -----------------------------
  // LEAGUE AVERAGES
  // -----------------------------
  const leagueAvg =
    leagueScores.reduce((a, b) => a + b, 0) / (leagueScores.length || 1);

  // -----------------------------
  // BUILD FINAL RANKINGS
  // -----------------------------
  const rankings = Object.values(teams).map((t) => {
    const gamesPlayed = t.weeklyScores.length || 1;

    const avgOpp =
      t.opponentPoints.reduce((a, b) => a + b, 0) /
      (t.opponentPoints.length || 1);

    const mean = t.points / gamesPlayed;

    const variance =
      t.weeklyScores.reduce((s, p) => s + (p - mean) ** 2, 0) / gamesPlayed;

    const consistency = (1 / (Math.sqrt(variance) + 1)) * 10; // smoother
    const luck = t.wins - t.expectedWins;
    const sos = avgOpp / leagueAvg;

    let powerScore =
      t.points * 0.45 +
      t.playoffPoints * 0.25 +
      t.wins * 4 +
      luck * 2 +
      consistency * 3 +
      sos * 5;

    if (t.championships) powerScore += 40;
    if (t.runnerUps) powerScore += 15;
    if (t.toiletBowlWins) powerScore += 3;
    if (t.lastPlace) powerScore -= 25;

    return {
      rosterId: t.rosterId,
      owner: t.owner,
      totalPoints: Number(t.points.toFixed(2)),
      playoffPoints: Number(t.playoffPoints.toFixed(2)),
      wins: t.wins,
      expectedWins: t.expectedWins,
      luck: Number(luck.toFixed(2)),
      consistency: Number(consistency.toFixed(3)),
      strengthOfSchedule: Number(sos.toFixed(3)),
      championship: t.championships === 1,
      runnerUp: t.runnerUps === 1,
      lastPlace: t.lastPlace === 1,
      powerScore: Number(powerScore.toFixed(2)),
    };
  });

  rankings.sort((a, b) => b.powerScore - a.powerScore);
  const ranked = rankings.map((r, i) => ({
    ...r,
    rank: i + 1,
  }));

  return ranked;
};

const computeLuckIndex = (rosters, matchupsByWeek) => {
  const teamStats = {};

  Object.entries(matchupsByWeek).forEach(([, weekMatchups]) => {
    const scores = weekMatchups.map((m) => m.points);
    const median = scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)];

    weekMatchups.forEach((m) => {
      if (!teamStats[m.rosterId]) {
        teamStats[m.rosterId] = { actualWins: 0, expectedWins: 0 };
      }

      if (m.points >= median) teamStats[m.rosterId].expectedWins += 1;
      if (m.points > m.opponent_points) teamStats[m.rosterId].actualWins += 1;
    });
  });

  return Object.entries(teamStats).map(([rosterId, stats]) => {
    const ownerObj = rosters.find((r) => r.rosterId.toString() === rosterId);
    return {
      rosterId,
      owner: ownerObj?.owner?.display_name
        ? ownerObj?.owner?.display_name
        : "Unknown",
      actualWins: stats.actualWins,
      expectedWins: stats.expectedWins,
      luck: Number((stats.actualWins - stats.expectedWins).toFixed(2)),
    };
  });
};

const computeLineupEfficiency = async (
  matchupsByWeek,
  rosters,
  scoringSettings,
  rosterPositions,
  seasonYear,
  dashboard,
) => {
  const efficiencyMap = {}; // total per roster
  const weeklyEfficiencyMap = {}; // per roster, per week

  // Slots from draftSettings
  const slots = getLineupSlots(rosterPositions);

  // Caches
  const statsCache = {};
  const projectionCache = {};

  const getActualPoints = async (playerId, week) => {
    if (!playerId) return 0;
    if (!statsCache[playerId]) {
      statsCache[playerId] = await getSleeperPlayerRegularSeasonStats(
        playerId,
        seasonYear,
        "week",
      );
    }
    const stats = await statsCache[playerId];
    const weekStats = getStatsForWeek(stats, week);
    return weekStats ? calculateFantasyPoints(weekStats, scoringSettings) : 0;
  };

  const getProjectedPoints = async (playerId, week) => {
    if (!playerId) return 0;
    if (!projectionCache[playerId]) {
      projectionCache[playerId] =
        await getSleeperPlayerProjectedRegularSeasonStats(
          playerId,
          seasonYear,
          "week",
        );
    }
    const stats = await projectionCache[playerId];
    const weekStats = getStatsForWeek(stats, week);
    return weekStats ? calculateFantasyPoints(weekStats, scoringSettings) : 0;
  };

  await Promise.all(
    Object.entries(matchupsByWeek).map(async ([weekStr, matchups]) => {
      const week = Number(weekStr);

      await Promise.all(
        matchups.map(async (team) => {
          const { rosterId } = team;

          // Init total maps
          if (efficiencyMap[rosterId] == null) {
            efficiencyMap[rosterId] = { actual: 0, optimal: 0 };
          }

          if (weeklyEfficiencyMap[rosterId] == null) {
            weeklyEfficiencyMap[rosterId] = {};
          }

          if (weeklyEfficiencyMap[rosterId][week] == null) {
            weeklyEfficiencyMap[rosterId][week] = { actual: 0, optimal: 0 };
          }

          const slotsFilled = { ...slots };

          // ---------- ACTUAL ----------
          await Promise.all(
            (team.starters || []).map(async (starter) => {
              let playerId;

              if (typeof starter === "string") playerId = starter;
              else if (starter?.pid) playerId = starter.pid;
              else {
                const key = Object.keys(starter || {}).find((k) =>
                  k.startsWith("TEAM_"),
                );
                playerId = key ? starter[key] : null;
              }

              if (!playerId) return;

              const actualPoints = await getActualPoints(playerId, week);
              const points = Number(actualPoints.toFixed(2));

              efficiencyMap[rosterId].actual += points;
              weeklyEfficiencyMap[rosterId][week].actual += points;
            }),
          );

          // ---------- OPTIMAL ----------
          await Promise.all(
            (team.starters || []).map(async (starter) => {
              let playerId;

              if (typeof starter === "string") playerId = starter;
              else if (starter?.pid) playerId = starter.pid;
              else {
                const key = Object.keys(starter || {}).find((k) =>
                  k.startsWith("TEAM_"),
                );
                playerId = key ? starter[key] : null;
              }

              if (!playerId) return;

              const slotOrder = ["QB", "RB", "WR", "TE", "FLEX", "DST", "K"];
              const slot = slotOrder.find((s) => slotsFilled[s] > 0);

              if (!slot) return;
              slotsFilled[slot] -= 1;

              const projectedPoints = await getProjectedPoints(playerId, week);
              const points = Number(projectedPoints.toFixed(2));

              efficiencyMap[rosterId].optimal += points;
              weeklyEfficiencyMap[rosterId][week].optimal += points;
            }),
          );
        }),
      );
    }),
  );

  console.log("efficiencyMap", efficiencyMap);

  // -------- FINAL OUTPUT --------
  const totalEfficiency = Object.entries(efficiencyMap)
    .map(([rosterId, v]) => {
      const actual = v.actual.toFixed(2);
      const optimal = v.optimal.toFixed(2);
      const missedPoints = (optimal - actual).toFixed(2);
      const efficiency =
        optimal > 0 ? ((actual / optimal) * 100).toFixed(2) : 0;

      const ownerObj = rosters.find((r) => r.rosterId.toString() === rosterId);

      return {
        rosterId,
        owner: ownerObj?.owner?.display_name
          ? ownerObj?.owner?.display_name
          : "Unknown",
        actual,
        optimal,
        missedPoints,
        efficiency, // in %
      };
    })
    .sort((a, b) => b.efficiency - a.efficiency); // sort descending by efficiency

  let weeklyEfficiency;

  if (!dashboard) {
    weeklyEfficiency = Object.entries(weeklyEfficiencyMap).map(
      ([rosterId, weeks]) => {
        const ownerObj = rosters.find(
          (r) => r.rosterId.toString() === rosterId,
        );

        return {
          rosterId,
          owner: ownerObj?.owner?.display_name ?? "Unknown",
          weeks: Object.entries(weeks).map(([week, v]) => {
            const actual = Number(v.actual.toFixed(2));
            const optimal = Number(v.optimal.toFixed(2));
            const missedPoints = Number((optimal - actual).toFixed(2));
            const efficiency =
              optimal > 0 ? Number(((actual / optimal) * 100).toFixed(2)) : 0;

            return {
              week: Number(week),
              actual,
              optimal,
              missedPoints: missedPoints > 0 ? missedPoints : 0,
              efficiency, // percentage
            };
          }),
        };
      },
    );
  }

  return dashboard ? totalEfficiency : { totalEfficiency, weeklyEfficiency };
};

module.exports = {
  computeLeagueAverages,
  computeTeamProjections,
  computeFinalPowerRankings,
  computeLuckIndex,
  computeLineupEfficiency,
  calculateFantasyPoints,
};
