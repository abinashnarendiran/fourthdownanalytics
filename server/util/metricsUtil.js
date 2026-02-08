/* const {
  PlayerWeekProjections,
  PlayerWeekStats,
  Players,
} = require("../models"); */
const { getLineupSlots, getLeagueWeeks } = require("./rosterUtils");
const { sumTop, calculateFantasyPoints } = require("./statsUtiil");

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
  users,
  matchupsByWeek,
  weekSettings,
  winnersBracket = [],
  losersBracket = [],
) => {
  const { regularSeasonWeeks } = getLeagueWeeks(weekSettings);

  const teams = {};

  // -----------------------------
  // INIT TEAMS
  // -----------------------------
  rosters.forEach((r) => {
    const user = users.find((u) => u.display_name === r.owner?.display_name);

    teams[r.rosterId] = {
      rosterId: r.rosterId,
      owner: r.owner?.display_name || "Unknown",
      teamName:
        user?.metadata?.team_name ||
        (r?.owner?.display_name ? `Team ${r.owner.display_name}` : "Unknown"),
      points: 0,
      wins: 0,
      weeklyScores: [],
      championships: 0,
      runnerUps: 0,
      lastPlace: false,
    };
  });

  // -----------------------------
  // REGULAR SEASON SCORES
  // -----------------------------
  Object.entries(matchupsByWeek).forEach(([week, matchups]) => {
    if (Number(week) > regularSeasonWeeks) return;

    matchups.forEach((m) => {
      const team = teams[m.rosterId];
      if (!team) return;

      team.points += m.points;
      team.weeklyScores.push(m.points);

      if (m.points > m.opponent_points) team.wins += 1;
    });
  });

  // -----------------------------
  // PLAYOFF / BRACKET RESULTS
  // -----------------------------
  const getBracketFinal = (bracket) => {
    if (!bracket.length) return null;
    const maxRound = Math.max(...bracket.map((m) => m.r));
    return bracket.find((m) => m.r === maxRound);
  };

  const winnersFinal = getBracketFinal(winnersBracket);
  if (winnersFinal?.w) teams[winnersFinal.w].championships += 1;
  if (winnersFinal?.l) teams[winnersFinal.l].runnerUps += 1;

  const losersFinal = getBracketFinal(losersBracket);
  if (losersFinal?.l) teams[losersFinal.l].lastPlace = true;

  // -----------------------------
  // BUILD CLEAN DASHBOARD RANKINGS
  // -----------------------------
  const rankings = Object.values(teams).map((t) => {
    // Simplified powerScore just based on points, wins, and championship/runner-up/lastPlace
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
      lastPlace: t.lastPlace === 1,
      powerScore: Number(powerScore.toFixed(1)),
    };
  });

  // Sort & assign ranks
  rankings.sort((a, b) => b.powerScore - a.powerScore);
  return rankings.map((r, i) => ({ ...r, rank: i + 1 }));
};

/* const computeCompleteSeasonLuckIndex = (rosters, users, matchupsByWeek) => {
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

    // Find the user in the users array by display_name
    const user = users.find(
      (u) => u.display_name === ownerObj?.owner?.display_name,
    );

    return {
      rosterId,
      owner: ownerObj?.owner?.display_name || "Unknown",
      teamName:
        user?.metadata?.team_name ||
        (ownerObj?.owner?.display_name
          ? `Team ${ownerObj?.owner?.display_name}`
          : "Unknown"),
      actualWins: stats.actualWins,
      expectedWins: stats.expectedWins,
      luck: Number((stats.actualWins - stats.expectedWins).toFixed(2)),
    };
  });
}; */

