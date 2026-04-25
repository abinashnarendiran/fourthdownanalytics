// teamAnalysis.js
const { getSeasonData } = require("./seasonDataCache");
const { computeTeamAnalysis } = require("./metricsUtil");

const completeSeasonTeamAnalysis = async ({
  leagueId,
  rosters,
  users,
  weekSettings,
  rosterId,
  compareTeamId,
  seasonYear,
  scoringSettings,
  playoffTeams,
}) => {
  try {
    const { matchupsByWeek, winnersBracket, losersBracket } =
      await getSeasonData(leagueId, weekSettings);

    const teamAnalysis = computeTeamAnalysis({
      rosters,
      users,
      matchupsByWeek,
      weekSettings,
      winnersBracket,
      losersBracket,
      rosterId,
      week: null, // complete season
      compareTeamId: null, // or null
      seasonYear,
      scoringSettings,
      playoffTeams,
    });

    return teamAnalysis || null;
  } catch (e) {
    return null;
  }
};

const inSeasonTeamAnalysis = async ({
  leagueId,
  rosters,
  users,
  weekSettings,
  rosterId,
  currentWeek,
  compareTeamId,
}) => {
  try {
    const { matchupsByWeek, winnersBracket, losersBracket } =
      await getSeasonData(leagueId, weekSettings);

    const teamAnalysis = computeTeamAnalysis({
      rosters,
      users,
      matchupsByWeek,
      weekSettings,
      winnersBracket,
      losersBracket,
      rosterId,
      currentWeek,
      compareTeamId, // or null
    });

    return teamAnalysis || null;
  } catch (e) {
    return null;
  }
};

// preDraft has no matchup data so team analysis is not applicable

module.exports = { inSeasonTeamAnalysis, completeSeasonTeamAnalysis };
