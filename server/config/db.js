// config/db.js
const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME,      // 'fantasy'
  process.env.DB_USER,      // 'root'
  process.env.DB_PASSWORD,  // 'rootp'
  {
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",       // since you're using MySQL
    logging: false,
  }
);

module.exports = sequelize;
