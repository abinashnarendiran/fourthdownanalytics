/* const {
  PlayerWeekProjections,
  PlayerWeekStats,
  Players,
} = require("../models"); */
const {
  PlayerWeekStats,
  PlayerWeekProjections,
  Players,
} = require("../models");
const { getLineupSlots, getLeagueWeeks } = require("./rosterUtils");
const {
  getPrePlayoffStandings,
  getFinalPlayoffStandings,
} = require("./standingsUtils");
const { sumTop, getPlayerPoints } = require("./statsUtil");
const { calculateOptimalScore } = require("./teamAnaylsisHelpersUtil");

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

const computePowerRankings = (
  rosters,
  users,
  matchupsByWeek,
  weekSettings,
  winnersBracket = [],
  losersBracket = [],
  currentWeek = null, // null = season complete, number = in-season
  previousWeekRankings = null, // only used when currentWeek is provided
) => {
  const { regularSeasonWeeks } = getLeagueWeeks(weekSettings);

  // Determine if season is complete or in-progress
  const isSeasonComplete = currentWeek === null;
  const isInSeason = currentWeek !== null;

  // Limit aggregation to currentWeek if in-season, otherwise full regular season
  const maxWeek = isInSeason
    ? Math.min(currentWeek, regularSeasonWeeks)
    : regularSeasonWeeks;

  const teams = {};

  // -----------------------------
  // INIT TEAMS
  // -----------------------------
  rosters.forEach((r) => {
    teams[r.rosterId] = {
      rosterId: r.rosterId,
      owner: r.owner?.display_name || "Unknown",
      teamName: r.teamName,
      points: 0,
      wins: 0,
      weeklyScores: [],
      championships: 0,
      runnerUps: 0,
      lastPlace: false,
    };
  });

  // -----------------------------
  // REGULAR SEASON AGGREGATION UP TO maxWeek
  // -----------------------------
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

  // -----------------------------
  // PLAYOFF / BRACKET RESULTS
  // Only process brackets if season is complete OR currentWeek is past regular season
  // -----------------------------
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

  // -----------------------------
  // POWER SCORE
  // -----------------------------
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

  // -----------------------------
  // SORT & ASSIGN RANKS
  // -----------------------------
  rankings.sort((a, b) => b.powerScore - a.powerScore);

  // -----------------------------
  // ADD TREND INDICATORS (IN-SEASON ONLY)
  // -----------------------------
  return rankings.map((r, i) => {
    const currentRank = i + 1;

    // Only calculate trend if in-season AND previous rankings provided
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

/**
 * THE OMNI-ANALYSIS ENGINE
 * Consolidates Luck, Efficiency, Key Players, and Optimal scoring into one async workflow.
 */
const computeTeamAnalysis = async ({
  rosters,
  users,
  matchupsByWeek,
  weekSettings,
  winnersBracket,
  losersBracket,
  rosterId,
  week = null, // null = full season
  compareTeamId = null,
  seasonYear,
  scoringSettings,
  playoffTeams,
}) => {
  const { regularSeasonWeeks, rosterPositions } = weekSettings;
  const maxWeek = week !== null ? week : regularSeasonWeeks;
  const state = week === null ? "complete" : "in_season";

  // Data Maps
  const playerStatsMap = {}; // { rosterId: { playerId: { points, name, pos } } }
  const luckMap = {}; // { rosterId: { actualWins, expectedWins, weeklyLuck: [] } }
  const efficiencyMap = {}; // { rosterId: { actualStarters, projectedStarters, totalTeam } }
  const optimalMap = {}; // { rosterId: [ { week, score } ] }
  const weeklyPointsMap = {}; // { rosterId: [ { week, points } ] }
  const leagueWeeklyAverages = {}; // { week: averagePoints }

  // Collect all unique player IDs used in the entire league
  const allPids = new Set();
  Object.values(matchupsByWeek).forEach((wkMatchups) =>
    wkMatchups.forEach((m) => m.players?.forEach((id) => allPids.add(id))),
  );

  const [actualRows, projRows] = await Promise.all([
    PlayerWeekStats.findAll({
      where: { season: seasonYear, source: "sleeper" },
      include: [
        { model: Players, where: { sleeperPlayerId: Array.from(allPids) } },
      ],
      nest: true,
    }),
    PlayerWeekProjections.findAll({
      where: { season: seasonYear, source: "sleeper" },
      include: [
        { model: Players, where: { sleeperPlayerId: Array.from(allPids) } },
      ],
      nest: true,
    }),
  ]);

  // Build the cache maps
  const actualCache = {};
  const projCache = {};
  actualRows.forEach((row) => {
    const key = `${row.Player.sleeperPlayerId}-${row.week}`;
    actualCache[key] = row;
  });

  projRows.forEach((row) => {
    const key = `${row.Player.sleeperPlayerId}-${row.week}`;
    projCache[key] = row;
  });

  // Process Loop
  const validWeeks = Object.entries(matchupsByWeek).filter(
    ([w]) => Number(w) <= maxWeek,
  );

  // eslint-disable-next-line no-restricted-syntax
  for (const [weekNumStr, weekMatchups] of validWeeks) {
    const wkNum = Number(weekNumStr);

    // Calculate Weekly Median & Average
    const weekScores = weekMatchups.map((m) => m.points);
    const median = [...weekScores].sort((a, b) => a - b)[
      Math.floor(weekScores.length / 2)
    ];
    leagueWeeklyAverages[wkNum] =
      weekScores.reduce((a, b) => a + b, 0) / weekScores.length;

    // eslint-disable-next-line no-restricted-syntax
    for (const teamMatchup of weekMatchups) {
      const {
        rosterId: tId,
        points: actualTeamPoints,
        opponent_points: oppPoints,
        starters = [],
        players = [],
      } = teamMatchup;

      // Initialize maps for this roster
      if (!playerStatsMap[tId]) playerStatsMap[tId] = {};
      if (!luckMap[tId])
        luckMap[tId] = { actualWins: 0, expectedWins: 0, weeklyLuck: [] };
      if (!efficiencyMap[tId])
        efficiencyMap[tId] = { actual: 0, projectedStarters: 0, totalTeam: 0 };
      if (!optimalMap[tId]) optimalMap[tId] = [];
      if (!weeklyPointsMap[tId]) weeklyPointsMap[tId] = [];

      // A. Points Tracking (Line Chart Data)
      weeklyPointsMap[tId].push({ week: wkNum, points: actualTeamPoints });

      // B. Luck Tracking (Actual vs Expected based on Median)
      const expectedWin = actualTeamPoints >= median ? 1 : 0;
      const actualWin = actualTeamPoints > oppPoints ? 1 : 0;
      luckMap[tId].actualWins += actualWin;
      luckMap[tId].expectedWins += expectedWin;
      luckMap[tId].weeklyLuck.push({
        week: wkNum,
        luck: actualWin - expectedWin,
      });

      // C. Player Stats & Efficiency Tracking (Parallelized Lookups)
      // eslint-disable-next-line no-await-in-loop
      const playerResults = await Promise.all(
        players.map(async (pId) => {
          const [actualData, projData] = await Promise.all([
            getPlayerPoints(
              pId,
              wkNum,
              seasonYear,
              scoringSettings,
              "actual",
              actualCache,
            ),
            getPlayerPoints(
              pId,
              wkNum,
              seasonYear,
              scoringSettings,
              "projected",
              projCache,
            ),
          ]);
          return {
            pId,
            actualData,
            projData,
            isStarter: starters.includes(pId),
          };
        }),
      );

      const currentWeekPlayerScores = [];

      // Process aggregated values after resolution
      playerResults.forEach(({ pId, actualData, projData, isStarter }) => {
        if (!playerStatsMap[tId][pId]) {
          playerStatsMap[tId][pId] = {
            totalPoints: 0,
            name: actualData.name,
            pos: actualData.pos,
          };
        }

        playerStatsMap[tId][pId].totalPoints += actualData.points;
        efficiencyMap[tId].totalTeam += actualData.points;

        if (isStarter) {
          efficiencyMap[tId].actual += actualData.points;
          efficiencyMap[tId].projectedStarters += projData.points;
        }

        currentWeekPlayerScores.push({
          player_id: pId,
          position: actualData.pos,
          points: actualData.points,
        });
      });

      // D. Optimal (Best Ball) Calculation
      const optimalScore = calculateOptimalScore(
        currentWeekPlayerScores,
        rosterPositions,
      );
      optimalMap[tId].push({ week: wkNum, score: optimalScore });
    }
  }

  // --- 4. TEAM DATA BUILDER ---
  const buildTeamData = (id) => {
    const roster = rosters.find((r) => r.rosterId === id);
    const user = users.find(
      (u) => u.display_name === roster?.owner?.display_name,
    );

    const weeklyPoints = weeklyPointsMap[id] || [];
    const totalActualPoints = weeklyPoints.reduce(
      (sum, p) => sum + p.points,
      0,
    );
    const avgPoints = weeklyPoints.length
      ? totalActualPoints / weeklyPoints.length
      : 0;

    const consistency =
      weeklyPoints.length > 1
        ? Math.sqrt(
            weeklyPoints.reduce(
              (acc, p) => acc + (p.points - avgPoints) ** 2,
              0,
            ) / weeklyPoints.length,
          )
        : 0;

    const lData = luckMap[id];
    const totalGames = weeklyPoints.length;
    const actualLosses = totalGames - lData.actualWins;
    const expectedLosses = totalGames - lData.expectedWins;
    const luckSum = lData.actualWins - lData.expectedWins;
    const luckAvg = weeklyPoints.length ? luckSum / weeklyPoints.length : 0;
    const luckVariance = weeklyPoints.length
      ? lData.weeklyLuck.reduce(
          (acc, val) => acc + (val.luck - luckAvg) ** 2,
          0,
        ) / weeklyPoints.length
      : 0;

    const eData = efficiencyMap[id];
    const totalOptimal = optimalMap[id].reduce((acc, w) => acc + w.score, 0);

    const actualEff =
      eData.totalTeam > 0 ? (eData.actual / eData.totalTeam) * 100 : 0;
    const projEff =
      eData.totalTeam > 0
        ? (eData.projectedStarters / eData.totalTeam) * 100
        : 0;
    const optimalEff =
      eData.totalTeam > 0 ? (totalOptimal / eData.totalTeam) * 100 : 0;

    const keyPlayers = Object.values(playerStatsMap[id])
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 5)
      .map((p) => ({
        name: p.name,
        pos: p.pos,
        total: Number(p.totalPoints.toFixed(2)),
        contribution: Number(
          ((p.totalPoints / (eData.totalTeam || 1)) * 100).toFixed(2),
        ),
      }));

    const allLeagueScores = Object.values(weeklyPointsMap).flatMap(
      (teamWeeks) => teamWeeks.map((pw) => pw.points),
    );

    const leagueAvgPoints = allLeagueScores.length
      ? allLeagueScores.reduce((a, b) => a + b, 0) / allLeagueScores.length
      : 0;

    const leagueStdDev =
      allLeagueScores.length > 1
        ? Math.sqrt(
            allLeagueScores.reduce(
              (acc, pts) => acc + (pts - leagueAvgPoints) ** 2,
              0,
            ) / allLeagueScores.length,
          )
        : 0;

    return {
      rosterId: id,
      teamName:
        user?.metadata?.team_name || `Team ${roster?.owner?.display_name}`,
      owner: roster?.owner?.display_name,
      pointsTrend: weeklyPoints,
      winAnalysis: {
        actualWins: lData.actualWins,
        actualLosses,
        expectedWins: lData.expectedWins,
        expectedLosses,
        winDiff: Number(luckSum.toFixed(2)),
        record: `${lData.actualWins}-${actualLosses}`,
      },
      luck: {
        luckIndex: Number(luckSum.toFixed(2)),
        luckVariance: Number(luckVariance.toFixed(2)),
        weeklyLuckHistory: lData.weeklyLuck,
      },
      averages: {
        teamAvg: Number(avgPoints.toFixed(2)),
        stdDev: Number(leagueStdDev.toFixed(2)),
        leagueAvg: Number(
          (
            Object.values(leagueWeeklyAverages).reduce((a, b) => a + b, 0) /
            (Object.keys(leagueWeeklyAverages).length || 1)
          ).toFixed(2),
        ),
        weeklyVsLeague: weeklyPoints.map((p) => ({
          week: p.week,
          teamPoints: p.points,
          leagueAvg: Number(leagueWeeklyAverages[p.week].toFixed(2)),
        })),
      },
      consistency: Number(consistency.toFixed(2)),
      efficiency: {
        actual: Number(actualEff.toFixed(1)),
        projected: Number(projEff.toFixed(1)),
        optimal: Number(optimalEff.toFixed(1)),
      },
      optimal: {
        totalBestBall: Number(totalOptimal.toFixed(2)),
        weeks: optimalMap[id],
      },
      keyPlayers: {
        top5: keyPlayers,
        top5CombinedContribution: Number(
          keyPlayers.reduce((s, p) => s + p.contribution, 0).toFixed(2),
        ),
      },
    };
  };

  let preStandings = null;
  let finalStandings = null;

  if (week === null) {
    preStandings = getPrePlayoffStandings(rosters, users);

    finalStandings = getFinalPlayoffStandings(
      preStandings,
      winnersBracket,
      losersBracket,
      rosters,
      users,
      playoffTeams,
    );
  }

  return {
    state,
    week: maxWeek,
    team: buildTeamData(rosterId),
    compareTeam: compareTeamId ? buildTeamData(compareTeamId) : null,
    userPlacement:
      week !== null
        ? null
        : finalStandings.find((s) => s.rosterId === rosterId)?.rank,
  };
};

module.exports = {
  computeTeamProjections,
  computePowerRankings,
  /* computeCompleteSeasonKeyPlayers, */
  /* computeInSeasonLuckIndex,
  computeInSeasonLineupEfficiency,
  computeInSeasonKeyPlayers, */
  computeTeamAnalysis,
};
