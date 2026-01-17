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
      return res.status(404).json({ message: "League not found in your system" });
    }

    const { leagueId, seasonYear } = leagueRecord;

    // Fetch NFL state once
    const nflState = await getNFLState();
    const currentWeek = nflState?.week || null;
    const currentSeason = nflState?.season || null;

    // Fetch league info from Sleeper
    const sleeperData = await getSleeperByLeagueId(leagueId);
    if (!sleeperData) {
      return res.status(404).json({ message: "League not found on Sleeper" });
    }

    const status = sleeperData.status || null;
    const leagueSeason = sleeperData.season || seasonYear;

    // Determine if season is finished
    const isSeasonFinished = status === "complete";

    // Determine current week only if league year matches NFL current season
    const week = leagueSeason === currentSeason ? currentWeek : null;

    // Return the league status
    res.json({
      id,                  // internal DB id
      leagueId,            // Sleeper league id
      seasonYear: leagueSeason,
      sleeperStatus: status,
      isSeasonFinished,
      currentWeek: week,
    });

  } catch (error) {
    console.error("Error fetching Sleeper league status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
