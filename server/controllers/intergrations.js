const { ENABLED_PLATFORMS } = require("../constants/platforms");
const { Users, FantasyPlatforms, Leagues } = require("../models");
const {
  getSleeperUser,
  getSleeperLeagues,
  getSleeperDraftSettings,
  getSleeperByLeagueId
} = require("../services/sleeper");
const { Op } = require("sequelize");

module.exports.getUserPlatforms = async (req, res) => {
  try {
    const userId = req.user.userId; // assuming req.user is set

    // All platforms you want to show
    const allPlatforms = ENABLED_PLATFORMS;

    // Fetch the user's connected platforms along with leagues
    const userPlatformsRaw = await FantasyPlatforms.findAll({
      where: {
        userId,
        provider: { [Op.in]: allPlatforms }
      },
      include: [
        {
          model: Leagues,
          required: false // allow platforms with no leagues
        }
      ],
      nest: true
    });

    // Convert Sequelize instances to plain JS objects
    const userPlatformsMap = userPlatformsRaw.reduce((acc, platform) => {
      acc[platform.provider] = {
        fantasyPlatformId: platform.fantasyPlatformId,
        userId: platform.userId,
        provider: platform.provider,
        platformUserId: platform.platformUserId,
        username: platform.username,
        displayName: platform.displayName,
        leagues: (platform.Leagues || []).map((l) => ({
          id: l.id,
          leagueId: l.leagueId,
          leagueName: l.leagueName,
          seasonYear: l.seasonYear,
          type: l.type,
          config: l.config
        }))
      };
      return acc;
    }, {});

    // Build final JSON with all platforms
    const platforms = allPlatforms.map((platformName) => {
      const account = userPlatformsMap[platformName] || null;

      return {
        platform: platformName,
        account: account
          ? {
              fantasyPlatformId: account.fantasyPlatformId,
              userId: account.userId,
              provider: account.provider,
              platformUserId: account.platformUserId,
              username: account.username,
              displayName: account.displayName,
              leagues: account.leagues
            }
          : null
      };
    });

    res.json({ platforms });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch user platforms" });
  }
};

