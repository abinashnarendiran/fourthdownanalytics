import { createRequire } from "node:module";
import { test } from "vitest";

const require = createRequire(import.meta.url);
const assert = require("node:assert/strict");
const express = require("express");
const routes = require("../routes");
const { Leagues } = require("../models");

const startTestServer = async () => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = { userId: "integration-test-user" };
    next();
  });
  app.use("/api", routes);

  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address();
  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
  };
};

const closeTestServer = (server) =>
  new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

test("GET /api/leagues/getUserLeagues returns the controller's league response", async () => {
  const originalFindAll = Leagues.findAll;
  const savedLeagues = [
    { id: "league-record-1", leagueId: "sleeper-league-1", leagueName: "A" },
  ];
  let queryOptions;
  Leagues.findAll = async (options) => {
    queryOptions = options;
    return savedLeagues;
  };

  const { server, url } = await startTestServer();
  try {
    const response = await fetch(`${url}/api/leagues/getUserLeagues`, {
      headers: { connection: "close" },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { leagues: savedLeagues });
    assert.equal(queryOptions.include[0].where.userId, "integration-test-user");
  } finally {
    Leagues.findAll = originalFindAll;
    await closeTestServer(server);
  }
});

test("GET /api/leagues/getUserLeagues maps query failures to an HTTP 500 response", async () => {
  const originalFindAll = Leagues.findAll;
  Leagues.findAll = async () => {
    throw new Error("database unavailable");
  };

  const { server, url } = await startTestServer();
  try {
    const response = await fetch(`${url}/api/leagues/getUserLeagues`, {
      headers: { connection: "close" },
    });

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      message: "Internal server error",
    });
  } finally {
    Leagues.findAll = originalFindAll;
    await closeTestServer(server);
  }
});

test("team analysis route rejects a comparison that uses the same roster twice", async () => {
  const originalFindOne = Leagues.findOne;
  Leagues.findOne = async () => {
    throw new Error("Validation should stop before a database lookup");
  };

  const { server, url } = await startTestServer();
  try {
    const response = await fetch(
      `${url}/api/sleeper/getSleeperTeamAnalysisSeasonData`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          connection: "close",
        },
        body: JSON.stringify({
          id: "league-record-1",
          rosterId: 1,
          compareRosterId: 1,
        }),
      },
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      message: "Choose two different rosters to compare",
    });
  } finally {
    Leagues.findOne = originalFindOne;
    await closeTestServer(server);
  }
});
