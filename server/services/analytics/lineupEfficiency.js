const { assignRosterSlots } = require("../../util/lineupUtils");
const { success, failure } = require("../../util/result");

const getPlayerId = (playerId) => {
  if (playerId === undefined || playerId === null || String(playerId) === "0") {
    return null;
  }
  return String(playerId);
};

const roundToTwoDecimals = (value) => Number(value.toFixed(2));

// Historical reserve/taxi exclusions use the current roster assignment.
const calculateLineupEfficiency = (
  rosters,
  matchupsByWeek,
  rosterPositions,
  playersById,
  regularSeasonWeeks,
  throughWeek = regularSeasonWeeks,
) => {
  const startedAt = Date.now();

  try {
    if (!Array.isArray(rosters) || !matchupsByWeek) {
      return failure(
        "Rosters and weekly matchups are required",
        400,
        "INVALID_LINEUP_EFFICIENCY_INPUT",
      );
    }
    if (!Array.isArray(rosterPositions) || !playersById) {
      return failure(
        "Roster positions and player metadata are required",
        400,
        "INVALID_LINEUP_METADATA",
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
        {
          rosterId: roster.rosterId,
          actualStarterPoints: 0,
          optimalStarterPoints: 0,
          weeksScored: 0,
          weeksUnscored: 0,
        },
      ]),
    );

    const rosterById = new Map(
      rosters.map((roster) => [String(roster.rosterId), roster]),
    );
    let processingError = null;
    const lastWeek = Math.min(regularSeasonWeeks, throughWeek);

    Array.from({ length: lastWeek }, (_, index) => index + 1).forEach(
      (week) => {
        const matchups = matchupsByWeek[String(week)] || [];

        if (matchups.length === 0) return;

        if (matchups.length !== teams.size) {
          processingError = failure(
            `Week ${week} must include exactly one lineup per roster`,
            422,
            "INCOMPLETE_WEEKLY_LINEUPS",
          );
          return;
        }

        const weeklyRosterIds = new Set();
        matchups.forEach((matchup) => {
          const rosterId = String(matchup.rosterId);
          const matchupStartedAt = Date.now();

          try {
            if (!teams.has(rosterId) || weeklyRosterIds.has(rosterId)) {
              processingError = failure(
                `Week ${week} contains an unknown or duplicate roster`,
                422,
                "INVALID_WEEKLY_ROSTER",
              );
              return;
            }
            weeklyRosterIds.add(rosterId);

            if (
              !Array.isArray(matchup.players) ||
              !Array.isArray(matchup.starters) ||
              !matchup.players_points ||
              typeof matchup.players_points !== "object" ||
              Array.isArray(matchup.players_points)
            ) {
              processingError = failure(
                `Week ${week} is missing roster player scores`,
                422,
                "MISSING_ROSTER_PLAYER_SCORES",
              );
              return;
            }

            const playerIds = matchup.players.map(getPlayerId).filter(Boolean);

            const candidatePlayers = playerIds.map((playerId) => {
              const player = playersById[playerId];
              if (!player) {
                processingError = failure(
                  `Missing player metadata for ${playerId}`,
                  422,
                  "MISSING_PLAYER_METADATA",
                );
                return null;
              }

              const positions =
                Array.isArray(player.fantasyPositions) &&
                player.fantasyPositions.length > 0
                  ? player.fantasyPositions
                  : player.position;
              if (
                !positions ||
                (Array.isArray(positions) && positions.length === 0)
              ) {
                processingError = failure(
                  `Missing fantasy position for player ${playerId}`,
                  422,
                  "MISSING_PLAYER_POSITION",
                );
                return null;
              }
              return player;
            });
            if (processingError) return;

            let pointsError = null;
            const pointFor = (playerId) => {
              const id = getPlayerId(playerId);
              if (!id) return 0;

              const points = matchup.players_points?.[id];
              if (!Number.isFinite(points)) {
                pointsError = failure(
                  `Missing or invalid week ${week} points for player ${id}`,
                  422,
                  "INVALID_PLAYER_POINTS",
                );
                return 0;
              }
              return points;
            };

            const actualStarterPoints = matchup.starters.reduce(
              (total, playerId) => total + pointFor(playerId),
              0,
            );
            if (pointsError) {
              processingError = pointsError;
              return;
            }

            const optimalLineupResult = assignRosterSlots(
              {
                players: candidatePlayers,
                starters: rosterById.get(rosterId).starters || [],
                reserve: rosterById.get(rosterId).reserve || [],
                taxi: rosterById.get(rosterId).taxi || [],
              },
              rosterPositions,
              (player) => pointFor(player.sleeperPlayerId),
            );
            if (optimalLineupResult.error) {
              processingError = optimalLineupResult;
              return;
            }
            if (pointsError) {
              processingError = pointsError;
              return;
            }
            const optimalLineup = optimalLineupResult.data;

            const team = teams.get(rosterId);

            if (optimalLineup.totalPoints <= 0) {
              team.weeksUnscored += 1;
            } else {
              team.actualStarterPoints += actualStarterPoints;
              team.optimalStarterPoints += optimalLineup.totalPoints;
              team.weeksScored += 1;
            }
          } catch (error) {
            console.error("Lineup Efficiency matchup failed", {
              week,
              rosterId,
              durationMs: Date.now() - matchupStartedAt,
              error: error.message,
            });
            processingError = failure(
              error,
              500,
              "LINEUP_EFFICIENCY_MATCHUP_FAILED",
            );
          }
        });
      },
    );
    if (processingError) return processingError;

    const results = [...teams.values()].map((team) => ({
      ...team,
      lineupEfficiency:
        team.optimalStarterPoints > 0
          ? roundToTwoDecimals(
              (team.actualStarterPoints / team.optimalStarterPoints) * 100,
            )
          : null,
    }));

    return success(results);
  } catch (error) {
    console.error("Lineup Efficiency calculation failed", {
      durationMs: Date.now() - startedAt,
      error: error.message,
    });
    return failure(error, 500, "LINEUP_EFFICIENCY_FAILED");
  }
};

module.exports = { calculateLineupEfficiency };
