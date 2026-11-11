const leagueTypeMap = {
  0: "Redraft",
  1: "Keeper",
  2: "Dynasty",
};

const mapSleeperLeague = (league, draftData) => {
  const draftSettings = {
    draftId: "",
    type: null,
    rounds: null,
    status: null,
    startTime: null,
    draftOrder: {},
  };
  let scoringType = "Unknown";

  if (Array.isArray(draftData) && draftData.length === 1) {
    draftSettings.draftId = draftData[0]?.draft_id || "";
    draftSettings.draftOrder = draftData[0]?.draft_order || {};
    draftSettings.type = draftData[0]?.type || "Unknown";
    draftSettings.rounds = draftData[0]?.settings?.rounds ?? null;
    draftSettings.status = draftData[0]?.status ?? null;
    draftSettings.startTime = draftData[0]?.start_time ?? null;
    scoringType = draftData[0]?.metadata?.scoring_type || "Unknown";
  }

  return {
    leagueId: league.league_id,
    leagueName: league.name,
    seasonYear: parseInt(league.season, 10),
    type:
      league.settings?.type != null
        ? leagueTypeMap[league.settings.type]
        : "Unknown",
    config: {
      scoringType,
      totalRosters: league.total_rosters,
      rosterPositions: league.roster_positions,
      scoringSettings: league.scoring_settings,
      draft: draftSettings,
      waiver: {
        type: league.settings?.waiver_type || null,
        budget: league.settings?.waiver_budget || null,
      },
      taxiSlots: league.settings?.taxi_slots || 0,
      IRSlots: league.settings?.reserve_slots || 0,
      playoffWeekStart: league.settings.playoff_week_start || 15,
      playoffType: league.settings.playoff_type,
      playoffSeedType: league.settings.playoff_seed_type,
      playoffTeams: league.settings.playoff_teams,
      playoffRoundType: league.settings.playoff_round_type,
      tradeDeadline: league.settings.trade_deadline,
      wavierType: league.settings.waiver_type,
    },
  };
};

module.exports = { mapSleeperLeague };
