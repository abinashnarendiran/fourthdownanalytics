const {
  getAllMatchups,
  getPlayoffsWinnersBracket,
  getPlayoffsLosersBracket,
} = require("../services/sleeper");

const cache = new Map();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

const getSeasonData = async (leagueId, weekSettings) => {
  const cacheKey = leagueId;

  // Check cache and validate TTL
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() < cached.expiresAt) {
      return cached.data;
    }
    // Expired, remove it
    cache.delete(cacheKey);
  }

  // Fetch all in parallel
  const [matchupsByWeek, winnersBracket, losersBracket] = await Promise.all([
    getAllMatchups(leagueId, weekSettings),
    getPlayoffsWinnersBracket(leagueId),
    getPlayoffsLosersBracket(leagueId),
  ]);

  const data = { matchupsByWeek, winnersBracket, losersBracket };

  // Store in cache with expiry
  cache.set(cacheKey, {
    data,
    expiresAt: Date.now() + TTL_MS,
  });

  return data;
};

const clearSeasonCache = (leagueId) => {
  if (leagueId) {
    cache.delete(leagueId);
  } else {
    cache.clear(); // clear all if no leagueId provided
  }
};

module.exports = { getSeasonData, clearSeasonCache };
