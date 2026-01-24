module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "Players",
    {
      // Internal primary key (stable)
      playerId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      // External API IDs
      fantasyDataId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        unique: true,
      },
      sleeperPlayerId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      espnId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      yahooId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      rotoworldId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        unique: true,
      },

      // Player info
      firstName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      fullName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      position: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      fantasyPositions: {
        type: DataTypes.JSON, // Array of positions
        allowNull: true,
      },
      team: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      number: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      // Raw API metadata (store everything extra)
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      timestamps: true,
    },
  );
