import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, test } from "vitest";

const require = createRequire(import.meta.url);
const sequelize = require("../config/db");
const {
  FantasyPlatforms,
  Jobs,
  Leagues,
  PlayerWeekProjections,
  PlayerWeekStats,
  Players,
  Users,
} = require("../models");

const databaseName = sequelize.config.database;
const expectedDatabaseName = process.env.DB_TEST_NAME || "fantasy_test";

if (
  databaseName !== expectedDatabaseName ||
  !/_test$/i.test(databaseName) ||
  databaseName === process.env.DB_NAME
) {
  throw new Error(
    "Database integration tests require the dedicated *_test database selected by DB_TEST_NAME.",
  );
}

beforeAll(async () => {
  await sequelize.authenticate();
  await sequelize.sync();
});

afterAll(async () => {
  await sequelize.close();
});

test("User, FantasyPlatform, and League rows persist and load through associations", async () => {
  const token = randomUUID();
  const email = `vitest-${token}@example.test`;
  const leagueId = `vitest-${token}`;
  let userId;
  let fantasyPlatformId;

  try {
    const user = await Users.create({
      email,
      name: "Vitest User",
      password: "test-password-hash",
    });
    userId = user.userId;

    const platform = await FantasyPlatforms.create({
      userId,
      provider: "Sleeper",
      platformUserId: `sleeper-${token}`,
      username: `vitest-${token}`,
      displayName: "Vitest Manager",
    });
    fantasyPlatformId = platform.fantasyPlatformId;
    const league = await Leagues.create({
      fantasyPlatformId,
      leagueId,
      leagueName: "Vitest Integration League",
      seasonYear: 2025,
      type: "Dynasty",
      config: { rosterPositions: ["QB", "FLEX"] },
    });

    const loadedUser = await Users.findByPk(userId, {
      include: [
        {
          model: FantasyPlatforms,
          include: [Leagues],
        },
      ],
    });

    expect(loadedUser.email).toBe(email);
    expect(loadedUser.FantasyPlatforms).toHaveLength(1);
    expect(loadedUser.FantasyPlatforms[0].fantasyPlatformId).toBe(
      platform.fantasyPlatformId,
    );
    expect(loadedUser.FantasyPlatforms[0].Leagues).toHaveLength(1);
    expect(loadedUser.FantasyPlatforms[0].Leagues[0].id).toBe(league.id);
    expect(loadedUser.FantasyPlatforms[0].Leagues[0].config).toEqual({
      rosterPositions: ["QB", "FLEX"],
    });

    const invalidUserId = -(
      Number.parseInt(token.replace(/-/g, "").slice(0, 6), 16) + 1
    );
    await expect(
      FantasyPlatforms.create({
        userId: invalidUserId,
        provider: "Sleeper",
        username: `orphan-${token}`,
      }),
    ).rejects.toMatchObject({ name: "SequelizeForeignKeyConstraintError" });

    await expect(
      Leagues.create({
        fantasyPlatformId: randomUUID(),
        leagueId: `orphan-${token}`,
        leagueName: "Orphan League",
        seasonYear: 2025,
      }),
    ).rejects.toMatchObject({ name: "SequelizeForeignKeyConstraintError" });
  } finally {
    if (userId !== undefined) {
      await Leagues.destroy({ where: { leagueId } });
      await FantasyPlatforms.destroy({ where: { userId } });
      await Users.destroy({ where: { userId } });
    }
  }

  expect(await Users.findOne({ where: { email } })).toBeNull();
  expect(await Leagues.findOne({ where: { leagueId } })).toBeNull();
  if (fantasyPlatformId) {
    expect(await FantasyPlatforms.findByPk(fantasyPlatformId)).toBeNull();
  }
});

test("Player rows load related stats and projections and reject orphan children", async () => {
  const token = randomUUID();
  const sleeperPlayerId = `vitest-${token}`;
  let playerId;

  try {
    const player = await Players.create({
      sleeperPlayerId,
      firstName: "Vitest",
      lastName: "Player",
      position: "QB",
      fantasyPositions: ["QB"],
    });
    playerId = player.playerId;

    const stat = await PlayerWeekStats.create({
      playerId,
      season: 2025,
      week: 1,
      stats: { pass_yd: 250, points: 18.5 },
      source: "vitest",
    });
    const projection = await PlayerWeekProjections.create({
      playerId,
      season: 2025,
      week: 1,
      projections: { pass_yd: 240, points: 17.25 },
      source: "vitest",
    });

    const loadedPlayer = await Players.findByPk(playerId, {
      include: [PlayerWeekStats, PlayerWeekProjections],
    });
    expect(loadedPlayer.sleeperPlayerId).toBe(sleeperPlayerId);
    expect(loadedPlayer.PlayerWeekStats).toHaveLength(1);
    expect(loadedPlayer.PlayerWeekStats[0].stats).toEqual({
      pass_yd: 250,
      points: 18.5,
    });
    expect(loadedPlayer.PlayerWeekProjections).toHaveLength(1);
    expect(loadedPlayer.PlayerWeekProjections[0].projections).toEqual({
      pass_yd: 240,
      points: 17.25,
    });

    const loadedStat = await PlayerWeekStats.findByPk(stat.id, {
      include: [Players],
    });
    const loadedProjection = await PlayerWeekProjections.findByPk(
      projection.id,
      { include: [Players] },
    );
    expect(loadedStat.Player.sleeperPlayerId).toBe(sleeperPlayerId);
    expect(loadedProjection.Player.sleeperPlayerId).toBe(sleeperPlayerId);

    await expect(
      PlayerWeekStats.create({
        playerId: randomUUID(),
        season: 2025,
        week: 1,
        stats: { points: 1 },
      }),
    ).rejects.toMatchObject({ name: "SequelizeForeignKeyConstraintError" });

    await expect(
      PlayerWeekProjections.create({
        playerId: randomUUID(),
        season: 2025,
        week: 1,
        projections: { points: 1 },
      }),
    ).rejects.toMatchObject({ name: "SequelizeForeignKeyConstraintError" });
  } finally {
    if (playerId) {
      await PlayerWeekStats.destroy({ where: { playerId } });
      await PlayerWeekProjections.destroy({ where: { playerId } });
      await Players.destroy({ where: { playerId } });
    }
  }

  expect(await Players.findOne({ where: { sleeperPlayerId } })).toBeNull();
  if (playerId) {
    expect(await PlayerWeekStats.count({ where: { playerId } })).toBe(0);
    expect(await PlayerWeekProjections.count({ where: { playerId } })).toBe(0);
  }
});

test("Jobs rows can be created, queried, updated, and removed independently", async () => {
  const name = `vitest-${randomUUID()}`;

  try {
    const created = await Jobs.create({
      name,
      done: false,
      completedAt: null,
    });
    const found = await Jobs.findByPk(name);

    expect(found).not.toBeNull();
    expect(found.name).toBe(created.name);
    expect(found.done).toBe(false);

    await found.update({
      done: true,
      completedAt: new Date("2025-01-01T00:00:00Z"),
    });
    const updated = await Jobs.findByPk(name);
    expect(updated.done).toBe(true);
    expect(updated.completedAt.toISOString()).toBe("2025-01-01T00:00:00.000Z");
  } finally {
    await Jobs.destroy({ where: { name } });
  }

  expect(await Jobs.findByPk(name)).toBeNull();
});
