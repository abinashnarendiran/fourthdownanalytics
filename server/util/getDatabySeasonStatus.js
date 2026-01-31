const DRAFTSTATUS = require("../constants/draftType");
const SCORINGTYPES = require("../constants/scoringTypes");
const WAIVERTYPES = require("../constants/wavierTypes");
const {
  getAllMatchups,
  getPlayoffsWinnersBracket,
  getPlayoffsLosersBracket,
} = require("../services/sleeper"); // adjust path
const {
  computeFinalPowerRankings,
  computeLuckIndex,
  computeLineupEfficiency,
  computeKeyPlayers,
} = require("./metricsUtil");

const completeSeason = async ({
  leagueId,
  rosters,
  users,
  weekSettings,
  scoringSettings,
  rosterPositions,
  seasonYear,
}) => {
  try {
    // For COMPLETE season, set week to total scoring weeks
    // so that front-end can fetch all matchups
    const matchupsByWeek = await getAllMatchups(leagueId, weekSettings);

    const winnersBracket = await getPlayoffsWinnersBracket(leagueId);
    const losersBracket = await getPlayoffsLosersBracket(leagueId);

    const finalPowerRankings = computeFinalPowerRankings(
      rosters,
      users,
      matchupsByWeek,
      weekSettings,
      winnersBracket,
      losersBracket,
    );

    const luckIndex = computeLuckIndex(rosters, users, matchupsByWeek);

    const lineupEfficiency = await computeLineupEfficiency(
      matchupsByWeek,
      rosters,
      users,
      scoringSettings,
      rosterPositions,
      seasonYear,
      true, // complete season flag
    );

    const keyPlayers = await computeKeyPlayers(
      matchupsByWeek,
      rosters,
      users,
      scoringSettings,
      seasonYear,
      weekSettings,
    );

    return {
      matchupsByWeek,
      winnersBracket,
      losersBracket,
      finalPowerRankings,
      luckIndex,
      lineupEfficiency,
      keyPlayers,
    };
  } catch (e) {
    return null;
  }
};

const preDraftSeason = async ({
  leagueId,
  displayName,
  rosters,
  users,
  config,
  rosterPositions,
  seasonYear,
}) => {
  try {
    // Map teams for dashboard
    const teams = rosters.map((roster) => {
      const owner = roster.owner || {};
      const coOwners = roster.co_owners || [];

      // Find matching user by display_name
      const user = users.find((u) => u.display_name === owner.display_name);

      // Team name priority:
      // 1. user.metadata.team_name
      // 2. roster.metadata.team_name
      // 3. fallback
      const teamName =
        user?.metadata?.team_name ||
        roster?.metadata?.team_name ||
        (owner.display_name ? `Team ${owner.display_name}` : "Unknown");

      return {
        teamName,
        ownerName: owner.display_name || "Unknown",
        coOwners: coOwners.map((co) => co.display_name || "Unknown"),
      };
    });

    // Build pre-draft data for dashboard
    return {
      leagueId,
      seasonYear,
      scoringSettings: config.scoringSettings,
      rosterPositions,
      IRSlots: config.IRSlots,
      taxiSlots: config.taxiSlots,
      teams,
      draftType: config.draft.type,
      draftDate: new Date(config.draft.startTime),
      scoringType: SCORINGTYPES[config.scoringType],
      draftComplete: DRAFTSTATUS[config.draft.status],
      draftPosition: (() => {
        // Find the roster for this username
        const roster = rosters.find(
          (r) => r.owner.display_name === displayName,
        );
        if (!roster) return null; // username not found

        // Get draft position from userValues map
        return config?.draft?.draftOrder[roster.owner.user_id] || "N/A";
      })(),
      playoffTeams: config.playoffTeams,
      playoffWeeks: config.playoffWeekStart,
      regularSeasonWeeks: config.playoffWeekStart - 1,
      tradeDeadlineWeek:
        config.tradeDeadline === 99
          ? "No Trade Deadline"
          : config.tradeDeadline,
      wavierType: WAIVERTYPES[config.wavierType],
    };
  } catch (error) {
    return null;
  }
};

module.exports = { completeSeason, preDraftSeason };
