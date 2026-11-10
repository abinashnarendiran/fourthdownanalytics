const DRAFTSTATUS = require("../constants/draftType");
const SCORINGTYPES = require("../constants/scoringTypes");
const WAIVERTYPES = require("../constants/waiverTypes");
const {
  getAllMatchups,
  getPlayoffsWinnersBracket,
  getPlayoffsLosersBracket,
} = require("./sleeper");
const { computePowerRankings } = require("./analytics/powerRankings");

const completeSeason = async ({ leagueId, rosters, users, weekSettings }) => {
  try {
    // For COMPLETE season, set week to total scoring weeks
    // so that front-end can fetch all matchups
    const matchupsByWeek = await getAllMatchups(leagueId, weekSettings);

    const winnersBracket = await getPlayoffsWinnersBracket(leagueId);
    const losersBracket = await getPlayoffsLosersBracket(leagueId);

    const finalPowerRankings = computePowerRankings(
      rosters, // Array of all fantasy rosters
      users, // Array of all users
      matchupsByWeek, // Object of matchups, keyed by week
      weekSettings, // Your league's week settings
      winnersBracket, // Playoff winners bracket (champion/runner-up)
      losersBracket, // Playoff losers bracket (last place)
      // currentWeek omitted since season is complete
    );

    return {
      finalPowerRankings,
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
  leagueType,
  rosterPositions,
  seasonYear,
}) => {
  try {
    const playoffTeams = config.playoffTeams || 0;

    let rounds = 0;
    if (playoffTeams > 0) {
      rounds = Math.ceil(Math.log2(playoffTeams));
    }
    const playoffWeeks = rounds * (config.playoffRoundType === 1 ? 2 : 1);

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
      playoffWeeks,
      regularSeasonWeeks: config.playoffWeekStart - 1,
      tradeDeadlineWeek:
        config.tradeDeadline === 99
          ? "No Trade Deadline"
          : config.tradeDeadline,
      wavierType: WAIVERTYPES[config.wavierType],
      leagueType,
    };
  } catch (error) {
    return null;
  }
};

const inSeason = async ({
  leagueId,
  rosters,
  users,
  weekSettings,
  currentWeek,
}) => {
  try {
    const matchupsByWeek = await getAllMatchups(leagueId, weekSettings);
    const winnersBracket = await getPlayoffsWinnersBracket(leagueId);
    const losersBracket = await getPlayoffsLosersBracket(leagueId);
    // Calculate previous week's rankings for trend indicators (if not Week 1)
    const previousWeekRankings =
      currentWeek > 1
        ? computePowerRankings(
            rosters,
            users,
            matchupsByWeek,
            weekSettings,
            winnersBracket,
            losersBracket,
            currentWeek - 1,
            null, // no need for trends on previous week calculation
          )
        : null;

    // Calculate current week's rankings with trend indicators
    const powerRankings = computePowerRankings(
      rosters,
      users,
      matchupsByWeek,
      weekSettings,
      winnersBracket,
      losersBracket,
      currentWeek,
      previousWeekRankings, // pass previous week for trend calculation
    );

    return { powerRankings };
  } catch (e) {
    return null;
  }
  // Current Power Rankings
};

module.exports = { completeSeason, preDraftSeason, inSeason };
