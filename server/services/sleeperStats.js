const axios = require("axios");

const sleeperAPIURL = "https://api.sleeper.com";

const getSleeperPlayerRegularSeasonStats = async (
  playerId,
  season,
  grouping,
) => {
  try {
    const response = await axios.get(
      `${sleeperAPIURL}/stats/nfl/player/${playerId}`,
      {
        params: {
          season,
          season_type: "regular",
          grouping,
        },
      },
    );
    return response.data;
  } catch (err) {
    return null;
  }
};

const getSleeperPlayerProjectedRegularSeasonStats = async (
  playerId,
  season,
  grouping,
) => {
  try {
    const response = await axios.get(
      `${sleeperAPIURL}/projections/nfl/player/${playerId}`,
      {
        params: {
          season,
          season_type: "regular",
          grouping,
        },
      },
    );
    return response.data;
  } catch (err) {
    return null;
  }
};

module.exports = {
  getSleeperPlayerProjectedRegularSeasonStats,
  getSleeperPlayerRegularSeasonStats,
};
