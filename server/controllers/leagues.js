const { Leagues, FantasyPlatforms } = require("../models");

module.exports.getUserLeagues = async (req, res) => {
  try {
    const { userId } = req.user;
    const leagues = await Leagues.findAll({
      include: [
        {
          model: FantasyPlatforms,
          where: { userId },
          required: true,
        },
      ],
      order: [
        ["leagueName", "ASC"], // or 'DESC'
        ["seasonYear", "DESC"], // most recent year first
      ],
    });

    res.json({ leagues });
  } catch (error) {
    console.error("Error fetching user leagues:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
