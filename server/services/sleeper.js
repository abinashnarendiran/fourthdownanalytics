const axios = require("axios");
const { Players } = require("../models");
const { getLeagueWeeks } = require("../util/rosterUtils");
const { calculateFantasyPoints } = require("./analytics/common");
const { regularSeasonWeeks } = require("../constants/nflState");
const { success, failure } = require("../util/result");

const sleeperAPIURL = "https://api.sleeper.app/v1";
const sleeperStatsAPIURL = "https://api.sleeper.com";
const sleeperApi = axios.create({ timeout: 15000 });

const getSleeperPlayerRegularSeasonStats = async (
  playerId,
  season,
  grouping,
) => {
  try {
    const response = await sleeperApi.get(
      `${sleeperStatsAPIURL}/stats/nfl/player/${playerId}`,
      {
        params: {
          season,
          season_type: "regular",
          grouping,
        },
      },
    );
    return success(response.data);
  } catch (err) {
    return failure(err, 502, "SLEEPER_STATS_REQUEST_FAILED");
  }
};

const getSleeperPlayerProjectedRegularSeasonStats = async (
  playerId,
  season,
  grouping,
) => {
  try {
    const response = await sleeperApi.get(
      `${sleeperStatsAPIURL}/projections/nfl/player/${playerId}`,
      {
        params: {
          season,
          season_type: "regular",
          grouping,
        },
      },
    );
    return success(response.data);
  } catch (err) {
    return failure(err, 502, "SLEEPER_PROJECTIONS_REQUEST_FAILED");
  }
};

const getSleeperUser = async (userName) => {
  try {
    const response = await sleeperApi.get(`${sleeperAPIURL}/user/${userName}`);
    return success(response.data);
  } catch (err) {
    return failure(err, 502, "SLEEPER_USER_REQUEST_FAILED");
  }
};

const getSleeperLeagues = async (userId, year) => {
  try {
    const response = await sleeperApi.get(
      `${sleeperAPIURL}/user/${userId}/leagues/nfl/${year}`,
    );
    return success(response.data);
  } catch (err) {
    return failure(err, 502, "SLEEPER_LEAGUES_REQUEST_FAILED");
  }
};

const getSleeperByLeagueId = async (leagueId) => {
  try {
    const response = await sleeperApi.get(
      `${sleeperAPIURL}/league/${leagueId}`,
    );
    return success(response.data);
  } catch (err) {
    if (err.response?.status === 404) {
      return failure(
        "League not found on Sleeper",
        404,
        "SLEEPER_LEAGUE_NOT_FOUND",
      );
    }
    return failure(err, 502, "SLEEPER_LEAGUE_REQUEST_FAILED");
  }
};

const getSleeperDraftSettings = async (leagueId) => {
  try {
    const response = await sleeperApi.get(
      `${sleeperAPIURL}/league/${leagueId}/drafts`,
    );
    return success(response.data);
  } catch (err) {
    return failure(err, 502, "SLEEPER_DRAFT_REQUEST_FAILED");
  }
};

const getNFLState = async () => {
  try {
    const response = await sleeperApi.get(`${sleeperAPIURL}/state/nfl`);
    return success(response.data);
  } catch (err) {
    return failure(err, 502, "SLEEPER_NFL_STATE_REQUEST_FAILED");
  }
};

const getSleeperPlayers = async () => {
  try {
    const response = await sleeperApi.get(`${sleeperAPIURL}/players/nfl`);
    return success(response.data);
  } catch (err) {
    return failure(err, 502, "SLEEPER_PLAYERS_REQUEST_FAILED");
  }
};

const getSleeperRosters = async (leagueId) => {
  try {
    const response = await sleeperApi.get(
      `${sleeperAPIURL}/league/${leagueId}/rosters`,
    );
    return success(response.data);
  } catch (err) {
    return failure(err, 502, "SLEEPER_ROSTERS_REQUEST_FAILED");
  }
};

const getSleeperUsers = async (leagueId) => {
  try {
    const response = await sleeperApi.get(
      `${sleeperAPIURL}/league/${leagueId}/users`,
    );
    return success(response.data);
  } catch (err) {
    return failure(err, 502, "SLEEPER_USERS_REQUEST_FAILED");
  }
};

const getSleeperWeeklyMatchups = async (leagueId, week) => {
  try {
    const response = await sleeperApi.get(
      `${sleeperAPIURL}/league/${leagueId}/matchups/${week}`,
    );
    return success(response.data);
  } catch (err) {
    return failure(err, 502, "SLEEPER_MATCHUPS_REQUEST_FAILED");
  }
};

const getSleeperAllPlayersStats = async (seasonYear) => {
  try {
    const response = await sleeperApi.get(
      `${sleeperAPIURL}/stats/nfl/regular/${seasonYear}`,
    );
    return success(response.data);
  } catch (err) {
    return failure(err, 502, "SLEEPER_ALL_STATS_REQUEST_FAILED");
  }
};