/* const computeLineupEfficiency = async (
  matchupsByWeek,
  rosters,
  users,
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

  const getActualPoints = async (playerId, week) => {
    if (!playerId) return 0;

    const projection = await PlayerWeekStats.findOne({
      where: {
        week,
        season: seasonYear,
        source: "sleeper",
      },
      include: [
        {
          model: Players,
          where: {
            sleeperPlayerId: playerId,
          },
          required: true,
        },
      ],
      nest: true, // this is correct outside include
    });

    if (!projection) return 0;

    return calculateFantasyPoints(projection.stats, scoringSettings);
  };

  const getProjectedPoints = async (playerId, week) => {
    if (!playerId) return 0;

    const projection = await PlayerWeekProjections.findOne({
      where: {
        week,
        season: seasonYear,
        source: "sleeper",
      },
      include: [
        {
          model: Players,
          where: {
            sleeperPlayerId: playerId,
          },
          required: true,
        },
      ],
      nest: true, // this goes outside of `include`
    });

    if (!projection) return 0;

    return calculateFantasyPoints(projection.projections, scoringSettings);
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

              const slotOrder = [
                "QB",
                "RB",
                "WR",
                "TE",
                "FLEX",
                "DL",
                "LB",
                "DB",
                "IDP_FLEX",
                "K",
                "DEF",
              ];
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

  // -------- FINAL OUTPUT --------
  const totalEfficiency = Object.entries(efficiencyMap)
    .map(([rosterId, v]) => {
      const actual = v.actual.toFixed(2);
      const optimal = v.optimal.toFixed(2);
      const missedPoints = (optimal - actual).toFixed(2);
      const efficiency =
        optimal > 0 ? ((actual / optimal) * 100).toFixed(2) : 0;

      const ownerObj = rosters.find((r) => r.rosterId.toString() === rosterId);

      // Find the user in the users array by display_name
      const user = users.find(
        (u) => u.display_name === ownerObj?.owner?.display_name,
      );

      return {
        rosterId,
        owner: ownerObj?.owner?.display_name
          ? ownerObj?.owner?.display_name
          : "Unknown",
        teamName:
          user?.metadata?.team_name ||
          (ownerObj?.owner?.display_name
            ? `Team ${ownerObj?.owner?.display_name}`
            : "Unknown"),
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

        const user = users.find(
          (u) => u.display_name === ownerObj?.owner?.display_name,
        );

        return {
          rosterId,
          owner: ownerObj?.owner?.display_name ?? "Unknown",
          teamName:
            user?.metadata?.team_name ||
            (ownerObj?.owner?.display_name
              ? `Team ${ownerObj?.owner?.display_name}`
              : "Unknown"),
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
}; */

/* const computeCompleteSeasonKeyPlayers = async (
  matchupsByWeek,
  rosters,
  users,
  scoringSettings,
  seasonYear,
  weekSettings,
) => {
  const playerStatsByRoster = {};
  const teamTotalPoints = {};
  const teamPlayoffPoints = {};

  const { regularSeasonWeeks } = getLeagueWeeks(weekSettings);

  const getActualPoints = async (playerId, week) => {
    if (!playerId) return { points: 0, fullName: "Unknown" };
    const projection = await PlayerWeekStats.findOne({
      where: { week, season: seasonYear, source: "sleeper" },
      include: [
        {
          model: Players,
          where: { sleeperPlayerId: playerId },
          required: true,
        },
      ],
      nest: true,
    });
    if (!projection) return { points: 0, fullName: "Unknown" };
    return {
      points: calculateFantasyPoints(projection.stats, scoringSettings),
      fullName: projection.Player?.fullName || "Unknown",
    };
  };

  const processWeeks = async (filterFn, seasonType) => {
    await Promise.all(
      Object.entries(matchupsByWeek)
        .filter(([week]) => filterFn(Number(week)))
        .map(async ([weekStr, matchups]) => {
          const week = Number(weekStr);
          await Promise.all(
            matchups.map(async (team) => {
              const { rosterId } = team;
              if (!playerStatsByRoster[rosterId])
                playerStatsByRoster[rosterId] = {};
              const teamPointsMap =
                seasonType === "regular" ? teamTotalPoints : teamPlayoffPoints;
              if (!teamPointsMap[rosterId]) teamPointsMap[rosterId] = 0;

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

                  const { points, fullName } = await getActualPoints(
                    playerId,
                    week,
                  );

                  if (!playerStatsByRoster[rosterId][playerId]) {
                    playerStatsByRoster[rosterId][playerId] = {
                      regular: {
                        totalPoints: 0,
                        weeksPlayed: 0,
                        wins: 0,
                        fullName,
                      },
                      playoffs: {
                        totalPoints: 0,
                        weeksPlayed: 0,
                        wins: 0,
                        fullName,
                      },
                    };
                  }

                  const stats =
                    playerStatsByRoster[rosterId][playerId][seasonType];
                  stats.totalPoints += points;
                  stats.weeksPlayed += 1;
                  if (team.points > team.opponent_points) stats.wins += 1;

                  teamPointsMap[rosterId] += points;
                }),
              );
            }),
          );
        }),
    );
  };

  // Process both regular season and playoffs
  await processWeeks((week) => week <= regularSeasonWeeks, "regular");
  await processWeeks((week) => week > regularSeasonWeeks, "playoffs");

  // Build final dashboard array
  return Object.entries(playerStatsByRoster).map(([rosterId, players]) => {
    const ownerObj = rosters.find((r) => r.rosterId.toString() === rosterId);
    const user = users.find(
      (u) => u.display_name === ownerObj?.owner?.display_name,
    );

    const buildTop5 = (seasonType) => {
      const teamPoints =
        seasonType === "regular"
          ? teamTotalPoints[rosterId]
          : teamPlayoffPoints[rosterId];
      return Object.values(players)
        .map((p) => p[seasonType])
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, 5)
        .map((p, idx) => ({
          rank: idx + 1,
          fullName: p.fullName,
          totalPoints: p.totalPoints.toFixed(2),
          weeksPlayed: p.weeksPlayed,
          wins: p.wins,
          contributionPct:
            teamPoints > 0
              ? ((p.totalPoints / teamPoints) * 100).toFixed(2)
              : "0",
        }));
    };

    return {
      rosterId,
      owner: ownerObj?.owner?.display_name || "Unknown",
      teamName:
        user?.metadata?.team_name ||
        (ownerObj?.owner?.display_name
          ? `Team ${ownerObj.owner.display_name}`
          : "Unknown"),
      keyPlayers: {
        regularSeason: buildTop5("regular"),
        playoffs: buildTop5("playoffs"),
      },
    };
  });
}; */

