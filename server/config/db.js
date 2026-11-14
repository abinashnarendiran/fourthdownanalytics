// config/db.js
const { Sequelize } = require("sequelize");
require("dotenv").config();

const dbName =
  process.env.NODE_ENV === "test" || process.env.VITEST
    ? process.env.DB_TEST_NAME || "fantasy_test"
    : process.env.DB_NAME;

const sequelize = new Sequelize(
  dbName,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",
    logging: false,
  },
);

module.exports = sequelize;
