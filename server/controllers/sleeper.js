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
  inSeason,
} = require("../services/seasonDataService");

const { enrichRosters, attachUsersToRosters } = require("../util/rosterUtils");
const { sendResultError } = require("../util/result");

module.exports.getSleeperLeagueStatus = async (req, res) => {
  try {
    const { id } = req.params; // expecting { id } of the league record
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
    const nflStateResult = await getNFLState();
    if (nflStateResult.error) {
      return sendResultError(res, nflStateResult.error);
    }
    const nflState = nflStateResult.data;

    // NFL info
    const nflWeek = nflState?.display_week ?? null;
    const nflSeason = nflState?.season ?? null;
    const nflSeasonType = nflState?.season_type ?? null;

    // Fetch league info from Sleeper
    const sleeperDataResult = await getSleeperByLeagueId(leagueId);
    if (sleeperDataResult.error) {
      return sendResultError(res, sleeperDataResult.error);
    }
    const sleeperData = sleeperDataResult.data;
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

module.exports.getSleeperLeagueSeasonTeams = async (req, res) => {
  const { userId } = req.user;
  try {
    const { id } = req.params; // expecting { id } of the league record

    if (!id) {
      return res.status(400).json({ message: "id is required" });
    }

    // Find league in your DB by internal ID
    const leagueRecord = await Leagues.findOne({
      where: { id },
      include: [
        {
          model: FantasyPlatforms,
          required: true,
          where: { userId },
        },
      ],
    });

    if (!leagueRecord) {
      return res
        .status(404)
        .json({ message: "League not found in your system" });
    }

    const {
      leagueId,
      FantasyPlatform: { platformUserId },
    } = leagueRecord;

    // Fetch league info from Sleeper
    const sleeperData = await getSleeperByLeagueId(leagueId);
    if (!sleeperData) {
      return res.status(404).json({ message: "League not found on Sleeper" });
    }

    let rosters = await getSleeperRosters(leagueId);
    if (!rosters) rosters = [];
    rosters = await enrichRosters(rosters); // ✅ Enrich with DB data

    const users = await getSleeperUsers(leagueId);

    rosters = attachUsersToRosters(rosters, users);

    const desiredRosterFields = [
      "co_owners",
      "owner",
      "owner_id",
      "rosterId",
      "teamName",
      "settings",
    ];
    rosters = rosters.map((r) => {
      const { settings, ...rest } = r;

      const userIdSleeper = r?.owner?.user_id ?? null;

      const base = Object.fromEntries(
        desiredRosterFields
          .filter((field) => field !== "settings") // ensure settings isn't included
          .map((field) => [field, rest[field]]),
      );

      return {
        ...base,
        user_id: userIdSleeper,
        default: userIdSleeper === platformUserId,
      };
    });
    // Return fantasy-season-only status
    return res.json({
      teams: rosters || [], // null unless fantasy season is active
    });
  } catch (error) {
    console.error("Error in getSleeperLeagueSeasonTeams:", error);
    return res.status(500).json({ message: "Error getting league status" });
  }
};

module.exports.getSleeperPowerRankingsSeasonData = async (req, res) => {
  try {
    const { userId } = req.user;
    const { id, week } = req.body; // expecting { id } of the league record
    if (!id) {
      return res.status(400).json({ message: "League Id is required" });
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

    const { leagueId, seasonYear, config, FantasyPlatform, type } =
      leagueRecord;

    const {
      rosterPositions,
      playoffRoundType,
      playoffWeekStart,
      playoffTeams,
    } = config;

    // These Sleeper resources are independent; fetch them concurrently.
    const [sleeperDataResult, sleeperRostersResult, usersResult] =
      await Promise.all([
        getSleeperByLeagueId(leagueId),
        getSleeperRosters(leagueId),
        getSleeperUsers(leagueId),
      ]);
    const failedResult = [
      sleeperDataResult,
      sleeperRostersResult,
      usersResult,
    ].find((result) => result.error);
    if (failedResult) {
      return sendResultError(res, failedResult.error);
    }
    const sleeperData = sleeperDataResult.data;
    const sleeperRosters = sleeperRostersResult.data;
    const users = usersResult.data;
    if (!sleeperData) {
      return res.status(404).json({ message: "League not found on Sleeper" });
    }

    // Rosters & Users (always fetch)
    const enrichedRostersResult = await enrichRosters(sleeperRosters || []);
    if (enrichedRostersResult.error) {
      return sendResultError(res, enrichedRostersResult.error);
    }
    const rosterUsersResult = attachUsersToRosters(
      enrichedRostersResult.data,
      users,
    );
    if (rosterUsersResult.error) {
      return sendResultError(res, rosterUsersResult.error);
    }
    const rosters = rosterUsersResult.data;

    const weekSettings = { playoffRoundType, playoffWeekStart, playoffTeams };

    // Determine league status
    const sleeperStatus = sleeperData.status || "pre_draft";

    if (sleeperStatus === "pre_draft") {
      // Map projections for O(1) lookup
      const preDraftSeasonResult = await preDraftSeason({
        leagueId,
        displayName: FantasyPlatform.displayName,
        rosters,
        config,
        leagueType: type,
        rosterPositions,
        seasonYear,
      });

      if (preDraftSeasonResult.error) {
        return sendResultError(res, preDraftSeasonResult.error);
      }

      const leagueData = preDraftSeasonResult.data;
      return res.status(200).json({
        status: sleeperStatus,
        league: leagueData,
      });
    }

    if (sleeperStatus === "complete") {
      // For COMPLETE season, set week to total scoring weeks
      // so that front-end can fetch all matchups

      const completeSeasonResult = await completeSeason({
        leagueId,
        rosters,
        users,
        weekSettings,
        rosterPositions,
      });

      if (completeSeasonResult.error) {
        return sendResultError(res, completeSeasonResult.error);
      }

      return res.status(200).json({
        status: sleeperStatus,
        league: completeSeasonResult.data,
      });
    }

    // In Season
    const inSeasonResult = await inSeason({
      leagueId,
      rosters,
      users,
      weekSettings,
      rosterPositions,
      currentWeek: week,
    });

    if (inSeasonResult.error) {
      return sendResultError(res, inSeasonResult.error);
    }
    return res.status(200).json({
      status: sleeperStatus,
      league: inSeasonResult.data,
    });
  } catch (e) {
    return res.status(500).json({
      message: "Error fetching Sleeper season data:",
      error: e.message,
    });
  }
};

module.exports.getSleeperTeamAnalysisSeasonData = async (req, res) => {
  try {
    const { userId } = req.user;
    const { id, week, rosterId, seasonStatus } = req.body;
    if (!id) {
      return res.status(400).json({ message: "League Id is required" });
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

    const { leagueId, config, FantasyPlatform, type, seasonYear } =
      leagueRecord;

    const {
      rosterPositions,
      playoffTeams,
      /* playoffRoundType,
      playoffWeekStart,
      playoffTeams, */
    } = config;

    // Fetch league info from Sleeper
    const sleeperData = await getSleeperByLeagueId(leagueId);
    if (!sleeperData) {
      console.error("Sleeper league not found for leagueId:", leagueId);
      return res.status(404).json({ message: "League not found on Sleeper" });
    }

    let rosters = await getSleeperRosters(leagueId);
    if (!rosters) rosters = [];
    rosters = await enrichRosters(rosters); // ✅ Enrich with DB data

    const users = await getSleeperUsers(leagueId);

    rosters = attachUsersToRosters(rosters, users);

    const weekSettings = { regularSeasonWeeks, rosterPositions };

    let teamAnalysis = null;
    if (seasonStatus === "in_season") {
      teamAnalysis = await inSeasonTeamAnalysis({
        leagueId,
        rosters,
        users,
        weekSettings,
        rosterId,
        currentWeek: week,
        compareTeamId: null, // or a specific team ID to compare against
        playoffTeams,
      });
    } else if (seasonStatus === "complete") {
      teamAnalysis = await completeSeasonTeamAnalysis({
        leagueId,
        rosters,
        users,
        weekSettings,
        rosterId,
        compareTeamId: null,
        seasonYear,
        scoringSettings: config.scoringSettings,
        playoffTeams,
      });
    } else {
      const preDraftSeasonData = await preDraftSeason({
        leagueId,
        displayName: FantasyPlatform.displayName,
        rosters,
        config,
        leagueType: type,
        rosterPositions,
        seasonYear,
      });

      teamAnalysis = preDraftSeasonData;
    }

    if (teamAnalysis === null) {
      return res.status(500).json({
        message:
          "We couldn't load the team analysis data right now. Please try again in a moment.",
      });
    }
    return res.status(200).json({
      teamAnalysis,
    });
  } catch (e) {
    return res.status(500).json({
      message: "Error fetching Sleeper season data:",
      error: e.message,
    });
  }
};
