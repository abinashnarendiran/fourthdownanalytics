module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "PlayerWeekProjections",
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

      season: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      week: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      projections: {
        type: DataTypes.JSON, // Projected stats / fantasy points
        allowNull: false,
      },

      source: {
        type: DataTypes.STRING, // e.g., 'sleeper', 'custom_model'
        allowNull: true,
      },
    },
    {
      timestamps: true,
    },
  );
