module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "PlayerWeekStats",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      playerId: {
        type: DataTypes.UUID,
        allowNull: false,
        foreignKey: true,
      },
      season: { type: DataTypes.INTEGER, allowNull: false },
      week: { type: DataTypes.INTEGER, allowNull: false },
      stats: { type: DataTypes.JSON, allowNull: false },
      source: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "sleeper",
      },
    },
    {
      timestamps: true,
    },
  );
