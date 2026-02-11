// Migration / model example
module.exports = (sequelize, DataTypes) =>
  sequelize.define("Jobs", {
    name: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    done: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });
