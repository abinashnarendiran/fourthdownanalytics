const assert = require("node:assert/strict");
const { test } = require("node:test");
const { Players } = require("../models");
const { calculateTeamAnalysis } = require("../services/analytics/teamAnalysis");

const rosterData = [
  {
    rosterId: 1,
    players: ["qb1", "rb1"],
    reserve: [],
    taxi: [],
    owner: { display_name: "Manager One" },
  },
  { rosterId: 2, players: ["qb2", "rb2"], reserve: [], taxi: [] },
  { rosterId: 3, players: ["qb3", "rb3"], reserve: [], taxi: [] },
  { rosterId: 4, players: ["qb4", "rb4"], reserve: [], taxi: [] },
];

const weeklyMatchups = {
  1: [
    {
      rosterId: 1,
      points: 100,
      opponent_points: 100,
      players: ["qb1", "rb1"],
      starters: ["qb1", "rb1"],
      players_points: { qb1: 70, rb1: 30 },
    },
    {
      rosterId: 2,
      points: 100,
      opponent_points: 100,
      players: ["qb2", "rb2"],
      starters: ["qb2", "rb2"],
      players_points: { qb2: 90, rb2: 10 },
    },
    {
      rosterId: 3,
      points: 50,
      opponent_points: 50,
      players: ["qb3", "rb3"],
      starters: ["qb3", "rb3"],
      players_points: { qb3: 40, rb3: 10 },
    },
    {
      rosterId: 4,
      points: 50,
      opponent_points: 50,
      players: ["qb4", "rb4"],
      starters: ["qb4", "rb4"],
      players_points: { qb4: 35, rb4: 15 },
    },
  ],
};

const playerRows = [
  ...["qb1", "qb2", "qb3", "qb4"].map((sleeperPlayerId, index) => ({
    sleeperPlayerId,
    fullName: `Quarterback ${index + 1}`,
    position: "QB",
    fantasyPositions: ["QB"],
    team: "NFL",
    status: "Active",
  })),
  ...["rb1", "rb2", "rb3", "rb4"].map((sleeperPlayerId, index) => ({
    sleeperPlayerId,
    fullName: `Running Back ${index + 1}`,
    position: "RB",
    fantasyPositions: ["RB"],
    team: "NFL",
    status: "Active",
  })),
];

test("Team Analysis returns fractional all-play wins and player-based positional scoring", async () => {
  const originalFindAll = Players.findAll;
  Players.findAll = async () => playerRows;

  try {
    const result = await calculateTeamAnalysis({
      rosters: rosterData,
      matchupsByWeek: weeklyMatchups,
      rosterId: 1,
      rosterPositions: ["QB", "FLEX"],
      weekSettings: { playoffWeekStart: 2, playoffTeams: 0 },
      throughWeek: 1,
    });

    assert.equal(result.error, null);
    assert.equal(result.data.team.winAnalysis.actualWins, 0.5);
    assert.equal(result.data.team.winAnalysis.expectedWins, 0.83);
    assert.equal(result.data.team.luck.luckIndex, -0.33);
    assert.equal(result.data.team.averages.weeklyVsLeague[0].week, 1);
    assert.equal(result.data.team.averages.weeklyVsLeague[0].teamPoints, 100);
    assert.deepEqual(
      result.data.team.positionalOverview.map((position) => ({
        position: position.position,
        rosterCount: position.rosterCount,
        totalPoints: position.totalPoints,
        leagueAveragePoints: position.leagueAveragePoints,
      })),
      [
        {
          position: "QB",
          rosterCount: 1,
          totalPoints: 70,
          leagueAveragePoints: 58.75,
        },
        {
          position: "RB",
          rosterCount: 1,
          totalPoints: 30,
          leagueAveragePoints: 16.25,
        },
      ],
    );
    assert.equal(
      result.data.team.positionalOverview[0].players[0].name,
      "Quarterback 1",
    );
  } finally {
    Players.findAll = originalFindAll;
  }
});

test("Team Analysis returns roster details and zero metrics before matchups exist", async () => {
  const originalFindAll = Players.findAll;
  Players.findAll = async () => playerRows;

  try {
    const result = await calculateTeamAnalysis({
      rosters: rosterData,
      matchupsByWeek: {},
      rosterId: 1,
      rosterPositions: ["QB"],
      weekSettings: { playoffWeekStart: 2, playoffTeams: 0 },
      throughWeek: 1,
    });

    assert.equal(result.error, null);
    assert.equal(result.data.team.winAnalysis.expectedWins, 0);
    assert.equal(result.data.team.luck.luckIndex, 0);
    assert.deepEqual(result.data.team.averages.weeklyVsLeague, []);
    assert.equal(result.data.team.positionalOverview.length, 2);
    assert.equal(result.data.team.positionalOverview[0].averagePoints, null);
  } finally {
    Players.findAll = originalFindAll;
  }
});
