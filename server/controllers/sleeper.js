const { Leagues } = require("../models");
const {
  getSleeperByLeagueId,
  getNFLState,
  getSleeperRosters,
  getSleeperUsers,
  getSleeperWeeklyMatchups,
  getPreseasonProjections,
  getAllMatchups,
  getPlayoffsWinnersBracket,
  getPlayoffsLosersBracket,
} = require("../services/sleeper"); // adjust path

const {
  computeLeagueAverages,
  computeTeamProjections,
  computeFinalPowerRankings,
  computeLuckIndex,
  computeLineupEfficiency,
} = require("../util/metricsUtil");
const {
  enrichRosters,
  attachUsersToRosters,
  getLeagueWeeks,
} = require("../util/rosterUtils");

module.exports.getSleeperLeagueStatus = async (req, res) => {
  try {
    const { id } = req.body; // expecting { id } of the league record
    if (!id) {
      return res.status(400).json({ message: "id is required" });
    }

    // Find league in your DB by internal ID
    const leagueRecord = await Leagues.findOne({ where: { id } });
    if (!leagueRecord) {
      return res
        .status(404)
        .json({ message: "League not found in your system" });
    }

    const { leagueId } = leagueRecord;

    // Fetch NFL state once
    const nflState = await getNFLState();

    // NFL info
    const nflWeek = nflState?.display_week ?? null;
    const nflSeason = nflState?.season ?? null;
    const nflSeasonType = nflState?.season_type ?? null;

    // Fetch league info from Sleeper
    const sleeperData = await getSleeperByLeagueId(leagueId);
    if (!sleeperData) {
      return res.status(404).json({ message: "League not found on Sleeper" });
    }

    // Fantasy league info
    const leagueSeason = sleeperData.season;
    const sleeperStatus = sleeperData.status || "not_started";

    // Fantasy season finished?
    const seasonFinished = sleeperStatus === "complete";

    // ✅ Determine current fantasy week (CORRECT)
    let currentWeek = null;

    if (
      sleeperStatus === "in_season" &&
      nflSeasonType === "regular" &&
      leagueSeason === nflSeason
    ) {
      currentWeek = nflWeek;
    }

    // Return fantasy-season-only status
    return res.json({
      seasonYear: leagueSeason, // e.g. 2025
      currentWeek, // null unless fantasy season is active
      leagueStatus: sleeperStatus, // pre_draft | in_season | complete
      seasonFinished,
    });
  } catch (error) {
    console.error("Error fetching Sleeper league status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.getSleeperCompleteSeasonData = async (req, res) => {
  try {
    const { id } = req.body; // expecting { id } of the league record
    if (!id) {
      return res.status(400).json({ message: "id is required" });
    }

    // Find league in your DB
    const leagueRecord = await Leagues.findOne({ where: { id } });
    if (!leagueRecord) {
      return res
        .status(404)
        .json({ message: "League not found in your system" });
    }

    const { leagueId, seasonYear, config } = leagueRecord;

    const {
      scoringSettings,
      rosterPositions,
      playoffRoundType,
      playoffWeekStart,
      playoffTeams,
    } = config;

    // Fetch league info from Sleeper
    const sleeperData = await getSleeperByLeagueId(leagueId);
    if (!sleeperData) {
      return res.status(404).json({ message: "League not found on Sleeper" });
    }

    // Rosters & Users (always fetch)

    let rosters = await getSleeperRosters(leagueId);
    if (!rosters) rosters = [];
    rosters = await enrichRosters(rosters); // ✅ Enrich with DB data

    const users = await getSleeperUsers(leagueId);

    rosters = attachUsersToRosters(rosters, users);

    const weekSettings = { playoffRoundType, playoffWeekStart, playoffTeams };

    const { totalScoringWeeks } = getLeagueWeeks(weekSettings);

    // Determine league status
    const sleeperStatus = sleeperData.status || "pre_draft";

    let matchups = [];

    if (sleeperStatus === "pre_draft") {
      const projectedPlayers = await getPreseasonProjections(
        seasonYear,
        scoringSettings,
      );

      // Map projections for O(1) lookup
      const projectedPlayersMap = {};
      projectedPlayers.forEach((p) => {
        projectedPlayersMap[p.player_id] = p;
      });

      const leagueAverages = computeLeagueAverages(projectedPlayers);

      const projectedPowerRankings = computeTeamProjections(
        rosters,
        projectedPlayersMap,
        rosterPositions,
      );

      return res.status(200).json({
        status: sleeperStatus,
        league: sleeperData,
        rosters,
        users,
        preseason: {
          leagueAverages,
          projectedPowerRankings,
        },
      });
    }
    if (sleeperStatus === "complete") {
      // For COMPLETE season, set week to total scoring weeks
      // so that front-end can fetch all matchups

      const matchupsByWeek = await getAllMatchups(leagueId, weekSettings);

      const winnersBracket = await getPlayoffsWinnersBracket(leagueId);
      const losersBracket = await getPlayoffsLosersBracket(leagueId);
      const finalPowerRankings = computeFinalPowerRankings(
        rosters,
        matchupsByWeek,
        weekSettings,
        winnersBracket,
        losersBracket,
      );
      const luckIndex = await computeLuckIndex(rosters, matchupsByWeek);

      const lineupEfficiency = await computeLineupEfficiency(
        matchupsByWeek,
        rosters,
        sleeperData.scoring_settings,
        rosterPositions,
        seasonYear,
        true,
      );

      return res.status(200).json({
        status: sleeperStatus,
        league: sleeperData,
        finalPowerRankings,
        luckIndex,
        lineupEfficiency,
        users,
        rosters,
      });
    }
    // IN SEASON or COMPLETE: fetch matchups & player stats
    const matchupsPromises = [];
    for (let w = 1; w <= totalScoringWeeks; w += 1) {
      matchupsPromises.push(
        getSleeperWeeklyMatchups(leagueId, w).then((data) => ({
          week: w,
          data,
        })),
      );
    }
    matchups = await Promise.all(matchupsPromises);

    // Return structured data
    return res.status(200).json({
      status: sleeperStatus,
      league: sleeperData,
      rosters,
      users,
      matchups,
    });
  } catch (error) {
    console.error("Error fetching Sleeper season data:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
