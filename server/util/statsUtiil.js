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

module.exports = { sumTop, getStatsForWeek, calculateFantasyPoints };
