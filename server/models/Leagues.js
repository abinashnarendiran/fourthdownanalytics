module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "Leagues",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      fantasyPlatformId: {
        type: DataTypes.UUID,
        allowNull: false,
        foreignKey: true,
      },
      leagueId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      leagueName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      seasonYear: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM(
          "Redraft",
          "Dynasty",
          "Keeper",
          "Guillotine",
          "Unknown",
        ),
        allowNull: true, // optional, in case type is missing
      },
      config: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      timestamps: false,
    },
  );
