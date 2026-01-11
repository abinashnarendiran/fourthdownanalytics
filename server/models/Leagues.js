module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "League",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      fantasyPlatformId: { type: DataTypes.UUID, allowNull: false, foreignKey: true },
      leagueId: { type: DataTypes.STRING, allowNull: false },
      leagueName: { type: DataTypes.STRING, allowNull: false },
      seasonYear: { type: DataTypes.INTEGER, allowNull: false },
      scoringType: { type: DataTypes.STRING, allowNull: false },

    },
    {
      timestamps: true,
      tableName: "Leagues",
    }
  );
