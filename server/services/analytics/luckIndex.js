const { success, failure } = require("../../util/result");

const roundToTwoDecimals = (value) => Number(value.toFixed(2));

const calculateLuckIndex = (
  rosters,
  matchupsByWeek,
  regularSeasonWeeks,
  throughWeek = regularSeasonWeeks,
) => {
  if (!Array.isArray(rosters) || !matchupsByWeek) {
    return failure(
      "Rosters and weekly matchups are required",
      400,
      "INVALID_LUCK_INDEX_INPUT",
    );
  }
  if (!Number.isInteger(regularSeasonWeeks) || regularSeasonWeeks < 0) {
    return failure(
      "regularSeasonWeeks must be a non-negative integer",
      400,
      "INVALID_REGULAR_SEASON_WEEKS",
    );
  }
  if (!Number.isInteger(throughWeek) || throughWeek < 0) {
    return failure(
      "throughWeek must be a non-negative integer",
      400,
      "INVALID_THROUGH_WEEK",
    );
  }

  const teams = new Map(
    rosters.map((roster) => [
      String(roster.rosterId),
      { rosterId: roster.rosterId, actualWins: 0, expectedWins: 0 },
    ]),
  );
  const lastWeek = Math.min(regularSeasonWeeks, throughWeek);
  let calculationError = null;

  Array.from({ length: lastWeek }, (_, index) => index + 1).forEach((week) => {
    if (calculationError) return;
    const matchups = matchupsByWeek[String(week)] || [];
    if (matchups.length === 0) return;

    if (matchups.length !== teams.size) {
      calculationError = failure(
        `Week ${week} must include exactly one matchup score per roster`,
        422,
        "INCOMPLETE_WEEKLY_MATCHUPS",
      );
      return;
    }

    const weeklyTeams = new Map();
    matchups.forEach((matchup) => {
      if (calculationError) return;
      const rosterId = String(matchup.rosterId);
      if (!teams.has(rosterId) || weeklyTeams.has(rosterId)) {
        calculationError = failure(
          `Week ${week} contains an unknown or duplicate roster`,
          422,
          "INVALID_WEEKLY_ROSTER",
        );
        return;
      }
      if (
        !Number.isFinite(matchup.points) ||
        !Number.isFinite(matchup.opponent_points)
      ) {
        calculationError = failure(
          `Week ${week} contains invalid matchup points`,
          422,
          "INVALID_MATCHUP_POINTS",
        );
        return;
      }
      weeklyTeams.set(rosterId, matchup);
    });
    if (calculationError) return;

    if (weeklyTeams.size !== teams.size) {
      calculationError = failure(
        `Week ${week} is missing one or more rosters`,
        422,
        "INCOMPLETE_WEEKLY_ROSTERS",
      );
      return;
    }

    const weeklyScores = [...weeklyTeams.values()];
    weeklyTeams.forEach((matchup, rosterId) => {
      const team = teams.get(rosterId);
      if (matchup.points > matchup.opponent_points) team.actualWins += 1;
      else if (matchup.points === matchup.opponent_points) {
        team.actualWins += 0.5;
      }

      const allPlayWins = weeklyScores.reduce((wins, opponent) => {
        if (String(opponent.rosterId) === rosterId) return wins;
        if (matchup.points > opponent.points) return wins + 1;
        if (matchup.points === opponent.points) return wins + 0.5;
        return wins;
      }, 0);

      team.expectedWins += teams.size > 1 ? allPlayWins / (teams.size - 1) : 0;
    });
  });
  if (calculationError) return calculationError;

  return success(
    [...teams.values()].map(({ rosterId, actualWins, expectedWins }) => ({
      rosterId,
      actualWins,
      expectedWins: roundToTwoDecimals(expectedWins),
      luckIndex: roundToTwoDecimals(actualWins - expectedWins),
    })),
  );
};

module.exports = { calculateLuckIndex };
