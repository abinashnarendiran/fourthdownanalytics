const DRAFTSTATUS = require("../constants/draftType");
const SCORINGTYPES = require("../constants/scoringTypes");
const WAIVERTYPES = require("../constants/wavierTypes");
const { getSeasonData } = require("./seasonDataCache");
const { computePowerRankings } = require("./metricsUtil");

const completeSeason = async ({ leagueId, rosters, users, weekSettings }) => {
  try {
    const { matchupsByWeek, winnersBracket, losersBracket } =
      await getSeasonData(leagueId, weekSettings);

    const finalPowerRankings = computePowerRankings(
      rosters,
      users,
      matchupsByWeek,
      weekSettings,
      winnersBracket,
      losersBracket,
    );

    return { finalPowerRankings };
  } catch (e) {
    return null;
  }
};

const preDraftSeason = async ({
  leagueId,
  displayName,
  rosters,
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

    const teams = rosters.map((roster) => {
      const owner = roster.owner || {};
      const coOwners = roster.co_owners || [];

      return {
        teamName: roster.teamName,
        ownerName: owner.display_name || "Unknown",
        coOwners: coOwners.map((co) => co.display_name || "Unknown"),
      };
    });

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
        const roster = rosters.find(
          (r) => r.owner.display_name === displayName,
        );
        if (!roster) return null;
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
    const { matchupsByWeek, winnersBracket, losersBracket } =
      await getSeasonData(leagueId, weekSettings);

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
            null,
          )
        : null;

    const powerRankings = computePowerRankings(
      rosters,
      users,
      matchupsByWeek,
      weekSettings,
      winnersBracket,
      losersBracket,
      currentWeek,
      previousWeekRankings,
    );

    return { powerRankings };
  } catch (e) {
    return null;
  }
};

module.exports = { completeSeason, preDraftSeason, inSeason };
