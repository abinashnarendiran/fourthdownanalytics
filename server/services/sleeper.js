const axios = require("axios");
const { Players } = require("../models");
const { getLeagueWeeks } = require("../util/rosterUtils");
const { calculateFantasyPoints } = require("../util/metricsUtil");

const sleeperAPIURL = "https://api.sleeper.app/v1";

const getSleeperUser = async (userName) => {
  try {
    const response = await axios.get(`${sleeperAPIURL}/user/${userName}`);
    return response.data;
  } catch (err) {
    return null;
  }
};

const getSleeperLeagues = async (userId, year) => {
  try {
    const response = await axios.get(
      `${sleeperAPIURL}/user/${userId}/leagues/nfl/${year}`,
    );
    return response.data;
  } catch (err) {
    return null;
  }
};

const getSleeperByLeagueId = async (leagueId) => {
  try {
    const response = await axios.get(`${sleeperAPIURL}/league/${leagueId}`);
    return response.data;
  } catch (err) {
    return null;
  }
};

const getSleeperDraftSettings = async (leagueId) => {
  try {
    const response = await axios.get(
      `${sleeperAPIURL}/league/${leagueId}/drafts`,
    );
    return response.data;
  } catch (err) {
    return null;
  }
};

const getNFLState = async () => {
  try {
    const response = await axios.get(`${sleeperAPIURL}/state/nfl`);
    return response.data;
  } catch (err) {
    return null;
  }
};

const getSleeperPlayers = async () => {
  try {
    const response = await axios.get(`${sleeperAPIURL}/players/nfl`);
    return response.data;
  } catch (err) {
    return null;
  }
};

const getSleeperRosters = async (leagueId) => {
  try {
    const response = await axios.get(
      `${sleeperAPIURL}/league/${leagueId}/rosters`,
    );
    return response.data;
  } catch (err) {
    return null;
  }
};

const getSleeperUsers = async (leagueId) => {
  try {
    const response = await axios.get(
      `${sleeperAPIURL}/league/${leagueId}/users`,
    );
    return response.data;
  } catch (err) {
    return null;
  }
};

const getSleeperWeeklyMatchups = async (leagueId, week) => {
  try {
    const response = await axios.get(
      `${sleeperAPIURL}/league/${leagueId}/matchups/${week}`,
    );
    return response.data;
  } catch (err) {
    return null;
  }
};

const getSleeperAllPlayersStats = async (seasonYear) => {
  try {
    const response = await axios.get(
      `${sleeperAPIURL}/stats/nfl/regular/${seasonYear}`,
    );
    return response.data;
  } catch (err) {
    return null;
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

    const stats = statsRes;

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
      const expectedGames = 17;
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
    return projections;
  } catch (error) {
    console.error("Error building preseason projections:", error);
    return [];
  }
};

const getAllMatchups = async (leagueId, weekSettings) => {
  const { totalScoringWeeks } = getLeagueWeeks(weekSettings);

  const weeks = Array.from({ length: totalScoringWeeks }, (_, i) => i + 1);

  // Fetch and process all weeks in parallel
  const matchupsByWeekEntries = await Promise.all(
    weeks.map(async (week) => {
      try {
        const res = await axios.get(
          `${sleeperAPIURL}/league/${leagueId}/matchups/${week}`,
        );

        // Normalize matchup data
        const matchups = res.data.map((m) => ({
          week,
          matchup_id: m.matchup_id,
          rosterId: m.roster_id,
          points: m.points || 0,
          starters: m.starters || [],
          players: m.players || [],
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

        return [week, updatedMatchups];
      } catch (err) {
        console.warn(`No matchups for week ${week}`);
        return [week, []];
      }
    }),
  );

  // Convert array of [week, matchups] into an object
  const matchupsByWeek = Object.fromEntries(matchupsByWeekEntries);

  return matchupsByWeek;
};
const getPlayoffsWinnersBracket = async (leagueId) => {
  try {
    const response = await axios.get(
      `${sleeperAPIURL}/league/${leagueId}/winners_bracket`,
    );
    return response.data;
  } catch (err) {
    return null;
  }
};

const getPlayoffsLosersBracket = async (leagueId) => {
  try {
    const response = await axios.get(
      `${sleeperAPIURL}/league/${leagueId}/losers_bracket`,
    );
    return response.data;
  } catch (err) {
    return null;
  }
};

module.exports = {
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