module.exports.fetchSleeperAccount = async (req, res) => {
  // Implementation for fetching Sleeper account details
  try {
    const userId = req.user.userId; // assuming req.user is set

    const { userName, year } = req.body;

    // Get Sleeper Account with Leagues
    const sleeperAccount = await getSleeperUser(userName);

    if (!sleeperAccount) {
      return res.status(404).json({ message: "Sleeper user not found" });
    } else {
      // Extract user info from Sleeper API response
      const sleeperUser = {
        platformUserId: sleeperAccount.user_id,
        platformUserName: sleeperAccount.username,
        platformDisplayName: sleeperAccount.display_name
      };

      // Fetch all leagues for this user from Sleeper API
      const sleeperLeagues = await getSleeperLeagues(
        sleeperUser.platformUserId,
        year
      );

      // Query database for existing leagues already added by this user
      const existingLeagues = await Leagues.findAll({
        include: [
          {
            model: FantasyPlatforms,
            required: true,
            where: {
              userId,
              provider: ENABLED_PLATFORMS.SLEEPER,
              platformUserId: sleeperUser.platformUserId
            }
          }
        ]
      });

      // Create a Set of existing league IDs for quick lookup
      const existingLeagueIds = new Set(existingLeagues.map((l) => l.leagueId));

      // Map numeric Sleeper type codes to readable strings
      const leagueTypeMap = {
        0: "Redraft",
        1: "Keeper",
        2: "Dynasty"
      };

      // Process each Sleeper league and build response data
      const leagues = [];

      if (sleeperLeagues !== null) {
        for (const league of sleeperLeagues) {
          // Fetch draft settings for this league
          let draftSettings = { type: null, rounds: null, status: null };
          let scoringType = "Unknown";
          const draftData = await getSleeperDraftSettings(league.league_id);

          if (draftData) {
            draftSettings.type = draftData.settings?.type || "Unknown";
            draftSettings.rounds = draftData?.settings?.rounds ?? null;
            draftSettings.status = draftData.status ?? null;
            scoringType = draftData?.metadata?.scoring_type || "Unknown";
          }

          // Build league object with all relevant data
          leagues.push({
            leagueId: league.league_id,
            leagueName: league.name,
            seasonYear: parseInt(league.season, 10),
            type:
              league.settings?.type != null
                ? leagueTypeMap[league.settings.type]
                : "Unknown",
            // Store comprehensive league configuration
            config: {
              scoringType: scoringType,
              totalRosters: league.total_rosters,
              rosterPositions: league.roster_positions,
              scoringSettings: league.scoring_settings,
              draft: draftSettings,
              waiver: {
                type: league.settings?.waiver_type || null,
                budget: league.settings?.waiver_budget || null
              },
              taxiSlots: league.settings?.taxi_slots || 0
            },
            // Flag whether this league is already added to the user's account
            added: existingLeagueIds.has(league.league_id)
          });
        }
      }

      // Attach leagues and platform info to response
      sleeperUser.leagues = leagues;
      sleeperUser.platform = ENABLED_PLATFORMS.SLEEPER;

      return res.json(sleeperUser);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch user platforms" });
  }
};

module.exports.addLeagues = async (req, res) => {
  try {
    const userId = req.user.userId; // Get the user ID from the request
    const { platformData } = req.body; // Extract platform data from the request body

    // Validate platform data
    if (
      !platformData ||
      !platformData.platformUserId ||
      !platformData.leagues
    ) {
      return res.status(400).json({ message: "Invalid platform data" }); // Return error if data is invalid
    }

    const {
      platformUserId,
      platformUserName,
      platformDisplayName,
      leagues,
      platform
    } = platformData; // Destructure platform data

    // Check for existing account
    let fantasyPlatform = await FantasyPlatforms.findOne({
      where: { userId, provider: platform, platformUserId }, // Find existing fantasy platform for the user
      include: [Leagues] // Include leagues to check if any exist
    });

    if (fantasyPlatform) {
      if (fantasyPlatform.platformUserId !== platformUserId) {
        // Account has leagues, reject new account
        return res.status(400).json({
          message: `You already have an account for ${platform}. Only one account allowed.`
        });
      } else {
        // Account exists but has no leagues → update it with new account info
        fantasyPlatform.platformUserId = platformUserId; // Update platform user ID
        fantasyPlatform.username = platformUserName; // Update username
        fantasyPlatform.displayName = platformDisplayName; // Update display name
        await fantasyPlatform.save(); // Save updated platform info
      }
    } else {
      // No account exists → create new
      fantasyPlatform = await FantasyPlatforms.create({
        userId,
        platformUserId,
        provider: platform,
        username: platformUserName,
        displayName: platformDisplayName
      });
    }

    // Add leagues
    for (const leagueData of leagues) {
      const existingLeague = await Leagues.findOne({
        where: {
          leagueId: leagueData.leagueId,
          fantasyPlatformId: fantasyPlatform.fantasyPlatformId
        } // Check if league already exists
      });

      if (existingLeague) {
        continue; // Skip to the next league
      }

      // Create new league
      await Leagues.create({
        leagueId: leagueData.leagueId,
        leagueName: leagueData.leagueName,
        seasonYear: leagueData.seasonYear,
        type: leagueData.type || "Redraft", // Default to "Redraft" if type is not provided
        config: leagueData.config || {}, // Default to empty config if not provided
        fantasyPlatformId: fantasyPlatform.fantasyPlatformId // Associate league with fantasy platform
      });
    }

    res.json({ message: "Leagues added successfully" }); // Return success message
  } catch (err) {
    console.error("Error adding leagues:", err); // Log error
    res.status(500).json({ message: "Failed to add leagues" }); // Return error response
  }
};

module.exports.deleteLeague = async (req, res) => {
  // Implementation for deleting a league from user's account
  try {
    const userId = req.user.userId; // assuming req.user is set
    const { fantasyDbLeagueId } = req.params;
    // Find the league to delete
    const league = await Leagues.findOne({
      where: { id: fantasyDbLeagueId },
      include: [
        {
          model: FantasyPlatforms,
          required: true,
          where: { userId }
        }
      ]
    });
    // If not found, return 404
    if (!league) {
      return res.status(404).json({ message: "League not found" });
    }
    // Delete the league
    await league.destroy();
    res.json({ message: "League deleted successfully" });
  } catch (err) {
    console.error("Error deleting league:", err);
    res.status(500).json({ message: "Failed to delete league" });
  }
};

module.exports.deleteFantasyPlatform = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { fantasyPlatformId } = req.params;

    // Find the fantasy platform to delete
    const fantasyPlatform = await FantasyPlatforms.findOne({
      where: { fantasyPlatformId, userId }
    });

    // If not found, return 404
    if (!fantasyPlatform) {
      return res.status(404).json({ message: "Fantasy platform not found" });
    }

    // Delete all leagues associated with this fantasy platform
    await Leagues.destroy({
      where: { fantasyPlatformId: fantasyPlatform.fantasyPlatformId }
    });

    // Delete the fantasy platform itself
    await fantasyPlatform.destroy();

    res.json({ message: "Fantasy platform account deleted successfully" });
  } catch (err) {
    console.error("Error deleting fantasy platform account:", err);
    res
      .status(500)
      .json({ message: "Failed to delete fantasy platform account" });
  }
};