const computeInSeasonPowerRankings = (
  rosters,
  users,
  matchupsByWeek,
  currentWeek,
) => {
  const teams = {};

  // Initialize teams
  rosters.forEach((r) => {
    const user = users.find((u) => u.display_name === r.owner?.display_name);
    teams[r.rosterId] = {
      rosterId: r.rosterId,
      owner: r.owner?.display_name || "Unknown",
      teamName:
        user?.metadata?.team_name ||
        `Team ${r.owner?.display_name || "Unknown"}`,
      points: 0,
      wins: 0,
      weeklyScores: [],
      weightedScore: 0,
    };
  });

  // Aggregate weekly stats
  Object.entries(matchupsByWeek).forEach(([week, matchups]) => {
    const weekNum = Number(week);
    if (weekNum > currentWeek) return;

    matchups.forEach((m) => {
      const team = teams[m.rosterId];
      if (!team) return;

      const points = m.points || 0;
      const oppPoints = m.opponent_points || 0;

      // Create a new object instead of mutating the parameter
      teams[m.rosterId] = {
        ...team,
        points: team.points + points,
        weeklyScores: [...team.weeklyScores, points],
        wins: team.wins + (points > oppPoints ? 1 : 0),
      };
    });
  });

  // Compute weighted score
  const maxPoints = Math.max(...Object.values(teams).map((t) => t.points), 1);

  Object.entries(teams).forEach(([rosterId, team]) => {
    const games = team.weeklyScores.length || 1;
    const winRatio = team.wins / games;
    const normalizedPoints = team.points / maxPoints;
    let weightedScore = winRatio * 0.55 + normalizedPoints * 0.45;

    if (team.wins === 0) weightedScore = normalizedPoints; // handle winless

    // Replace with a new object to avoid mutating function parameter
    teams[rosterId] = {
      ...team,
      weightedScore: Number(weightedScore.toFixed(3)),
      winRatio: Number(winRatio.toFixed(3)),
      points: Number(team.points.toFixed(2)),
    };
  });

  return Object.values(teams).sort((a, b) => b.weightedScore - a.weightedScore);
};

