const { Players } = require("../../models");
const { getLeagueWeeks } = require("../../util/rosterUtils");
const { success, failure } = require("../../util/result");
const {
  assignRosterSlots,
  getStartingSlots,
} = require("../../util/lineupUtils");
const { calculateLineupEfficiency } = require("./lineupEfficiency");
const { calculateLuckIndex } = require("./luckIndex");

const roundToTwoDecimals = (value) => Number(value.toFixed(2));
const RADAR_POSITIONS = ["QB", "RB", "WR", "TE"];

const normalCumulativeProbability = (value) => {
  const absoluteValue = Math.abs(value);
  const t = 1 / (1 + 0.2316419 * absoluteValue);
  const density =
    0.3989422804014327 * Math.exp(-0.5 * absoluteValue * absoluteValue);
  const tail =
    density *
    t *
    (0.31938153 +
      t *
        (-0.356563782 +
          t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return value >= 0 ? 1 - tail : tail;
};

const normalizePlayerId = (playerId) => {
  if (playerId && typeof playerId === "object") {
    const id =
      playerId.player_id ??
      playerId.sleeperPlayerId ??
      playerId.playerId ??
      playerId.id;
    return id === undefined || id === null ? null : String(id);
  }
  return playerId === undefined || playerId === null ? null : String(playerId);
};

const getPlayerPosition = (player) => {
  if (typeof player.position === "string" && player.position.trim()) {
    return player.position.trim().toUpperCase();
  }
  if (
    Array.isArray(player.fantasyPositions) &&
    typeof player.fantasyPositions[0] === "string"
  ) {
    return player.fantasyPositions[0].trim().toUpperCase();
  }
  return "UNKNOWN";
};

const normalizeRadarSlot = (slot) => {
  const normalizedSlot = slot.toUpperCase();
  return RADAR_POSITIONS.includes(normalizedSlot) ? normalizedSlot : null;
};

const isCompleteMatchupWeek = (matchups, rosters) => {
  if (!Array.isArray(matchups) || matchups.length !== rosters.length) {
    return false;
  }
  const seenRosters = new Set();
  return matchups.every((matchup) => {
    const rosterId = String(matchup.rosterId);
    if (
      seenRosters.has(rosterId) ||
      !rosters.some((roster) => String(roster.rosterId) === rosterId) ||
      !Number.isFinite(matchup.points) ||
      !Number.isFinite(matchup.opponent_points)
    ) {
      return false;
    }
    seenRosters.add(rosterId);
    return true;
  });
};

const hasCompletePlayerScores = (matchups, rosters) =>
  matchups.every((matchup) => {
    if (
      !Array.isArray(matchup.players) ||
      !Array.isArray(matchup.starters) ||
      !matchup.players_points ||
      typeof matchup.players_points !== "object" ||
      Array.isArray(matchup.players_points)
    ) {
      return false;
    }

    const roster = rosters.find(
      (team) => String(team.rosterId) === String(matchup.rosterId),
    );
    const excludedIds = new Set(
      [...(roster.reserve || []), ...(roster.taxi || [])]
        .map(normalizePlayerId)
        .filter(Boolean),
    );
    const hasScore = (playerId) => {
      const id = normalizePlayerId(playerId);
      return !id || id === "0" || Number.isFinite(matchup.players_points[id]);
    };

    return (
      matchup.starters.every(hasScore) &&
      matchup.players
        .filter((playerId) => !excludedIds.has(normalizePlayerId(playerId)))
        .every(hasScore)
    );
  });

const calculateScheduleLuck = (
  rosters,
  matchupsByWeek,
  rosterId,
  scoredWeeks,
) => {
  const templates = rosters.filter(
    (roster) => String(roster.rosterId) !== String(rosterId),
  );
  const outcomes = [];
  let incompleteSchedules = 0;

  templates.forEach((template) => {
    let wins = 0;
    let gamesPlayed = 0;
    scoredWeeks.forEach(({ week, points }) => {
      const matchups = matchupsByWeek[String(week)] || [];
      const scheduleMatchup = matchups.find(
        (matchup) => String(matchup.rosterId) === String(template.rosterId),
      );
      const opponent = matchups.find(
        (matchup) =>
          String(matchup.rosterId) === String(scheduleMatchup?.opponent_id),
      );
      if (!opponent || !Number.isFinite(opponent.points)) return;
      gamesPlayed += 1;
      if (points > opponent.points) wins += 1;
      else if (points === opponent.points) wins += 0.5;
    });

    if (gamesPlayed !== scoredWeeks.length || gamesPlayed === 0) {
      incompleteSchedules += 1;
      return;
    }
    outcomes.push({ rosterId: template.rosterId, wins, gamesPlayed });
  });

  const counts = new Map();
  outcomes.forEach(({ wins }) => {
    counts.set(wins, (counts.get(wins) || 0) + 1);
  });
  const distribution = [...counts.entries()]
    .map(([wins, count]) => ({
      wins,
      losses: scoredWeeks.length - wins,
      count,
      probability:
        outcomes.length > 0
          ? roundToTwoDecimals((count / outcomes.length) * 100)
          : 0,
    }))
    .sort((left, right) => left.wins - right.wins);

  return {
    distribution,
    schedulesAvailable: templates.length,
    schedulesEvaluated: outcomes.length,
    incompleteSchedules,
    weeksPerSchedule: scoredWeeks.length,
  };
};

const calculatePositionalRadar = (
  rosters,
  matchupsByWeek,
  availableWeeks,
  rosterPositions,
  selectedRosterId,
) => {
  const pointsByRoster = new Map();
  const weeksByRoster = new Map();
  const startingSlots = getStartingSlots(rosterPositions);
  const axisIsConfigured = new Set(
    startingSlots.map(normalizeRadarSlot).filter(Boolean),
  );

  availableWeeks.forEach((week) => {
    const matchups = matchupsByWeek[String(week)] || [];
    if (matchups.length === 0) return;

    matchups.forEach((matchup) => {
      const rosterId = String(matchup.rosterId);
      const weeklyPoints = new Map();
      startingSlots.forEach((slot, index) => {
        const axis = normalizeRadarSlot(slot);
        const playerId = normalizePlayerId(matchup.starters?.[index]);
        const points = matchup.players_points?.[playerId];
        if (
          !axis ||
          !playerId ||
          playerId === "0" ||
          !Number.isFinite(points)
        ) {
          return;
        }
        weeklyPoints.set(axis, (weeklyPoints.get(axis) || 0) + points);
      });

      const rosterTotals = pointsByRoster.get(rosterId) || new Map();
      const rosterWeeks = weeksByRoster.get(rosterId) || new Map();
      axisIsConfigured.forEach((axis) => {
        if (!weeklyPoints.has(axis)) return;
        rosterTotals.set(
          axis,
          (rosterTotals.get(axis) || 0) + weeklyPoints.get(axis),
        );
        rosterWeeks.set(axis, (rosterWeeks.get(axis) || 0) + 1);
      });
      pointsByRoster.set(rosterId, rosterTotals);
      weeksByRoster.set(rosterId, rosterWeeks);
    });
  });

  return RADAR_POSITIONS.map((position) => {
    if (!axisIsConfigured.has(position)) {
      return {
        position,
        team: null,
        leagueAverage: null,
        leagueLeader: null,
      };
    }

    const teamValues = rosters
      .map((roster) => {
        const rosterId = String(roster.rosterId);
        const totals = pointsByRoster.get(rosterId);
        const weeks = weeksByRoster.get(rosterId)?.get(position) || 0;
        return weeks > 0 ? (totals.get(position) || 0) / weeks : null;
      })
      .filter((value) => value !== null);
    const selectedWeeks =
      weeksByRoster.get(String(selectedRosterId))?.get(position) || 0;
    const selectedTotal =
      pointsByRoster.get(String(selectedRosterId))?.get(position) || 0;

    return {
      position,
      team:
        selectedWeeks > 0
          ? roundToTwoDecimals(selectedTotal / selectedWeeks)
          : null,
      leagueAverage:
        teamValues.length > 0
          ? roundToTwoDecimals(
              teamValues.reduce((total, value) => total + value, 0) /
                teamValues.length,
            )
          : null,
      leagueLeader:
        teamValues.length > 0
          ? roundToTwoDecimals(Math.max(...teamValues))
          : null,
    };
  });
};

const calculateTeamAnalysis = async ({
  rosters,
  matchupsByWeek,
  rosterId,
  rosterPositions,
  weekSettings,
  throughWeek,
}) => {
  if (
    !Array.isArray(rosters) ||
    !matchupsByWeek ||
    typeof matchupsByWeek !== "object"
  ) {
    return failure(
      "Rosters and weekly matchups are required",
      400,
      "INVALID_TEAM_ANALYSIS_INPUT",
    );
  }

  const selectedRoster = rosters.find(
    (roster) => String(roster.rosterId) === String(rosterId),
  );
  if (!selectedRoster) {
    return failure("Roster not found in league", 404, "ROSTER_NOT_FOUND");
  }

  const { regularSeasonWeeks } = getLeagueWeeks(weekSettings);
  const lastWeek = Math.min(regularSeasonWeeks, throughWeek);
  const availableWeeks = Array.from(
    { length: lastWeek },
    (_, index) => index + 1,
  );
  const completeMatchupsByWeek = Object.fromEntries(
    availableWeeks.map((week) => {
      const matchups = matchupsByWeek[String(week)] || [];
      return [
        String(week),
        isCompleteMatchupWeek(matchups, rosters) ? matchups : [],
      ];
    }),
  );
  const rosterPlayerIds = [
    ...new Set(
      (selectedRoster.players || [])
        .map(normalizePlayerId)
        .filter((id) => id !== null && id !== "0" && id !== ""),
    ),
  ];
  const matchupPlayerIds = Object.entries(matchupsByWeek)
    .filter(([week]) => Number(week) > 0 && Number(week) <= lastWeek)
    .flatMap(([, matchups]) =>
      matchups.flatMap((matchup) => [
        ...(matchup.players || []).map(normalizePlayerId),
        ...(matchup.starters || []).map(normalizePlayerId),
      ]),
    )
    .filter((id) => id !== null && id !== "0" && id !== "");
  const playerIds = [...new Set([...rosterPlayerIds, ...matchupPlayerIds])];

  let players = [];
  if (playerIds.length > 0) {
    try {
      players = await Players.findAll({
        where: { sleeperPlayerId: playerIds },
        attributes: [
          "sleeperPlayerId",
          "fullName",
          "position",
          "fantasyPositions",
          "team",
          "status",
        ],
        raw: true,
      });
    } catch (error) {
      return failure(error, 500, "TEAM_ANALYSIS_PLAYER_QUERY_FAILED");
    }
  }

  const playersById = Object.fromEntries(
    players.map((player) => [String(player.sleeperPlayerId), player]),
  );
  const luckResult = calculateLuckIndex(
    rosters,
    completeMatchupsByWeek,
    regularSeasonWeeks,
    lastWeek,
  );
  if (luckResult.error) return luckResult;
  const luck = luckResult.data.find(
    (result) => String(result.rosterId) === String(rosterId),
  );
  if (!luck) {
    return failure(
      "Luck metrics are unavailable for the selected roster",
      422,
      "TEAM_ANALYSIS_LUCK_UNAVAILABLE",
    );
  }

  let incompletePlayerWeeks = 0;
  const lineupMatchupsByWeek = Object.fromEntries(
    availableWeeks.map((week) => {
      const matchups = completeMatchupsByWeek[String(week)] || [];
      if (matchups.length > 0 && !hasCompletePlayerScores(matchups, rosters)) {
        incompletePlayerWeeks += 1;
        return [String(week), []];
      }
      return [String(week), matchups];
    }),
  );
  const efficiencyResult = calculateLineupEfficiency(
    rosters,
    lineupMatchupsByWeek,
    rosterPositions,
    playersById,
    regularSeasonWeeks,
    lastWeek,
  );
  const recoverableEfficiencyErrors = new Set([
    "INCOMPLETE_WEEKLY_LINEUPS",
    "MISSING_ROSTER_PLAYER_SCORES",
    "INVALID_PLAYER_POINTS",
  ]);
  if (
    efficiencyResult.error &&
    !recoverableEfficiencyErrors.has(efficiencyResult.error.code)
  ) {
    return efficiencyResult;
  }
  const efficiency = efficiencyResult.data?.find(
    (result) => String(result.rosterId) === String(rosterId),
  );

  const teamWeeklyScores = [];
  const weeklyVsLeague = [];
  let totalTeamPoints = 0;
  let totalLeaguePoints = 0;
  let scoredWeeks = 0;
  let actualLosses = 0;
  let actualTies = 0;
  const weeklyLuckHistory = [];
  const scoredWeeksForSchedule = [];
  const teamPointsByPosition = new Map();
  const teamPositionWeekCounts = new Map();
  const leaguePointsByPosition = new Map();
  const leaguePositionWeekCounts = new Map();

  availableWeeks.forEach((week) => {
    const matchups = completeMatchupsByWeek[String(week)] || [];
    const selectedMatchup = matchups.find(
      (matchup) => String(matchup.rosterId) === String(rosterId),
    );
    if (!selectedMatchup || !Number.isFinite(selectedMatchup.points)) return;

    const leagueScores = matchups
      .map((matchup) => matchup.points)
      .filter(Number.isFinite);
    if (leagueScores.length === 0) return;

    const leagueAverage =
      leagueScores.reduce((total, points) => total + points, 0) /
      leagueScores.length;
    const teamPoints = selectedMatchup.points;
    scoredWeeksForSchedule.push({ week, points: teamPoints });
    teamWeeklyScores.push(teamPoints);
    totalTeamPoints += teamPoints;
    totalLeaguePoints += leagueAverage;
    scoredWeeks += 1;
    weeklyVsLeague.push({
      week,
      teamPoints,
      leagueAvg: roundToTwoDecimals(leagueAverage),
    });

    if (Number.isFinite(selectedMatchup.opponent_points)) {
      if (teamPoints < selectedMatchup.opponent_points) actualLosses += 1;
      else if (teamPoints === selectedMatchup.opponent_points) actualTies += 1;
    }

    matchups.forEach((matchup) => {
      if (!Array.isArray(matchup.starters)) return;
      const positionPoints = new Map();
      const incompletePositions = new Set();
      let unknownStarterPosition = false;
      matchup.starters.forEach((starter) => {
        const playerId = normalizePlayerId(starter);
        if (!playerId || playerId === "0") return;
        const player = playersById[playerId];
        const position = player ? getPlayerPosition(player) : "UNKNOWN";
        if (!position || position === "UNKNOWN") {
          unknownStarterPosition = true;
          return;
        }
        const points = matchup.players_points?.[playerId];
        if (!Number.isFinite(points)) {
          incompletePositions.add(position);
          return;
        }
        positionPoints.set(
          position,
          (positionPoints.get(position) || 0) + points,
        );
      });
      // An unknown starter could belong to any position.
      if (unknownStarterPosition) return;
      positionPoints.forEach((points, position) => {
        if (incompletePositions.has(position)) return;
        if (String(matchup.rosterId) === String(rosterId)) {
          teamPointsByPosition.set(
            position,
            (teamPointsByPosition.get(position) || 0) + points,
          );
          teamPositionWeekCounts.set(
            position,
            (teamPositionWeekCounts.get(position) || 0) + 1,
          );
        }
        leaguePointsByPosition.set(
          position,
          (leaguePointsByPosition.get(position) || 0) + points,
        );
        leaguePositionWeekCounts.set(
          position,
          (leaguePositionWeekCounts.get(position) || 0) + 1,
        );
      });
    });

    const higherScores = leagueScores.filter(
      (points) => teamPoints > points,
    ).length;
    const tiedScores = leagueScores.filter(
      (points) => teamPoints === points,
    ).length;
    const expectedThisWeek =
      leagueScores.length > 1
        ? (higherScores + Math.max(0, tiedScores - 1) * 0.5) /
          (leagueScores.length - 1)
        : 0;
    const actualThisWeek =
      teamPoints > selectedMatchup.opponent_points
        ? 1
        : teamPoints === selectedMatchup.opponent_points
          ? 0.5
          : 0;
    weeklyLuckHistory.push(
      roundToTwoDecimals(actualThisWeek - expectedThisWeek),
    );
  });

  const positionMap = new Map();
  rosterPlayerIds.forEach((playerId) => {
    const player = playersById[playerId];
    const position = player ? getPlayerPosition(player) : "UNKNOWN";
    const positionEntry = positionMap.get(position) || {
      position,
      rosterCount: 0,
      players: [],
    };
    positionEntry.rosterCount += 1;
    positionEntry.players.push({
      playerId,
      name: player?.fullName || `Player ${playerId}`,
      position,
      team: player?.team || null,
      status: player?.status || null,
    });
    positionMap.set(position, positionEntry);
  });

  const positionalOverview = [...positionMap.values()]
    .map((position) => {
      const positionPoints = teamPointsByPosition.get(position.position) || 0;
      const teamWeeks = teamPositionWeekCounts.get(position.position) || 0;
      const leagueWeeks = leaguePositionWeekCounts.get(position.position) || 0;
      const averagePoints = teamWeeks > 0 ? positionPoints / teamWeeks : null;
      const leagueAveragePoints =
        leagueWeeks > 0
          ? (leaguePointsByPosition.get(position.position) || 0) / leagueWeeks
          : null;
      return {
        ...position,
        totalPoints: roundToTwoDecimals(positionPoints),
        averagePoints:
          averagePoints === null ? null : roundToTwoDecimals(averagePoints),
        leagueAveragePoints:
          leagueAveragePoints === null
            ? null
            : roundToTwoDecimals(leagueAveragePoints),
        vsLeagueAverage:
          averagePoints !== null && leagueAveragePoints !== null
            ? roundToTwoDecimals(averagePoints - leagueAveragePoints)
            : null,
      };
    })
    .sort((a, b) => a.position.localeCompare(b.position));
  const scheduleLuck = calculateScheduleLuck(
    rosters,
    completeMatchupsByWeek,
    rosterId,
    scoredWeeksForSchedule,
  );
  const positionalRadar = calculatePositionalRadar(
    rosters,
    completeMatchupsByWeek,
    availableWeeks,
    rosterPositions,
    rosterId,
  );

  const { actualWins, expectedWins } = luck;
  const luckIndex = roundToTwoDecimals(actualWins - expectedWins);
  const teamAvg = scoredWeeks > 0 ? totalTeamPoints / scoredWeeks : 0;
  const leagueAvg = scoredWeeks > 0 ? totalLeaguePoints / scoredWeeks : 0;
  const standardDeviation =
    teamWeeklyScores.length > 0
      ? Math.sqrt(
          teamWeeklyScores.reduce(
            (sum, points) => sum + (points - teamAvg) ** 2,
            0,
          ) / teamWeeklyScores.length,
        )
      : 0;
  const teamName =
    selectedRoster.owner?.metadata?.team_name ||
    selectedRoster.metadata?.team_name ||
    (selectedRoster.owner?.display_name
      ? `Team ${selectedRoster.owner.display_name}`
      : `Roster ${rosterId}`);
  const ownerName = selectedRoster.owner?.display_name || "Unknown";
  const winsAndLosses = `${actualWins.toFixed(1)}-${actualLosses.toFixed(0)}`;

  return success({
    team: {
      rosterId: Number(rosterId),
      name: teamName,
      owner: ownerName,
      actualWins,
      winAnalysis: {
        actualWins,
        actualLosses,
        actualTies,
        expectedWins,
        expectedLosses: roundToTwoDecimals(
          Math.max(0, scoredWeeks - expectedWins),
        ),
        winDiff: luckIndex,
        record: winsAndLosses,
      },
      consistency: roundToTwoDecimals(standardDeviation),
      efficiency: {
        actual: efficiency?.lineupEfficiency ?? 0,
        projected: 0,
        optimal: 100,
      },
      actualStarterPoints: efficiency?.actualStarterPoints ?? 0,
      optimalStarterPoints: efficiency?.optimalStarterPoints ?? 0,
      lineupEfficiencyMetadataWarnings: [
        ...(efficiency?.metadataWarnings ?? []),
        ...(incompletePlayerWeeks > 0
          ? [
              `Lineup efficiency omitted ${incompletePlayerWeeks} week(s) with incomplete player scores.`,
            ]
          : []),
        ...(efficiencyResult.error
          ? ["Lineup efficiency is unavailable for incomplete matchup data."]
          : []),
      ],
      coaching: {
        actualPoints: efficiency?.actualStarterPoints ?? null,
        optimalPoints: efficiency?.optimalStarterPoints ?? null,
        pointsLeft:
          efficiency &&
          Number.isFinite(efficiency.actualStarterPoints) &&
          Number.isFinite(efficiency.optimalStarterPoints)
            ? roundToTwoDecimals(
                efficiency.optimalStarterPoints -
                  efficiency.actualStarterPoints,
              )
            : null,
        coachingIQ: efficiency?.lineupEfficiency ?? null,
        weeksIncluded: efficiency?.weeksScored ?? 0,
        weeksUnavailable:
          (efficiency?.weeksUnavailable ?? 0) +
          (efficiency?.weeksUnscored ?? 0) +
          incompletePlayerWeeks,
        weeklyScoreStdDev: roundToTwoDecimals(standardDeviation),
        metadataWarnings: [
          ...(efficiency?.metadataWarnings ?? []),
          ...(incompletePlayerWeeks > 0
            ? [
                `Lineup efficiency omitted ${incompletePlayerWeeks} week(s) with incomplete player scores.`,
              ]
            : []),
          ...(efficiencyResult.error
            ? ["Some matchup player scores were incomplete."]
            : []),
        ],
      },
      scheduleLuck,
      positionalRadar,
      dataCoverage: {
        requestedWeeks: availableWeeks.length,
        scoredWeeks,
        omittedWeeks: Math.max(availableWeeks.length - scoredWeeks, 0),
      },
      champion: false,
      runner_up: false,
      lastPlace: false,
      luck: {
        luckIndex,
        luckVariance: luckIndex,
        weeklyLuckHistory,
      },
      averages: {
        teamAvg: roundToTwoDecimals(teamAvg),
        stdDev: roundToTwoDecimals(standardDeviation),
        weeklyVsLeague,
        leagueAvg: roundToTwoDecimals(leagueAvg),
      },
      positionalOverview,
      scoredWeeks,
    },
    compareTeamId: null,
  });
};

const calculateTeamComparison = async ({
  rosters,
  matchupsByWeek,
  primaryRosterId,
  secondaryRosterId,
  rosterPositions,
  weekSettings,
  throughWeek,
  selectedWeek,
  primarySwap = null,
  secondarySwap = null,
}) => {
  if (String(primaryRosterId) === String(secondaryRosterId)) {
    return failure(
      "Choose two different rosters to compare",
      400,
      "DUPLICATE_COMPARISON_ROSTERS",
    );
  }

  const [primaryResult, secondaryResult] = await Promise.all([
    calculateTeamAnalysis({
      rosters,
      matchupsByWeek,
      rosterId: primaryRosterId,
      rosterPositions,
      weekSettings,
      throughWeek,
    }),
    calculateTeamAnalysis({
      rosters,
      matchupsByWeek,
      rosterId: secondaryRosterId,
      rosterPositions,
      weekSettings,
      throughWeek,
    }),
  ]);
  if (primaryResult.error) return primaryResult;
  if (secondaryResult.error) return secondaryResult;

  const primaryTeam = primaryResult.data.team;
  const secondaryTeam = secondaryResult.data.team;
  const matchupWeek =
    Number.isInteger(selectedWeek) && selectedWeek > 0
      ? selectedWeek
      : Math.min(throughWeek, getLeagueWeeks(weekSettings).regularSeasonWeeks);
  const selectedMatchups = matchupsByWeek[String(matchupWeek)] || [];
  const primaryMatchup = selectedMatchups.find(
    (matchup) => String(matchup.rosterId) === String(primaryRosterId),
  );
  const secondaryMatchup = selectedMatchups.find(
    (matchup) => String(matchup.rosterId) === String(secondaryRosterId),
  );

  const playerIds = [
    ...(primaryMatchup?.players || []),
    ...(primaryMatchup?.starters || []),
    ...(secondaryMatchup?.players || []),
    ...(secondaryMatchup?.starters || []),
  ]
    .map(normalizePlayerId)
    .filter((playerId) => playerId && playerId !== "0");
  let playerRows = [];
  if (playerIds.length > 0) {
    try {
      playerRows = await Players.findAll({
        where: { sleeperPlayerId: [...new Set(playerIds)] },
        attributes: [
          "sleeperPlayerId",
          "fullName",
          "position",
          "fantasyPositions",
        ],
        raw: true,
      });
    } catch (error) {
      return failure(error, 500, "TEAM_COMPARISON_PLAYER_QUERY_FAILED");
    }
  }
  const playerById = Object.fromEntries(
    playerRows.map((player) => [String(player.sleeperPlayerId), player]),
  );
  const getSwapOptions = (matchup) => {
    if (
      !matchup ||
      !Array.isArray(matchup.players) ||
      !Array.isArray(matchup.starters) ||
      !matchup.players_points
    ) {
      return { starters: [], bench: [] };
    }
    const starters = new Set(
      matchup.starters.map(normalizePlayerId).filter(Boolean),
    );
    const roster = rosters.find(
      (team) => String(team.rosterId) === String(matchup.rosterId),
    );
    const reserves = new Set(
      [
        ...(matchup.reserve ?? roster?.reserve ?? []),
        ...(matchup.taxi ?? roster?.taxi ?? []),
      ]
        .map(normalizePlayerId)
        .filter(Boolean),
    );
    return matchup.players
      .map(normalizePlayerId)
      .filter(
        (playerId) =>
          playerId && Number.isFinite(matchup.players_points[playerId]),
      )
      .filter((playerId) => playerById[playerId])
      .map((playerId) => ({
        playerId,
        name: playerById[playerId].fullName || `Player ${playerId}`,
        position: getPlayerPosition(playerById[playerId]),
        points: matchup.players_points[playerId],
        isStarter: starters.has(playerId),
        isReserve: reserves.has(playerId),
      }))
      .reduce(
        (groups, player) => {
          if (player.isStarter) groups.starters.push(player);
          else if (!player.isReserve) groups.bench.push(player);
          return groups;
        },
        { starters: [], bench: [] },
      );
  };
  const primarySwapOptions = getSwapOptions(primaryMatchup);
  const secondarySwapOptions = getSwapOptions(secondaryMatchup);
  const resolveSwap = (swap, options, matchup) => {
    if (!swap) return success({ points: 0, applied: null });
    const starter = options.starters.find(
      (player) => player.playerId === String(swap.starterId),
    );
    const bench = options.bench.find(
      (player) => player.playerId === String(swap.benchId),
    );
    if (!starter || !bench) {
      return failure(
        "Swap must select a scored starter and bench player.",
        400,
        "INVALID_TEAM_COMPARISON_SWAP",
      );
    }

    const starterIds = matchup.starters
      .map(normalizePlayerId)
      .filter((id) => id && id !== "0")
      .map((id) => (id === starter.playerId ? bench.playerId : id));
    if (starterIds.some((id) => !playerById[id])) {
      return failure(
        "Swap cannot be validated because starter position data is missing.",
        400,
        "INVALID_TEAM_COMPARISON_SWAP",
      );
    }
    const assignment = assignRosterSlots(
      { players: starterIds.map((id) => playerById[id]) },
      rosterPositions,
      () => 0,
    );
    if (assignment.error) return assignment;
    if (!assignment.data.matchingComplete) {
      return failure(
        "Unable to validate the swapped lineup.",
        500,
        "TEAM_COMPARISON_LINEUP_VALIDATION_FAILED",
      );
    }
    if (assignment.data.unfilledSlots.length > 0) {
      return failure(
        "Swap leaves required starting lineup slots unfilled.",
        400,
        "INVALID_TEAM_COMPARISON_SWAP",
      );
    }
    return success({
      points: bench.points - starter.points,
      applied: {
        starterId: starter.playerId,
        benchId: bench.playerId,
        pointsDelta: roundToTwoDecimals(bench.points - starter.points),
      },
    });
  };
  const primarySwapResult = resolveSwap(
    primarySwap,
    primarySwapOptions,
    primaryMatchup,
  );
  if (primarySwapResult.error) return primarySwapResult;
  const secondarySwapResult = resolveSwap(
    secondarySwap,
    secondarySwapOptions,
    secondaryMatchup,
  );
  if (secondarySwapResult.error) return secondarySwapResult;
  const resolvedPrimarySwap = primarySwapResult.data;
  const resolvedSecondarySwap = secondarySwapResult.data;
  const primaryPowerScore = roundToTwoDecimals(
    primaryTeam.averages.teamAvg * primaryTeam.scoredWeeks +
      primaryTeam.winAnalysis.actualWins * 5,
  );
  const secondaryPowerScore = roundToTwoDecimals(
    secondaryTeam.averages.teamAvg * secondaryTeam.scoredWeeks +
      secondaryTeam.winAnalysis.actualWins * 5,
  );

  let primaryWinProbability = null;
  let secondaryWinProbability = null;
  if (primaryTeam.scoredWeeks > 0 && secondaryTeam.scoredWeeks > 0) {
    const scoreDifference =
      primaryTeam.averages.teamAvg +
      resolvedPrimarySwap.points -
      (secondaryTeam.averages.teamAvg + resolvedSecondarySwap.points);
    const combinedStandardDeviation = Math.sqrt(
      primaryTeam.averages.stdDev ** 2 + secondaryTeam.averages.stdDev ** 2,
    );
    const probability =
      combinedStandardDeviation === 0
        ? scoreDifference > 0
          ? 1
          : scoreDifference < 0
            ? 0
            : 0.5
        : normalCumulativeProbability(
            scoreDifference / combinedStandardDeviation,
          );
    primaryWinProbability = roundToTwoDecimals(probability * 100);
    secondaryWinProbability = roundToTwoDecimals((1 - probability) * 100);
  }

  const createScoreDistribution = (team, pointAdjustment) => {
    const mean = roundToTwoDecimals(team.averages.teamAvg + pointAdjustment);
    const standardDeviation = team.averages.stdDev;
    const points =
      team.scoredWeeks === 0
        ? []
        : standardDeviation === 0
          ? [
              { score: roundToTwoDecimals(mean - 0.01), density: 0 },
              { score: mean, density: 1 },
              { score: roundToTwoDecimals(mean + 0.01), density: 0 },
            ]
          : Array.from({ length: 31 }, (_, index) => {
              const score =
                mean -
                3 * standardDeviation +
                (index / 30) * 6 * standardDeviation;
              const zScore = (score - mean) / standardDeviation;
              return {
                score: roundToTwoDecimals(score),
                density:
                  Math.exp(-0.5 * zScore * zScore) /
                  (standardDeviation * Math.sqrt(2 * Math.PI)),
              };
            });
    return { mean, standardDeviation, points };
  };
  const primaryScoreDistribution = createScoreDistribution(
    primaryTeam,
    resolvedPrimarySwap.points,
  );
  const secondaryScoreDistribution = createScoreDistribution(
    secondaryTeam,
    resolvedSecondarySwap.points,
  );

  return success({
    primaryTeam,
    secondaryTeam,
    primaryPowerScore,
    secondaryPowerScore,
    primaryWinProbability,
    secondaryWinProbability,
    scoreDistribution: {
      primary: primaryScoreDistribution,
      secondary: secondaryScoreDistribution,
      selectedWeek: matchupWeek,
      primarySwap: resolvedPrimarySwap.applied,
      secondarySwap: resolvedSecondarySwap.applied,
      primarySwapOptions,
      secondarySwapOptions,
    },
  });
};

module.exports = { calculateTeamAnalysis, calculateTeamComparison };
