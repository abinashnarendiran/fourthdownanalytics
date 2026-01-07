const { DataTypes } = require("sequelize");
const sequelize = require("../config/db"); // import sequelize here to define models

const Users = require("./Users")(sequelize, DataTypes);

module.exports = {
  Users, // only export models
};