/* const computeInSeasonLuckIndex = (
  rosters,
  users,
  matchupsByWeek,
  currentWeek,
) => {
  const teamStats = {};

  // Iterate over each week
  Object.entries(matchupsByWeek).forEach(([weekStr, weekMatchups]) => {
    const weekNum = Number(weekStr);
    if (weekNum > currentWeek) return; // skip future weeks

    const scores = weekMatchups.map((m) => m.points);
    const median = scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)];

    weekMatchups.forEach((m) => {
      if (!teamStats[m.rosterId]) {
        teamStats[m.rosterId] = {
          actualWins: 0,
          expectedWins: 0,
          weeklyLuck: [],
        };
      }

      const expectedWin = m.points >= median ? 1 : 0;
      const actualWin = m.points > m.opponent_points ? 1 : 0;

      // Update cumulative wins
      teamStats[m.rosterId].expectedWins += expectedWin;
      teamStats[m.rosterId].actualWins += actualWin;

      // Weekly luck
      teamStats[m.rosterId].weeklyLuck.push(actualWin - expectedWin);
    });
  });

  return Object.entries(teamStats).map(([rosterId, stats]) => {
    const ownerObj = rosters.find((r) => r.rosterId.toString() === rosterId);
    const user = users.find(
      (u) => u.display_name === ownerObj?.owner?.display_name,
    );

    const n = stats.weeklyLuck.length;
    const luckSum = stats.weeklyLuck.reduce((acc, val) => acc + val, 0);
    const luckAvg = n ? luckSum / n : 0;
    const luckVariance = n
      ? stats.weeklyLuck.reduce((acc, val) => acc + (val - luckAvg) ** 2, 0) / n
      : 0;

    // 🔹 Season-level luck (standings-based)
    const seasonLuck = stats.actualWins - stats.expectedWins;

    return {
      rosterId,
      owner: ownerObj?.owner?.display_name || "Unknown",
      teamName:
        user?.metadata?.team_name ||
        (ownerObj?.owner?.display_name
          ? `Team ${ownerObj?.owner?.display_name}`
          : "Unknown"),

      // Record-based metrics (top-level dashboard)
      actualWins: stats.actualWins,
      expectedWins: stats.expectedWins,
      seasonLuck: Number(seasonLuck.toFixed(2)),

      // In-season luck analytics
      weeklyLuck: stats.weeklyLuck,
      luckSum: Number(luckSum.toFixed(2)),
      luckAvg: Number(luckAvg.toFixed(2)),
      luckVariance: Number(luckVariance.toFixed(2)),
    };
  });
}; */

/* const computeInSeasonLineupEfficiency = async (
  matchupsByWeek,
  rosters,
  users,
  scoringSettings,
  seasonYear,
  currentWeek,
) => {
  const totalsMap = {};

  // ---------- HELPERS ----------
  const getActualPoints = async (playerId, week) => {
    if (!playerId) return 0;

    const stat = await PlayerWeekStats.findOne({
      where: { week, season: seasonYear, source: "sleeper" },
      include: [
        {
          model: Players,
          where: { sleeperPlayerId: playerId },
          required: true,
        },
      ],
      nest: true,
    });

    if (!stat) return 0;
    return calculateFantasyPoints(stat.stats, scoringSettings);
  };

  const getProjectedPoints = async (playerId, week) => {
    if (!playerId) return 0;

    const projection = await PlayerWeekProjections.findOne({
      where: { week, season: seasonYear, source: "sleeper" },
      include: [
        {
          model: Players,
          where: { sleeperPlayerId: playerId },
          required: true,
        },
      ],
      nest: true,
    });

    if (!projection) return 0;
    return calculateFantasyPoints(projection.projections, scoringSettings);
  };

  // ---------- MAIN LOOP ----------
  await Promise.all(
    Object.entries(matchupsByWeek).map(async ([weekStr, matchups]) => {
      const week = Number(weekStr);
      if (week > currentWeek) return;

      await Promise.all(
        matchups.map(async (team) => {
          const { rosterId } = team;

          if (!totalsMap[rosterId]) {
            totalsMap[rosterId] = {
              starters: 0,
              total: 0,
              projectedStarters: 0,
              projectedTotal: 0,
            };
          }

          // starters
          await Promise.all(
            (team.starters || []).map(async (starter) => {
              const playerId =
                typeof starter === "string"
                  ? starter
                  : starter?.pid ||
                    Object.keys(starter || {}).find((k) =>
                      k.startsWith("TEAM_"),
                    );

              if (!playerId) return;

              const actual = await getActualPoints(playerId, week);
              const projected = await getProjectedPoints(playerId, week);

              totalsMap[rosterId].starters += actual;
              totalsMap[rosterId].projectedStarters += projected;
              totalsMap[rosterId].total += actual;
              totalsMap[rosterId].projectedTotal += projected;
            }),
          );

          // bench
          await Promise.all(
            (team.players || []).map(async (playerId) => {
              if ((team.starters || []).includes(playerId)) return;

              const actual = await getActualPoints(playerId, week);
              const projected = await getProjectedPoints(playerId, week);

              totalsMap[rosterId].total += actual;
              totalsMap[rosterId].projectedTotal += projected;
            }),
          );
        }),
      );
    }),
  );

  // ---------- DASHBOARD OUTPUT ----------
  return Object.entries(totalsMap).map(([rosterId, totals]) => {
    const roster = rosters.find((r) => r.rosterId.toString() === rosterId);
    const user = users.find(
      (u) => u.display_name === roster?.owner?.display_name,
    );

    const actualEfficiency =
      totals.total > 0
        ? Number(((totals.starters / totals.total) * 100).toFixed(2))
        : 0;

    const projectedEfficiency =
      totals.projectedTotal > 0
        ? Number(
            ((totals.projectedStarters / totals.projectedTotal) * 100).toFixed(
              2,
            ),
          )
        : 0;

    return {
      rosterId: Number(rosterId),
      owner: roster?.owner?.display_name ?? "Unknown",
      teamName:
        user?.metadata?.team_name ||
        `Team ${roster?.owner?.display_name ?? "Unknown"}`,

      lineupEfficiency: actualEfficiency,
      projectedEfficiency,
      efficiencyDelta: Number(
        (actualEfficiency - projectedEfficiency).toFixed(2),
      ),
    };
  });
};
 */
