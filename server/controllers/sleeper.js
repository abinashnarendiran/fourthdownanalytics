const { Leagues, FantasyPlatforms } = require("../models");
const { getSleeperByLeagueId, getNFLState } = require("../services/sleeper"); // adjust path

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

    const { leagueId, seasonYear } = leagueRecord;

    // Fetch NFL state once
    const nflState = await getNFLState();
    console.log("NFL State:", nflState);

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
    res.json({
      seasonYear:leagueSeason, // e.g. 2025
      currentWeek, // null unless fantasy season is active
      leagueStatus: sleeperStatus, // pre_draft | in_season | complete
      seasonFinished
    });
  } catch (error) {
    console.error("Error fetching Sleeper league status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
