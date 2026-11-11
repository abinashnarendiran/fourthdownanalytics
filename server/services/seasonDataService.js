const DRAFTSTATUS = require("../constants/draftType");
const SCORINGTYPES = require("../constants/scoringTypes");
const WAIVERTYPES = require("../constants/waiverTypes");
const { getLeagueWeeks } = require("../util/rosterUtils");
const {
  getAllMatchups,
  getPlayoffsWinnersBracket,
  getPlayoffsLosersBracket,
} = require("./sleeper");
const { computePowerRankings } = require("./analytics/powerRankings");
const { calculateLuckIndex } = require("./analytics/luckIndex");
const { calculateLineupEfficiency } = require("./analytics/lineupEfficiency");
const { getTeamIdentity } = require("../util/teamIdentity");
const { Players } = require("../models");
const { success, failure } = require("../util/result");

const getPlayersBySleeperId = async (
  matchupsByWeek,
  regularSeasonWeeks,
  throughWeek,
) => {
  const lastWeek = Math.min(regularSeasonWeeks, throughWeek);
  const playerIds = [
    ...new Set(
      Object.entries(matchupsByWeek)
        .filter(([week]) => Number(week) > 0 && Number(week) <= lastWeek)
        .flatMap(([, matchups]) =>
          matchups.flatMap((matchup) =>
            (matchup.players || [])
              .filter((playerId) => {
                if (
                  playerId === undefined ||
                  playerId === null ||
                  String(playerId) === "" ||
                  String(playerId) === "0"
                ) {
                  return false;
                }
                const id = String(playerId);
                const points = matchup.players_points?.[id];
                return Number.isFinite(points) && points > 0;
              })
              .map(String),
          ),
        )
        .filter(Boolean),
    ),
  ];

  if (playerIds.length === 0) return success({ playersById: {} });

  let players;
  try {
    players = await Players.findAll({
      where: { sleeperPlayerId: playerIds },
      attributes: [
        "sleeperPlayerId",
        "position",
        "fantasyPositions",
        "fullName",
      ],
      raw: true,
    });
  } catch (error) {
    return failure(error, 500, "PLAYER_METADATA_QUERY_FAILED");
  }
  const playersById = Object.fromEntries(
    players.map((player) => [player.sleeperPlayerId, player]),
  );
  return success({ playersById });
};

const addSeasonMetrics = async ({
  rankings,
  rosters,
  matchupsByWeek,
  rosterPositions,
  weekSettings,
  throughWeek,
}) => {
  const { regularSeasonWeeks } = getLeagueWeeks(weekSettings);
  const playersResult = await getPlayersBySleeperId(
    matchupsByWeek,
    regularSeasonWeeks,
    throughWeek,
  );
  if (playersResult.error) return playersResult;
  const luckResult = calculateLuckIndex(
    rosters,
    matchupsByWeek,
    regularSeasonWeeks,
    throughWeek,
  );
  if (luckResult.error) return luckResult;

  const efficiencyResult = calculateLineupEfficiency(
    rosters,
    matchupsByWeek,
    rosterPositions,
    playersResult.data.playersById,
    regularSeasonWeeks,
    throughWeek,
  );
  if (efficiencyResult.error) return efficiencyResult;

  const luckByRosterId = new Map(
    luckResult.data.map((result) => [String(result.rosterId), result]),
  );
  const efficiencyByRosterId = new Map(
    efficiencyResult.data.map((result) => [String(result.rosterId), result]),
  );

  const enrichedRankings = [];
  let metricError = null;
  rankings.forEach((ranking) => {
    const luck = luckByRosterId.get(String(ranking.rosterId));
    const efficiency = efficiencyByRosterId.get(String(ranking.rosterId));
    if (!luck || !efficiency) {
      metricError = failure(
        `Missing metric results for roster ${ranking.rosterId}`,
        422,
        "MISSING_METRIC_RESULTS",
      );
      return;
    }

    enrichedRankings.push({
      ...ranking,
      actualWins: luck.actualWins,
      expectedWins: luck.expectedWins,
      luckIndex: luck.luckIndex,
      actualStarterPoints: efficiency.actualStarterPoints,
      optimalStarterPoints: efficiency.optimalStarterPoints,
      lineupEfficiency: efficiency.lineupEfficiency,
      lineupEfficiencyWeeksScored: efficiency.weeksScored,
      lineupEfficiencyWeeksUnscored: efficiency.weeksUnscored,
      lineupEfficiencyWeeksUnavailable: efficiency.weeksUnavailable,
      lineupEfficiencyMetadataWarnings: efficiency.metadataWarnings,
    });
  });
  if (metricError) return metricError;

  return success(enrichedRankings);
};

