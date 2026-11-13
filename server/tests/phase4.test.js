const assert = require("node:assert/strict");
const { test } = require("node:test");
const { getLeagueWeeks } = require("../util/rosterUtils");
const { getTeamIdentity } = require("../util/teamIdentity");
const { mapSleeperLeague } = require("../util/sleeperLeagueMapper");
const { assignRosterSlots } = require("../util/lineupUtils");
const { computeTeamProjections } = require("../services/analytics/common");
const { calculateOptimalScore } = require("../util/teamAnaylsisHelpersUtil");

test("regular season weeks use playoffWeekStart and playoff rounds remain separate", () => {
  assert.deepEqual(
    getLeagueWeeks({
      playoffWeekStart: 15,
      playoffRoundType: 1,
      playoffTeams: 6,
    }),
    {
      playoffStart: 15,
      regularSeasonWeeks: 14,
      playoffWeeks: 6,
      totalScoringWeeks: 20,
    },
  );
});

test("Sleeper league mapper preserves the integration configuration shape", () => {
  const result = mapSleeperLeague(
    {
      league_id: "league-1",
      name: "League",
      season: "2025",
      total_rosters: 12,
      roster_positions: ["QB", "RB", "WR"],
      scoring_settings: { pass_yd: 0.04 },
      settings: {
        type: 2,
        waiver_type: 1,
        waiver_budget: 100,
        taxi_slots: 2,
        reserve_slots: 1,
        playoff_week_start: 15,
        playoff_type: 0,
        playoff_seed_type: 0,
        playoff_teams: 6,
        playoff_round_type: 1,
        trade_deadline: 12,
      },
    },
    [
      {
        draft_id: "draft-1",
        draft_order: { user: 1 },
        type: "snake",
        settings: { rounds: 15 },
        status: "complete",
        start_time: 123,
        metadata: { scoring_type: "ppr" },
      },
    ],
  );

  assert.equal(result.type, "Dynasty");
  assert.equal(result.seasonYear, 2025);
  assert.deepEqual(result.config.draft, {
    draftId: "draft-1",
    draftOrder: { user: 1 },
    type: "snake",
    rounds: 15,
    status: "complete",
    startTime: 123,
  });
  assert.equal(result.config.playoffWeekStart, 15);
  assert.equal(result.config.playoffRoundType, 1);
});

test("team identity preserves feature-specific fallback behavior", () => {
  const roster = {
    owner: { display_name: "Manager" },
    metadata: { team_name: "Roster Name" },
  };

  assert.deepEqual(getTeamIdentity(roster, null), {
    owner: "Manager",
    teamName: "Team Manager",
  });
  assert.deepEqual(getTeamIdentity(roster, null, { useRosterMetadata: true }), {
    owner: "Manager",
    teamName: "Roster Name",
  });
});

test("slot assignment finds a maximum-score eligible lineup and excludes reserve and taxi", () => {
  const qb = { sleeperPlayerId: "qb", position: "QB", points: 15 };
  const rb = { sleeperPlayerId: "rb", position: "RB", points: 10 };
  const te = { sleeperPlayerId: "te", position: "TE", points: 20 };
  const reserve = { sleeperPlayerId: "reserve", position: "WR", points: 1000 };
  const taxi = { sleeperPlayerId: "taxi", position: "WR", points: 900 };
  const roster = {
    players: [qb, rb, te, reserve, taxi],
    starters: [qb],
    reserve: ["reserve"],
    taxi: ["taxi"],
  };

  const result = assignRosterSlots(
    roster,
    ["QB", "FLEX"],
    (player) => player.points,
  );

  assert.equal(result.error, null);
  assert.equal(result.data.totalPoints, 35);
  assert.deepEqual(
    result.data.assignments.map(({ player, slot }) => [
      player.sleeperPlayerId,
      slot,
    ]),
    [
      ["qb", "QB"],
      ["te", "FLEX"],
    ],
  );
  assert.deepEqual(result.data.unfilledSlots, []);
  assert.deepEqual(result.data.unassignedPlayers, [rb]);
});

test("SUPER_FLEX can reassign a quarterback to maximize the full lineup", () => {
  const players = [
    { sleeperPlayerId: "qb", position: "QB", points: 20 },
    { sleeperPlayerId: "rb", position: "RB", points: 30 },
    { sleeperPlayerId: "wr", position: "WR", points: 28 },
  ];

  const result = assignRosterSlots(
    { players, starters: [], reserve: [], taxi: [] },
    ["QB", "SUPER_FLEX", "FLEX"],
    (player) => player.points,
  );

  assert.equal(result.error, null);
  assert.equal(result.data.totalPoints, 78);
  assert.equal(result.data.assignments.length, 3);
  assert.deepEqual(result.data.unfilledSlots, []);
});

test("team projections remain exported for future use", () => {
  assert.equal(typeof computeTeamProjections, "function");
});

test("legacy score helpers support combined flex slots without treating them as player positions", () => {
  const players = [
    { player_id: "qb1", position: "QB", points: 20 },
    { player_id: "qb2", position: "QB", points: 10 },
    { player_id: "rb", position: "RB", points: 15 },
    { player_id: "wr", position: "WR", points: 12 },
    { player_id: "te", position: "TE", points: 11 },
    { player_id: "lb", position: "LB", points: 8 },
    { player_id: "slot", position: "FLEX", points: 100 },
  ];
  const slots = [
    "QB",
    "SUPER_FLEX",
    "FLEX",
    "REC_FLEX",
    "WRRB_FLEX",
    "IDP_FLEX",
  ];
  const projections = Object.fromEntries(
    players.map((player) => [
      player.player_id,
      { position: player.position, projectedPoints: player.points },
    ]),
  );
  const rankings = computeTeamProjections(
    [{ rosterId: 1, players: players.map((player) => player.player_id) }],
    projections,
    slots,
  );

  assert.equal(calculateOptimalScore(players, slots), 76);
  assert.equal(rankings[0].projectedPoints, 76);
  assert.equal(
    calculateOptimalScore(
      [{ player_id: "qb", position: "QB", points: -2 }],
      ["QB"],
    ),
    -2,
  );
  assert.equal(
    computeTeamProjections(
      [{ rosterId: 1, players: ["qb"] }],
      { qb: { position: "QB", projectedPoints: -2 } },
      ["QB"],
    )[0].projectedPoints,
    -2,
  );
});
