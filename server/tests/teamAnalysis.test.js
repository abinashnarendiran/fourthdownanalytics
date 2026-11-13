const assert = require("node:assert/strict");
const { test } = require("node:test");
const { Players } = require("../models");
const {
  calculateTeamAnalysis,
  calculateTeamComparison,
} = require("../services/analytics/teamAnalysis");

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
      opponent_id: 2,
      points: 100,
      opponent_points: 100,
      players: ["qb1", "rb1"],
      starters: ["qb1", "rb1"],
      players_points: { qb1: 70, rb1: 30 },
    },
    {
      rosterId: 2,
      opponent_id: 1,
      points: 100,
      opponent_points: 100,
      players: ["qb2", "rb2"],
      starters: ["qb2", "rb2"],
      players_points: { qb2: 90, rb2: 10 },
    },
    {
      rosterId: 3,
      opponent_id: 4,
      points: 50,
      opponent_points: 50,
      players: ["qb3", "rb3"],
      starters: ["qb3", "rb3"],
      players_points: { qb3: 40, rb3: 10 },
    },
    {
      rosterId: 4,
      opponent_id: 3,
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
    assert.equal(result.data.team.coaching.coachingIQ, 100);
    assert.equal(result.data.team.coaching.pointsLeft, 0);
    assert.deepEqual(result.data.team.scheduleLuck.distribution, [
      { wins: 0.5, losses: 0.5, count: 1, probability: 33.33 },
      { wins: 1, losses: 0, count: 2, probability: 66.67 },
    ]);
    assert.deepEqual(
      result.data.team.positionalRadar.map((axis) => ({
        position: axis.position,
        team: axis.team,
      })),
      [
        { position: "QB", team: 70 },
        { position: "RB", team: null },
        { position: "WR", team: null },
        { position: "TE", team: null },
        { position: "FLEX", team: 30 },
      ],
    );
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

test("positional radar uses recorded slots and retains negative starter scores", async () => {
  const originalFindAll = Players.findAll;
  Players.findAll = async () =>
    [
      ["q1", "QB"],
      ["a", "RB"],
      ["b", "RB"],
      ["k1", "K"],
      ["q2", "QB"],
      ["d", "RB"],
      ["e", "RB"],
      ["f", "WR"],
      ["k2", "K"],
    ].map(([sleeperPlayerId, position]) => ({
      sleeperPlayerId,
      fullName: sleeperPlayerId,
      position,
      fantasyPositions: [position],
    }));

  const rosters = [
    { rosterId: 1, players: ["q1", "a", "b", "c", "k1"] },
    { rosterId: 2, players: ["q2", "d", "e", "f", "k2"] },
  ];
  const matchupsByWeek = {
    1: [
      {
        rosterId: 1,
        opponent_id: 2,
        points: 23,
        opponent_points: 21,
        players: ["a", "b", "c", "k1"],
        starters: ["0", "a", "k1", "b", "c"],
        players_points: { a: -3, b: 20, c: -2, k1: 8 },
      },
      {
        rosterId: 2,
        opponent_id: 1,
        points: 21,
        opponent_points: 23,
        players: ["q2", "d", "e", "f", "k2"],
        starters: ["q2", "d", "k2", "e", "f"],
        players_points: { q2: 4, d: 6, e: 3, f: 7, k2: 1 },
      },
    ],
    2: [
      {
        rosterId: 1,
        opponent_id: 2,
        points: 16,
        opponent_points: 29,
        players: ["q1", "a", "b", "c", "k1"],
        starters: ["q1", "a", "k1", "b", "c"],
        players_points: { q1: 5, a: 0, b: 4, c: -1, k1: 8 },
      },
      {
        rosterId: 2,
        opponent_id: 1,
        points: 29,
        opponent_points: 16,
        players: ["q2", "d", "e", "f", "k2"],
        starters: ["q2", "d", "k2", "e", "f"],
        players_points: { q2: 6, d: 10, e: 10, f: 2, k2: 1 },
      },
    ],
  };

  try {
    const result = await calculateTeamAnalysis({
      rosters,
      matchupsByWeek,
      rosterId: 1,
      rosterPositions: ["QB", "BN", "RB", "K", "FLEX", "SUPER_FLEX", "IR"],
      weekSettings: { playoffWeekStart: 3, playoffTeams: 0 },
      throughWeek: 2,
    });

    assert.equal(result.error, null);
    assert.deepEqual(result.data.team.positionalRadar, [
      { position: "QB", team: 5, leagueAverage: 5, leagueLeader: 5 },
      { position: "RB", team: -1.5, leagueAverage: 3.25, leagueLeader: 8 },
      { position: "WR", team: null, leagueAverage: null, leagueLeader: null },
      { position: "TE", team: null, leagueAverage: null, leagueLeader: null },
      { position: "FLEX", team: 10.5, leagueAverage: 10.75, leagueLeader: 11 },
    ]);
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
    assert.equal(result.data.team.coaching.coachingIQ, null);
    assert.equal(result.data.team.scheduleLuck.schedulesEvaluated, 0);
    assert.deepEqual(result.data.team.averages.weeklyVsLeague, []);
    assert.equal(result.data.team.positionalOverview.length, 2);
    assert.equal(result.data.team.positionalOverview[0].averagePoints, null);
  } finally {
    Players.findAll = originalFindAll;
  }
});

test("Team Analysis omits incomplete weeks and reports missing-data coverage", async () => {
  const originalFindAll = Players.findAll;
  Players.findAll = async () => playerRows;

  try {
    const result = await calculateTeamAnalysis({
      rosters: rosterData,
      matchupsByWeek: { 1: weeklyMatchups[1].slice(0, 2) },
      rosterId: 1,
      rosterPositions: ["QB", "FLEX"],
      weekSettings: { playoffWeekStart: 2, playoffTeams: 0 },
      throughWeek: 1,
    });

    assert.equal(result.error, null);
    assert.equal(result.data.team.scoredWeeks, 0);
    assert.deepEqual(result.data.team.dataCoverage, {
      requestedWeeks: 1,
      scoredWeeks: 0,
      omittedWeeks: 1,
    });
    assert.equal(result.data.team.winAnalysis.actualWins, 0);
    assert.equal(result.data.team.coaching.coachingIQ, null);
  } finally {
    Players.findAll = originalFindAll;
  }
});

test("Team Analysis keeps score metrics when player scoring data is incomplete", async () => {
  const originalFindAll = Players.findAll;
  Players.findAll = async () => playerRows;
  const matchupsWithMissingPlayerScore = {
    1: weeklyMatchups[1].map((matchup) =>
      matchup.rosterId === 1
        ? {
            ...matchup,
            players_points: { qb1: 70 },
          }
        : matchup,
    ),
  };

  try {
    const result = await calculateTeamAnalysis({
      rosters: rosterData,
      matchupsByWeek: matchupsWithMissingPlayerScore,
      rosterId: 1,
      rosterPositions: ["QB", "FLEX"],
      weekSettings: { playoffWeekStart: 2, playoffTeams: 0 },
      throughWeek: 1,
    });

    assert.equal(result.error, null);
    assert.equal(result.data.team.scoredWeeks, 1);
    assert.equal(result.data.team.coaching.coachingIQ, null);
    assert.equal(result.data.team.coaching.weeksUnavailable, 1);
    assert.match(
      result.data.team.coaching.metadataWarnings[0],
      /incomplete player scores/,
    );
  } finally {
    Players.findAll = originalFindAll;
  }
});

test("Team Analysis ignores missing current reserve and taxi scores for coaching", async () => {
  const originalFindAll = Players.findAll;
  Players.findAll = async () => playerRows;
  const rosters = rosterData.map((roster) =>
    roster.rosterId === 2
      ? {
          ...roster,
          reserve: [{ sleeperPlayerId: "reserve2" }],
          taxi: [{ player_id: 123 }],
        }
      : roster,
  );
  const matchups = weeklyMatchups[1].map((matchup) =>
    matchup.rosterId === 2
      ? {
          ...matchup,
          players: [...matchup.players, "reserve2", 123],
          reserve: [],
          taxi: [],
          players_points: { ...matchup.players_points, 123: null },
        }
      : matchup,
  );

  try {
    const result = await calculateTeamAnalysis({
      rosters,
      matchupsByWeek: { 1: matchups },
      rosterId: 1,
      rosterPositions: ["QB", "FLEX"],
      weekSettings: { playoffWeekStart: 2, playoffTeams: 0 },
      throughWeek: 1,
    });

    assert.equal(result.error, null);
    assert.equal(result.data.team.coaching.coachingIQ, 100);
    assert.equal(result.data.team.coaching.weeksIncluded, 1);
    assert.equal(result.data.team.coaching.weeksUnavailable, 0);
    assert.deepEqual(result.data.team.coaching.metadataWarnings, []);
  } finally {
    Players.findAll = originalFindAll;
  }
});

test("Team Analysis requires scores for active bench players and historical starters", async () => {
  const originalFindAll = Players.findAll;
  Players.findAll = async () => playerRows;

  try {
    await Promise.all(
      [false, true].map(async (historicalStarter) => {
        const rosters = rosterData.map((roster) =>
          roster.rosterId === 2 && historicalStarter
            ? { ...roster, reserve: [{ sleeperPlayerId: "missing2" }] }
            : roster,
        );
        const matchups = weeklyMatchups[1].map((matchup) =>
          matchup.rosterId === 2
            ? {
                ...matchup,
                players: [...matchup.players, "missing2"],
                starters: historicalStarter
                  ? [...matchup.starters, "missing2"]
                  : matchup.starters,
                reserve: ["missing2"],
              }
            : matchup,
        );
        const result = await calculateTeamAnalysis({
          rosters,
          matchupsByWeek: { 1: matchups },
          rosterId: 1,
          rosterPositions: ["QB", "FLEX"],
          weekSettings: { playoffWeekStart: 2, playoffTeams: 0 },
          throughWeek: 1,
        });

        assert.equal(result.error, null);
        assert.equal(result.data.team.coaching.coachingIQ, null);
        assert.equal(result.data.team.coaching.weeksUnavailable, 1);
        assert.match(
          result.data.team.coaching.metadataWarnings[0],
          /incomplete player scores/,
        );
      }),
    );
  } finally {
    Players.findAll = originalFindAll;
  }
});

test("Team comparison returns power scores, positional scores, and projected probabilities", async () => {
  const originalFindAll = Players.findAll;
  Players.findAll = async () => playerRows;

  try {
    const result = await calculateTeamComparison({
      rosters: rosterData,
      matchupsByWeek: weeklyMatchups,
      primaryRosterId: 1,
      secondaryRosterId: 2,
      rosterPositions: ["QB", "FLEX"],
      weekSettings: { playoffWeekStart: 2, playoffTeams: 0 },
      throughWeek: 1,
    });

    assert.equal(result.error, null);
    assert.equal(result.data.primaryTeam.rosterId, 1);
    assert.equal(result.data.secondaryTeam.rosterId, 2);
    assert.equal(result.data.primaryPowerScore, 102.5);
    assert.equal(result.data.secondaryPowerScore, 102.5);
    assert.equal(result.data.primaryWinProbability, 50);
    assert.equal(result.data.secondaryWinProbability, 50);
    assert.equal(result.data.primaryTeam.positionalOverview[0].totalPoints, 70);
    assert.equal(
      result.data.secondaryTeam.positionalOverview[0].totalPoints,
      90,
    );
  } finally {
    Players.findAll = originalFindAll;
  }
});

test("Team comparison applies selected-week starter and bench swaps to score curves", async () => {
  const originalFindAll = Players.findAll;
  const comparisonRosters = rosterData.map((roster) => ({
    ...roster,
    players:
      roster.rosterId === 1
        ? [...roster.players, "wr1"]
        : roster.rosterId === 2
          ? [...roster.players, "wr2"]
          : roster.players,
  }));
  const comparisonMatchups = {
    1: weeklyMatchups[1].map((matchup) => {
      if (matchup.rosterId === 1) {
        return {
          ...matchup,
          players: [...matchup.players, "wr1"],
          players_points: { ...matchup.players_points, wr1: 80 },
        };
      }
      if (matchup.rosterId === 2) {
        return {
          ...matchup,
          players: [...matchup.players, "wr2"],
          players_points: { ...matchup.players_points, wr2: 20 },
        };
      }
      return matchup;
    }),
  };
  Players.findAll = async () => [
    ...playerRows,
    {
      sleeperPlayerId: "wr1",
      fullName: "Wide Receiver One",
      position: "WR",
      fantasyPositions: ["WR"],
    },
    {
      sleeperPlayerId: "wr2",
      fullName: "Wide Receiver Two",
      position: "WR",
      fantasyPositions: ["WR"],
    },
  ];

  try {
    const result = await calculateTeamComparison({
      rosters: comparisonRosters,
      matchupsByWeek: comparisonMatchups,
      primaryRosterId: 1,
      secondaryRosterId: 2,
      rosterPositions: ["QB", "FLEX"],
      weekSettings: { playoffWeekStart: 2, playoffTeams: 0 },
      throughWeek: 1,
      selectedWeek: 1,
      primarySwap: { starterId: "qb1", benchId: "wr1" },
    });

    assert.equal(result.error, null);
    assert.equal(result.data.scoreDistribution.primarySwap.pointsDelta, 10);
    assert.equal(result.data.scoreDistribution.primary.mean, 110);
    assert.equal(result.data.primaryWinProbability, 100);
    assert.equal(
      result.data.scoreDistribution.primarySwapOptions.bench[0].playerId,
      "wr1",
    );
    assert.ok(
      result.data.scoreDistribution.primary.points.some(
        (point) => point.score === 110,
      ),
    );
  } finally {
    Players.findAll = originalFindAll;
  }
});

test("Team comparison rejects the same roster on both sides", async () => {
  const result = await calculateTeamComparison({
    rosters: rosterData,
    matchupsByWeek: weeklyMatchups,
    primaryRosterId: 1,
    secondaryRosterId: 1,
    rosterPositions: ["QB"],
    weekSettings: { playoffWeekStart: 2, playoffTeams: 0 },
    throughWeek: 1,
  });

  assert.equal(result.data, null);
  assert.equal(result.error.code, "DUPLICATE_COMPARISON_ROSTERS");
});
