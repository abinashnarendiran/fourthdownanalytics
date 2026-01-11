module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "FantasyPlatforms",
    {
      fantasyPlatformId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4, // automatically generate UUID
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        foreignKey: true,
      },
      provider: { type: DataTypes.STRING, allowNull: false }, // Sleeper, ESPN, Yahoo
      platformUserId: { type: DataTypes.STRING, allowNull: true },
      username: { type: DataTypes.STRING, allowNull: false },
      displayName: { type: DataTypes.STRING, allowNull: true },
    },
     {
      timestamps: false,
    }
  );
