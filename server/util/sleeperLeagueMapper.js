const leagueTypeMap = {
  0: "Redraft",
  1: "Keeper",
  2: "Dynasty",
};

const mapSleeperLeague = (league, draftData) => {
  const settings = league.settings || {};
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
    type: settings.type != null ? leagueTypeMap[settings.type] : "Unknown",
    config: {
      scoringType,
      totalRosters: league.total_rosters,
      rosterPositions: league.roster_positions,
      scoringSettings: league.scoring_settings,
      draft: draftSettings,
      waiver: {
        type: settings.waiver_type || null,
        budget: settings.waiver_budget || null,
      },
      taxiSlots: settings.taxi_slots || 0,
      IRSlots: settings.reserve_slots || 0,
      playoffWeekStart: settings.playoff_week_start || 15,
      playoffType: settings.playoff_type,
      playoffSeedType: settings.playoff_seed_type,
      playoffTeams: settings.playoff_teams,
      playoffRoundType: settings.playoff_round_type,
      tradeDeadline: settings.trade_deadline,
      wavierType: settings.waiver_type,
    },
  };
};

module.exports = { mapSleeperLeague };
