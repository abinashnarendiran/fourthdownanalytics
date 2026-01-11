const { DataTypes } = require("sequelize");
const sequelize = require("../config/db"); // import sequelize here to define models

const Users = require("./Users")(sequelize, DataTypes);
const FantasyPlatforms = require("./FantasyPlatforms")(sequelize, DataTypes);
const Leagues = require("./Leagues")(sequelize, DataTypes);

// Define associations
Users.hasMany(FantasyPlatforms, { foreignKey: "userId" });
FantasyPlatforms.belongsTo(Users, { foreignKey: "userId" });

FantasyPlatforms.hasMany(Leagues, { foreignKey: "fantasyPlatformId" });
Leagues.belongsTo(FantasyPlatforms, { foreignKey: "fantasyPlatformId" });

module.exports = {
  Users, // only export models
  FantasyPlatforms,
  Leagues,
};