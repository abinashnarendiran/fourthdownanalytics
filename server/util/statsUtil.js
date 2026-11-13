const {
  PlayerWeekStats,
  Players,
  PlayerWeekProjections,
} = require("../models");

// Helper Functions
const sumTop = (arr = [], n = 0) =>
  arr.slice(0, n).reduce((sum, p) => sum + p.projectedPoints, 0);

const getStatsForWeek = (statsByWeek, week) =>
  statsByWeek?.[String(week)]?.stats || null;

// Metrics Util
const calculateFantasyPoints = (stats, scoringSettings) => {
  let points = 0;

  Object.keys(scoringSettings).forEach((key) => {
    if (stats[key] !== undefined) {
      points += stats[key] * scoringSettings[key];
    }
  });

  return points;
};

/**
 * Gets player points. If a cache is provided, it returns instantly.
 * Otherwise, it queries the DB for that specific player's season row.
 */
const getPlayerPoints = async (
  pId,
  wk,
  seasonYear,
  scoringSettings,
  type = "actual",
  cache = null,
) => {
  if (!pId) return { points: 0, name: "Unknown", pos: "BN" };

  let data;
  const cacheKey = `${pId}-${wk}`; // Match the new cache key format

  // --- 1. CHECK CACHE FIRST ---
  if (cache && cache[cacheKey]) {
    data = cache[cacheKey];
  } else {
    // --- 2. FALLBACK TO DB ---
    const Model = type === "actual" ? PlayerWeekStats : PlayerWeekProjections;
    data = await Model.findOne({
      where: {
        season: seasonYear,
        source: "sleeper",
        week: wk, // Now filtering by the week column
      },
      include: [
        { model: Players, where: { sleeperPlayerId: pId }, required: true },
      ],
      nest: true,
    });
  }

  if (!data) return { points: 0, name: "Unknown", pos: "BN" };

  // Since 'data' IS the specific week's row, use stats/projections directly
  const weekStats =
    type === "actual" ? data.stats || {} : data.projections || {};

  return {
    points: calculateFantasyPoints(weekStats, scoringSettings),
    name: data.Player?.fullName || data.name || "Unknown",
    pos: data.Player?.position || data.pos || "BN",
  };
};

module.exports = {
  sumTop,
  getStatsForWeek,
  calculateFantasyPoints,
  getPlayerPoints,
};
