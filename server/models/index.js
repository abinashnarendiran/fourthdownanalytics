const { DataTypes } = require("sequelize");
const sequelize = require("../config/db"); // import sequelize here to define models

const Users = require("./Users")(sequelize, DataTypes);
const FantasyPlatforms = require("./FantasyPlatforms")(sequelize, DataTypes);
const Leagues = require("./Leagues")(sequelize, DataTypes);
const Players = require("./Players")(sequelize, DataTypes);
const PlayerWeekStats = require("./PlayerWeekStats")(sequelize, DataTypes);
const PlayerWeekProjections = require("./PlayerWeekProjections")(
  sequelize,
  DataTypes,
);
const Jobs = require("./Jobs")(sequelize, DataTypes);

// Define associations
Users.hasMany(FantasyPlatforms, { foreignKey: "userId" });
FantasyPlatforms.belongsTo(Users, { foreignKey: "userId" });

FantasyPlatforms.hasMany(Leagues, { foreignKey: "fantasyPlatformId" });
Leagues.belongsTo(FantasyPlatforms, { foreignKey: "fantasyPlatformId" });

// Players with Player Stats and Player Projections
// Associations
Players.hasMany(PlayerWeekStats, { foreignKey: "playerId" });
PlayerWeekStats.belongsTo(Players, { foreignKey: "playerId" });

Players.hasMany(PlayerWeekProjections, { foreignKey: "playerId" });
PlayerWeekProjections.belongsTo(Players, { foreignKey: "playerId" });

module.exports = {
  Users, // only export models
  FantasyPlatforms,
  Leagues,
  Players,
  PlayerWeekStats,
  PlayerWeekProjections,
  Jobs,
};
