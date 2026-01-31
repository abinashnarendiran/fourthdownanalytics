const { Leagues, FantasyPlatforms } = require("../models");
const {
  getSleeperByLeagueId,
  getNFLState,
  getSleeperRosters,
  getSleeperUsers,
} = require("../services/sleeper"); // adjust path
const {
  completeSeason,
  preDraftSeason,
} = require("../util/getDatabySeasonStatus");

const { enrichRosters, attachUsersToRosters } = require("../util/rosterUtils");

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
    return res.status(500).json({ message: "Error getting league status" });
  }
};

module.exports.getSleeperSeasonData = async (req, res) => {
  try {
    const { userId } = req.user;
    const { id } = req.body; // expecting { id } of the league record
    if (!id) {
      return res.status(400).json({ message: "id is required" });
    }

    // Find league in your DB
    const leagueRecord = await Leagues.findOne({
      where: { id },
      include: [
        {
          model: FantasyPlatforms,
          required: true,
          where: { userId },
        },
      ],
      nest: true,
    });

    if (!leagueRecord) {
      return res
        .status(404)
        .json({ message: "League not found in your system" });
    }

    const { leagueId, seasonYear, config, FantasyPlatform } = leagueRecord;

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

    // Determine league status
    const sleeperStatus = sleeperData.status || "pre_draft";

    if (sleeperStatus === "pre_draft") {
      // Map projections for O(1) lookup
      const preDraftSeasonData = await preDraftSeason({
        leagueId,
        displayName: FantasyPlatform.displayName,
        rosters,
        users,
        config,
        rosterPositions,
        seasonYear,
      });

      if (preDraftSeasonData === null) {
        return res.status(500).json({
          message:
            "We couldn't load the pre draft season data right now. Please try again in a moment.",
        });
      }

      const leagueData = preDraftSeasonData;
      return res.status(200).json({
        status: sleeperStatus,
        league: leagueData,
      });
    }
    if (sleeperStatus === "complete") {
      // For COMPLETE season, set week to total scoring weeks
      // so that front-end can fetch all matchups

      const completeSeasonData = await completeSeason({
        leagueId,
        rosters,
        users,
        weekSettings,
        scoringSettings,
        rosterPositions,
        seasonYear,
      });

      if (completeSeasonData === null) {
        return res.status(500).json({
          message:
            "We couldn't load the complete season data right now.Please try again in a moment.",
        });
      }

      return res.status(200).json({
        status: sleeperStatus,
        league: completeSeasonData,
      });
    }
    // IN SEASON or COMPLETE: fetch matchups & player stats
    /* const matchupsPromises = [];
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
    }); */

    return true;
  } catch (e) {
    return res.status(500).json({
      message: "Error fetching Sleeper season data:",
      error: e.message,
    });
  }
};