module.exports.resyncPlatform = async (req, res) => {
  // Implementation for resyncing a fantasy platform
  try {
    const userId = req.user.userId; // assuming req.user is set
    const { platformData } = req.body; // Extract platform data from request body

    const { account, platform } = platformData; // Destructure account and platform from platformData
    const {
      fantasyPlatformId,
      platformUserId,
      username,
      displayName,
      leagues
    } = account; // Destructure account details

    // Find existing fantasy platform
    const fantasyPlatform = await FantasyPlatforms.findOne({
      where: { fantasyPlatformId, userId, provider: platform }
    });
    if (!fantasyPlatform) {
      return res.status(404).json({ message: "Fantasy platform not found" }); // Handle case where platform is not found
    }

    // Use Sleeper API to update account and leagues if the platform is Sleeper
    if (platform === ENABLED_PLATFORMS.SLEEPER) {
      const sleeperAccount = await getSleeperUser(username); // Fetch Sleeper account details
      if (!sleeperAccount) {
        return res.status(404).json({ message: "Sleeper user not found" }); // Handle case where Sleeper user is not found
      }

      // Update platform info with data from Sleeper
      fantasyPlatform.platformUserId = sleeperAccount.user_id;
      fantasyPlatform.username = sleeperAccount.username;
      fantasyPlatform.displayName = sleeperAccount.display_name;
      await fantasyPlatform.save(); // Save updated platform info

      // Loop through leagues and update from Sleeper data
      for (const leagueData of leagues) {
        const existingLeague = await Leagues.findOne({
          where: {
            id: leagueData.id,
            leagueId: leagueData.leagueId,
            fantasyPlatformId: fantasyPlatform.fantasyPlatformId
          }
        });
        if (existingLeague) {
          // Update existing league
          // Map numeric type to readable string
          const leagueTypeMap = {
            0: "Redraft",
            1: "Keeper",
            2: "Dynasty"
          };

          const getSleeperLeague = await getSleeperByLeagueId(
            leagueData.leagueId
          ); // Fetch league details from Sleeper
          if (!getSleeperLeague) {
            continue; // Skip if league not found
          }

          let draftSettings = { type: null, rounds: null, status: null }; // Default draft settings
          let scoringType = "Unknown"; // Default scoring type
          const draftData = await getSleeperDraftSettings(leagueData.league_id); // Fetch draft settings from Sleeper
          if (draftData) {
            draftSettings.type = draftData.settings?.type || "Unknown";
            draftSettings.rounds = draftData?.settings?.rounds ?? null;
            draftSettings.status = draftData.status ?? null;
            scoringType = draftData?.metadata?.scoring_type || "Unknown";
          }

          // Update league details
          existingLeague.leagueName = getSleeperLeague.name;
          existingLeague.seasonYear = parseInt(getSleeperLeague.season, 10);
          existingLeague.type =
            leagueData.settings?.type != null
              ? leagueTypeMap[leagueData.settings.type]
              : "Unknown";
          existingLeague.config = {
            scoringType: scoringType,
            totalRosters: leagueData.total_rosters,
            rosterPositions: leagueData.roster_positions,
            scoringSettings: leagueData.scoring_settings,
            draft: draftSettings,
            waiver: {
              type: leagueData.settings?.waiver_type || null,
              budget: leagueData.settings?.waiver_budget || null
            },
            taxiSlots: leagueData.settings?.taxi_slots || 0
          };
          await existingLeague.save(); // Save updated league info
        }
      }
    }

    // For simplicity, just returning success for now
    res.json({ message: "Platform resynced successfully" });
  } catch (err) {
    console.error("Error resyncing platform:", err);
    res.status(500).json({ message: "Failed to resync platform" }); // Handle errors
  }
};