/* const computeInSeasonKeyPlayers = async (
  matchupsByWeek,
  rosters,
  users,
  scoringSettings,
  currentWeek,
  topNPlayers = 3,
) => {
  const playerStatsByRoster = {};
  const teamTotalPoints = {};

  const getActualPoints = async (playerId, week) => {
    if (!playerId)
      return { points: 0, fullName: "Unknown", position: "Unknown" };

    const stat = await PlayerWeekStats.findOne({
      where: { week, source: "sleeper" },
      include: [
        {
          model: Players,
          where: { sleeperPlayerId: playerId },
          required: true,
        },
      ],
      nest: true,
    });

    if (!stat) return { points: 0, fullName: "Unknown", position: "Unknown" };

    return {
      points: calculateFantasyPoints(stat.stats, scoringSettings),
      fullName: stat.Player?.fullName || "Unknown",
      position: stat.Player?.position || "Unknown",
    };
  };

  // ---------- AGGREGATE ----------
  await Promise.all(
    Object.entries(matchupsByWeek)
      .filter(([weekStr]) => Number(weekStr) <= currentWeek)
      .map(async ([weekStr, matchups]) => {
        const week = Number(weekStr);

        await Promise.all(
          matchups.map(async (team) => {
            const { rosterId } = team;

            if (!playerStatsByRoster[rosterId])
              playerStatsByRoster[rosterId] = {};
            if (!teamTotalPoints[rosterId]) teamTotalPoints[rosterId] = 0;

            await Promise.all(
              (team.starters || []).map(async (starter) => {
                const playerId =
                  typeof starter === "string"
                    ? starter
                    : starter?.pid ||
                      Object.keys(starter || {}).find((k) =>
                        k.startsWith("TEAM_"),
                      );

                if (!playerId) return;

                const { points, fullName, position } = await getActualPoints(
                  playerId,
                  week,
                );

                if (!playerStatsByRoster[rosterId][playerId]) {
                  playerStatsByRoster[rosterId][playerId] = {
                    totalPoints: 0,
                    fullName,
                    position,
                  };
                }

                playerStatsByRoster[rosterId][playerId].totalPoints += points;
                teamTotalPoints[rosterId] += points;
              }),
            );
          }),
        );
      }),
  );

  // ---------- DASHBOARD OUTPUT ----------
  return Object.entries(playerStatsByRoster).map(([rosterId, players]) => {
    const ownerObj = rosters.find((r) => r.rosterId.toString() === rosterId);
    const user = users.find(
      (u) => u.display_name === ownerObj?.owner?.display_name,
    );

    const topPlayers = Object.values(players)
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, topNPlayers);

    const topPlayersPoints = topPlayers.reduce(
      (sum, p) => sum + p.totalPoints,
      0,
    );

    const contributionPct =
      teamTotalPoints[rosterId] > 0
        ? Number(
            ((topPlayersPoints / teamTotalPoints[rosterId]) * 100).toFixed(2),
          )
        : 0;

    return {
      rosterId: Number(rosterId),
      owner: ownerObj?.owner?.display_name ?? "Unknown",
      teamName:
        user?.metadata?.team_name ||
        `Team ${ownerObj?.owner?.display_name ?? "Unknown"}`,

      keyPlayersSummary: {
        topPlayers: topPlayers.map((p) => ({
          fullName: p.fullName,
          position: p.position,
          totalPoints: Number(p.totalPoints.toFixed(2)),
        })),
        topPlayersContributionPct: contributionPct,
      },
    };
  });
};
 */
module.exports = {
  computeTeamProjections,
  computeFinalPowerRankings,
  /* computeCompleteSeasonLuckIndex,
  computeLineupEfficiency, */
  calculateFantasyPoints,
  /* computeCompleteSeasonKeyPlayers, */
  computeInSeasonPowerRankings,
  /* computeInSeasonLuckIndex,
  computeInSeasonLineupEfficiency,
  computeInSeasonKeyPlayers, */
};