const completeSeason = async ({
  leagueId,
  rosters,
  users,
  weekSettings,
  rosterPositions,
}) => {
  try {
    // For COMPLETE season, set week to total scoring weeks
    // so that front-end can fetch all matchups
    const [matchupsResult, winnersResult, losersResult] = await Promise.all([
      getAllMatchups(leagueId, weekSettings),
      getPlayoffsWinnersBracket(leagueId),
      getPlayoffsLosersBracket(leagueId),
    ]);
    const failedResult = [matchupsResult, winnersResult, losersResult].find(
      (result) => result.error,
    );
    if (failedResult) return failedResult;
    const matchupsByWeek = matchupsResult.data;
    const winnersBracket = winnersResult.data;
    const losersBracket = losersResult.data;

    const rankingsResult = await computePowerRankings(
      rosters, // Array of all fantasy rosters
      users, // Array of all users
      matchupsByWeek, // Object of matchups, keyed by week
      weekSettings, // Your league's week settings
      winnersBracket, // Playoff winners bracket (champion/runner-up)
      losersBracket, // Playoff losers bracket (last place)
      // currentWeek omitted since season is complete
    );
    if (rankingsResult.error) return rankingsResult;
    const rankings = rankingsResult.data;
    const finalPowerRankingsResult = await addSeasonMetrics({
      rankings,
      rosters,
      matchupsByWeek,
      rosterPositions,
      weekSettings,
      throughWeek: getLeagueWeeks(weekSettings).regularSeasonWeeks,
    });
    if (finalPowerRankingsResult.error) return finalPowerRankingsResult;

    return success({ finalPowerRankings: finalPowerRankingsResult.data });
  } catch (e) {
    console.error("Failed to build completed-season analytics:", e);
    return failure(e, 500, "COMPLETED_SEASON_ANALYTICS_FAILED");
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
    const { playoffWeeks, regularSeasonWeeks } = getLeagueWeeks(config);

    // Map teams for dashboard
    const teams = rosters.map((roster) => {
      const owner = roster.owner || {};
      const coOwners = roster.co_owners || [];

      // Find matching user by display_name
      const user = users.find((u) => u.display_name === owner.display_name);
      const { teamName, owner: ownerName } = getTeamIdentity(roster, user, {
        useRosterMetadata: true,
      });

      return {
        teamName,
        ownerName,
        coOwners: coOwners.map((co) => co.display_name || "Unknown"),
      };
    });

    // Build pre-draft data for dashboard
    return success({
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
      regularSeasonWeeks,
      tradeDeadlineWeek:
        config.tradeDeadline === 99
          ? "No Trade Deadline"
          : config.tradeDeadline,
      wavierType: WAIVERTYPES[config.wavierType],
      leagueType,
    });
  } catch (error) {
    return failure(error, 500, "PREDRAFT_SEASON_DATA_FAILED");
  }
};

const inSeason = async ({
  leagueId,
  rosters,
  users,
  weekSettings,
  rosterPositions,
  currentWeek,
}) => {
  try {
    const matchupsResult = await getAllMatchups(
      leagueId,
      weekSettings,
      currentWeek,
    );
    if (matchupsResult.error) return matchupsResult;
    const matchupsByWeek = matchupsResult.data;
    const { regularSeasonWeeks } = getLeagueWeeks(weekSettings);
    const [winnersResult, losersResult] =
      currentWeek > regularSeasonWeeks
        ? await Promise.all([
            getPlayoffsWinnersBracket(leagueId),
            getPlayoffsLosersBracket(leagueId),
          ])
        : [success([]), success([])];
    const failedBracketResult = [winnersResult, losersResult].find(
      (result) => result.error,
    );
    if (failedBracketResult) return failedBracketResult;
    const winnersBracket = winnersResult.data;
    const losersBracket = losersResult.data;

    // Calculate previous week's rankings for trend indicators (if not Week 1)
    const previousWeekRankingsResult =
      currentWeek > 1
        ? await computePowerRankings(
            rosters,
            users,
            matchupsByWeek,
            weekSettings,
            winnersBracket,
            losersBracket,
            currentWeek - 1,
            null, // no need for trends on previous week calculation
          )
        : success(null);
    if (previousWeekRankingsResult.error) return previousWeekRankingsResult;
    const previousWeekRankings = previousWeekRankingsResult.data;

    // Calculate current week's rankings with trend indicators
    const rankingsResult = await computePowerRankings(
      rosters,
      users,
      matchupsByWeek,
      weekSettings,
      winnersBracket,
      losersBracket,
      currentWeek,
      previousWeekRankings, // pass previous week for trend calculation
    );
    if (rankingsResult.error) return rankingsResult;
    const rankings = rankingsResult.data;

    const powerRankingsResult = await addSeasonMetrics({
      rankings,
      rosters,
      matchupsByWeek,
      rosterPositions,
      weekSettings,
      throughWeek: currentWeek,
    });
    if (powerRankingsResult.error) return powerRankingsResult;

    return success({ powerRankings: powerRankingsResult.data });
  } catch (e) {
    console.error("Failed to build in-season analytics:", e);
    return failure(e, 500, "IN_SEASON_ANALYTICS_FAILED");
  }
  // Current Power Rankings
};

module.exports = {
  addSeasonMetrics,
  completeSeason,
  preDraftSeason,
  inSeason,
};