const getPreseasonProjections = async (seasonYear, scoringSettings) => {
  try {
    const LAST_SEASON = seasonYear - 1; // adjust dynamically later

    // 1️⃣ Fetch all players
    const players = await Players.findAll({
      attributes: [
        "sleeperPlayerId",
        "firstName",
        "lastName",
        "team",
        "fantasyPositions",
      ],
      raw: true,
      nest: true,
    });

    const playersMap = {};
    players.forEach((p) => {
      playersMap[p.sleeperPlayerId] = {
        first_name: p.firstName,
        last_name: p.lastName,
        team: p?.team || null,
        fantasy_positions: p.fantasyPositions,
      };
    });
    const statsRes = await getSleeperAllPlayersStats(LAST_SEASON);
    if (statsRes.error) return statsRes;

    const stats = statsRes.data;

    const projections = [];

    /**
     * 3️⃣ Build projections
     */
    Object.entries(stats).forEach(([playerId, stat]) => {
      const player = playersMap[playerId];

      if (!player || !stat) return;
      if (!player.fantasy_positions?.length) return;

      const gamesPlayed = stat.gp || 0;
      const fantasyPoints = calculateFantasyPoints(stat, scoringSettings);

      // Remove small sample noise
      if (gamesPlayed < 4) return;

      const ppg = fantasyPoints / gamesPlayed;
      const expectedGames = regularSeasonWeeks;
      const regressionFactor = 0.9;
      const projectedPoints = ppg * expectedGames * regressionFactor;

      projections.push({
        player_id: playerId,
        name: `${player.first_name} ${player.last_name}`,
        position: player.fantasy_positions[0],
        team: player.team,
        lastSeasonPoints: fantasyPoints,
        gamesPlayed,
        projectedPoints: Number(projectedPoints.toFixed(2)),
      });
    });

    /**
     * 4️⃣ Sort by projected points
     */

    projections.sort((a, b) => b.projectedPoints - a.projectedPoints);
    return success(projections);
  } catch (error) {
    console.error("Error building preseason projections:", error);
    return failure(error, 500, "PRESEASON_PROJECTIONS_FAILED");
  }
};

const getAllMatchups = async (leagueId, weekSettings, throughWeek = null) => {
  try {
    if (!leagueId || !weekSettings || typeof weekSettings !== "object") {
      return failure(
        "League ID and week settings are required",
        400,
        "INVALID_MATCHUP_REQUEST",
      );
    }

    const { totalScoringWeeks } = getLeagueWeeks(weekSettings);
    const lastWeek =
      throughWeek === null
        ? totalScoringWeeks
        : Math.min(totalScoringWeeks, Number(throughWeek));
    if (!Number.isInteger(lastWeek) || lastWeek < 0) {
      return failure(
        "throughWeek must be a non-negative integer",
        400,
        "INVALID_THROUGH_WEEK",
      );
    }
    const weeks = Array.from({ length: lastWeek }, (_, i) => i + 1);

    // Fetch and process all weeks in parallel
    const matchupsByWeekEntries = await Promise.all(
      weeks.map(async (week) => {
        try {
          const res = await sleeperApi.get(
            `${sleeperAPIURL}/league/${leagueId}/matchups/${week}`,
          );

          // Normalize matchup data
          const matchups = res.data.map((m) => ({
            week,
            matchup_id: m.matchup_id,
            rosterId: m.roster_id,
            points: m.points,
            starters: m.starters,
            players: m.players,
            players_points: m.players_points,
            reserve: m.reserve,
            taxi: m.taxi,
          }));

          // Attach opponent info in an immutable way
          const grouped = matchups.reduce((acc, m) => {
            if (!acc[m.matchup_id]) acc[m.matchup_id] = [];
            acc[m.matchup_id].push(m);
            return acc;
          }, {});

          const updatedMatchups = Object.values(grouped).flatMap(
            ([teamA, teamB]) => {
              if (!teamA || !teamB) return [];

              const updatedA = {
                ...teamA,
                opponent_id: teamB.rosterId,
                opponent_points: teamB.points,
              };

              const updatedB = {
                ...teamB,
                opponent_id: teamA.rosterId,
                opponent_points: teamA.points,
              };

              return [updatedA, updatedB];
            },
          );

          return success([week, updatedMatchups]);
        } catch (err) {
          return failure(err, 502, "SLEEPER_WEEK_MATCHUPS_REQUEST_FAILED");
        }
      }),
    );

    const failedWeek = matchupsByWeekEntries.find((result) => result.error);
    if (failedWeek) return failedWeek;

    // Convert array of [week, matchups] into an object
    const matchupsByWeek = Object.fromEntries(
      matchupsByWeekEntries.map((result) => result.data),
    );

    return success(matchupsByWeek);
  } catch (error) {
    return failure(error, 500, "SLEEPER_MATCHUPS_PROCESSING_FAILED");
  }
};
const getPlayoffsWinnersBracket = async (leagueId) => {
  try {
    const response = await sleeperApi.get(
      `${sleeperAPIURL}/league/${leagueId}/winners_bracket`,
    );
    return success(response.data);
  } catch (err) {
    return failure(err, 502, "SLEEPER_WINNERS_BRACKET_REQUEST_FAILED");
  }
};

const getPlayoffsLosersBracket = async (leagueId) => {
  try {
    const response = await sleeperApi.get(
      `${sleeperAPIURL}/league/${leagueId}/losers_bracket`,
    );
    return success(response.data);
  } catch (err) {
    return failure(err, 502, "SLEEPER_LOSERS_BRACKET_REQUEST_FAILED");
  }
};

module.exports = {
  getSleeperPlayerProjectedRegularSeasonStats,
  getSleeperPlayerRegularSeasonStats,
  getSleeperUser,
  getSleeperLeagues,
  getSleeperDraftSettings,
  getSleeperByLeagueId,
  getNFLState,
  getSleeperPlayers,
  getSleeperRosters,
  getSleeperUsers,
  getSleeperWeeklyMatchups,
  getPreseasonProjections,
  getSleeperAllPlayersStats,
  getAllMatchups,
  getPlayoffsWinnersBracket,
  getPlayoffsLosersBracket,
};
