const { Users, FantasyPlatforms, Leagues } = require("../models");
const { getSleeperUser, getSleeperLeagues } = require("../services/sleeper");

module.exports.getUserPlatforms = async (req, res) => {
  try {
    const userId = req.user.userId; // assuming req.user is set

    // All platforms you want to show
    const allPlatforms = ["Sleeper", "ESPN", "Yahoo"];

    // Fetch the user's connected platforms along with leagues
    const userPlatforms = await FantasyPlatforms.findAll({
      where: { userId },
      include: [
        {
          model: Leagues,
          attributes: ["id", "leagueName", "seasonYear"],
        },
      ],
    });

    // Map data into desired JSON structure
    const platforms = allPlatforms.map((platformName) => {
      const platformData = userPlatforms.find(
        (p) => p.provider === platformName
      );

      if (platformData) {
        return {
          platform: platformName,
          account: {
            id: platformData.fantasyPlatformId,
            username: platformData.username,
            leagues: platformData.Leagues.map((l) => ({
              id: l.id,
              leagueId: l.leagueId,
              name: l.leagueName,
              year: l.seasonYear,
            })),
          },
        };
      } else {
        return {
          platform: platformName,
          account: null,
        };
      }
    });

    res.json({ platforms });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user platforms" });
  }
};

module.exports.fetchSleeperAccount = async (req, res) => {
    // Implementation for fetching Sleeper account details
    try {
    const userId = req.user.userId; // assuming req.user is set

    const { userName, year } = req.body;

    console.log("Fetching Sleeper account for:", userName, "Year:", year);

    // Get Sleeper Account with Leagues 
    const slepperAccount = await getSleeperUser(userName);

    if(!slepperAccount) {
        return res.status(404).json({ error: "Sleeper user not found" });
    }
    else {
        return res.json(slepperAccount);
        /* console.log("Sleeper account data:", slepperAccount);
        const {user_id, username, display_name, leagues} = slepperAccount;
        
        // Get Leagues for the user
        const slepperLeagues = await getSleeperLeagues(user_id, year);

        console.log("Sleeper leagues data:", slepperLeagues); */

    }

    


    res.json(true);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user platforms" });
  }

};

module.exports.addLeague = async (req, res) => {
    // Implementation for adding a league to user's account
}