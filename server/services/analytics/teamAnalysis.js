const { Players } = require("../../models");
const { getLeagueWeeks } = require("../../util/rosterUtils");
const { success, failure } = require("../../util/result");
const { calculateLineupEfficiency } = require("./lineupEfficiency");
const { calculateLuckIndex } = require("./luckIndex");

const roundToTwoDecimals = (value) => Number(value.toFixed(2));

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
      matchups.flatMap((matchup) =>
        (matchup.players || []).map(normalizePlayerId),
      ),
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
    matchupsByWeek,
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

  const efficiencyResult = calculateLineupEfficiency(
    rosters,
    matchupsByWeek,
    rosterPositions,
    playersById,
    regularSeasonWeeks,
    lastWeek,
  );
  if (efficiencyResult.error) return efficiencyResult;
  const efficiency = efficiencyResult.data.find(
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
  const teamPointsByPosition = new Map();
  const leaguePointsByPosition = new Map();
  const leaguePositionWeekCounts = new Map();

  availableWeeks.forEach((week) => {
    const matchups = matchupsByWeek[String(week)] || [];
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

    const positionPointsByRoster = new Map();
    matchups.forEach((matchup) => {
      if (
        !matchup.players_points ||
        typeof matchup.players_points !== "object"
      ) {
        return;
      }
      Object.entries(matchup.players_points).forEach(([playerId, points]) => {
        if (!Number.isFinite(points)) return;
        const player = playersById[playerId];
        if (!player) return;
        const position = getPlayerPosition(player);
        const rosterPoints =
          positionPointsByRoster.get(String(matchup.rosterId)) || new Map();
        rosterPoints.set(position, (rosterPoints.get(position) || 0) + points);
        positionPointsByRoster.set(String(matchup.rosterId), rosterPoints);
      });
    });
    const selectedPositionPoints =
      positionPointsByRoster.get(String(rosterId)) || new Map();
    selectedPositionPoints.forEach((points, position) => {
      teamPointsByPosition.set(
        position,
        (teamPointsByPosition.get(position) || 0) + points,
      );
    });
    positionPointsByRoster.forEach((positionPoints) => {
      positionPoints.forEach((points, position) => {
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
      const averagePoints = scoredWeeks > 0 ? positionPoints / scoredWeeks : 0;
      const leagueAveragePoints =
        (leaguePointsByPosition.get(position.position) || 0) /
        (leaguePositionWeekCounts.get(position.position) || 1);
      return {
        ...position,
        totalPoints: roundToTwoDecimals(positionPoints),
        averagePoints:
          scoredWeeks > 0 ? roundToTwoDecimals(averagePoints) : null,
        leagueAveragePoints:
          (leaguePositionWeekCounts.get(position.position) || 0) > 0
            ? roundToTwoDecimals(leagueAveragePoints)
            : null,
        vsLeagueAverage:
          scoredWeeks > 0 &&
          (leaguePositionWeekCounts.get(position.position) || 0) > 0
            ? roundToTwoDecimals(averagePoints - leagueAveragePoints)
            : null,
      };
    })
    .sort((a, b) => a.position.localeCompare(b.position));

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
      lineupEfficiencyMetadataWarnings: efficiency?.metadataWarnings ?? [],
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

module.exports = { calculateTeamAnalysis };
