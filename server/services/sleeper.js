const axios = require("axios");

const sleeperAPIURL = "https://api.sleeper.app/v1";

const getSleeperUser = async (userName) => {
  try {
    const response = await axios.get(`${sleeperAPIURL}/user/${userName}`);
    return response.data;
  } catch (err) {
    return null;
  }
};

const getSleeperLeagues = async (userId, year) => {
  try {
    const response = await axios.get(`${sleeperAPIURL}/user/${userId}/leagues/nfl/${year}`);
    return response.data;
  } catch (err) {
    return null;
  }
};

module.exports = { getSleeperUser, getSleeperLeagues };
