const { ENABLED_PLATFORMS } = require("../constants/platforms");
const { FantasyPlatforms, Leagues } = require("../models");
const {
  getSleeperUser,
  getSleeperLeagues,
  getSleeperDraftSettings,
  getSleeperByLeagueId,
} = require("../services/sleeper");
const { mapSleeperLeague } = require("../util/sleeperLeagueMapper");
const { sendResultError } = require("../util/result");
const { Op } = require("sequelize");

const getDraftSettingsOrDefault = async (leagueId) => {
  const draftResult = await getSleeperDraftSettings(leagueId);
  if (!draftResult.error) return draftResult.data;

  // eslint-disable-next-line no-console
  console.warn("Sleeper draft settings unavailable; using defaults", {
    leagueId,
    code: draftResult.error.code,
    message: draftResult.error.message,
  });
  return null;
};

module.exports.getUserPlatforms = async (req, res) => {
  try {
    const { userId } = req.user; // assuming req.user is set

    // All platforms you want to show
    const allPlatforms = [ENABLED_PLATFORMS.SLEEPER];

    // Fetch the user's connected platforms along with leagues
    const userPlatformsRaw = await FantasyPlatforms.findAll({
      where: {
        userId,
        provider: { [Op.in]: allPlatforms },
      },
      include: [
        {
          model: Leagues,
          required: false, // allow platforms with no leagues
        },
      ],
      nest: true,
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
          config: l.config,
        })),
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
              leagues: account.leagues,
            }
          : null,
      };
    });

    res.json({ platforms });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user platforms" });
  }
};

module.exports.fetchSleeperAccount = async (req, res) => {
  // Implementation for fetching Sleeper account details
  try {
    const { userId } = req.user; // assuming req.user is set

    const { userName, year } = req.body;

    // Get Sleeper Account with Leagues
    const sleeperAccountResult = await getSleeperUser(userName);
    if (sleeperAccountResult.error) {
      return sendResultError(res, sleeperAccountResult.error);
    }
    const sleeperAccount = sleeperAccountResult.data;

    if (!sleeperAccount) {
      return res.status(404).json({ message: "Sleeper user not found" });
    }
    // Extract user info from Sleeper API response
    const sleeperUser = {
      platformUserId: sleeperAccount.user_id,
      platformUserName: sleeperAccount.username,
      platformDisplayName: sleeperAccount.display_name,
    };

    // Fetch all leagues for this user from Sleeper API
    const sleeperLeaguesResult = await getSleeperLeagues(
      sleeperUser.platformUserId,
      year,
    );
    if (sleeperLeaguesResult.error) {
      return sendResultError(res, sleeperLeaguesResult.error);
    }
    const sleeperLeagues = sleeperLeaguesResult.data;

    // Query database for existing leagues already added by this user
    const existingLeagues = await Leagues.findAll({
      include: [
        {
          model: FantasyPlatforms,
          required: true,
          where: {
            userId,
            provider: ENABLED_PLATFORMS.SLEEPER,
            platformUserId: sleeperUser.platformUserId,
          },
        },
      ],
    });

    // Create a Set of existing league IDs for quick lookup
    const existingLeagueIds = new Set(existingLeagues.map((l) => l.leagueId));

    // Process each Sleeper league and build response data
    let leagues = [];

    if (sleeperLeagues) {
      const leagueResults = await Promise.all(
        sleeperLeagues.map(async (league) => {
          const draftData = await getDraftSettingsOrDefault(league.league_id);
          const leagueDetails = mapSleeperLeague(league, draftData);
          return {
            ...leagueDetails,
            added: existingLeagueIds.has(league.league_id),
          };
        }),
      );
      const failedLeagueResult = leagueResults.find((result) => result?.error);
      if (failedLeagueResult) {
        return sendResultError(res, failedLeagueResult.error);
      }
      leagues = leagueResults;
    }

    // Attach leagues and platform info to response
    sleeperUser.leagues = leagues;
    sleeperUser.platform = ENABLED_PLATFORMS.SLEEPER;

    return res.json(sleeperUser);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch user platforms" });
  }
};

module.exports.addLeagues = async (req, res) => {
  try {
    const { userId } = req.user; // Get the user ID from the request
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
      platform,
    } = platformData; // Destructure platform data

    // Check for existing account
    let fantasyPlatform = await FantasyPlatforms.findOne({
      where: { userId, provider: platform }, // Find existing fantasy platform for the user
      include: [Leagues], // Include leagues to check if any exist
    });

    if (fantasyPlatform) {
      if (
        fantasyPlatform.platformUserId &&
        fantasyPlatform.platformUserId !== platformUserId
      ) {
        return res.status(400).json({
          message: `You already have an account for ${platform}. Only one account allowed.`,
        });
      }
      // Account exists but has no leagues → update it with new account info
      fantasyPlatform.platformUserId = platformUserId;
      fantasyPlatform.username = platformUserName;
      fantasyPlatform.displayName = platformDisplayName;
      await fantasyPlatform.save();
    } else {
      // No account exists → create new
      fantasyPlatform = await FantasyPlatforms.create({
        userId,
        platformUserId,
        provider: platform,
        username: platformUserName,
        displayName: platformDisplayName,
      });
    }

    // Add leagues
    await Promise.all(
      leagues.map(async (leagueData) => {
        const existingLeague = await Leagues.findOne({
          where: {
            leagueId: leagueData.leagueId,
            fantasyPlatformId: fantasyPlatform.fantasyPlatformId,
          },
        });

        if (existingLeague) {
          return null; // Skip creating this league
        }

        // Create new league
        return Leagues.create({
          leagueId: leagueData.leagueId,
          leagueName: leagueData.leagueName,
          seasonYear: leagueData.seasonYear,
          type: leagueData.type || "Redraft",
          config: leagueData.config || {},
          fantasyPlatformId: fantasyPlatform.fantasyPlatformId,
        });
      }),
    );

    return res.json({ message: "Leagues added successfully" }); // Return success message
  } catch (err) {
    return res.status(500).json({ message: "Failed to add leagues" }); // Return error response
  }
};

module.exports.deleteLeague = async (req, res) => {
  // Implementation for deleting a league from user's account
  try {
    const { userId } = req.user; // assuming req.user is set
    const { fantasyDbLeagueId } = req.params;
    // Find the league to delete
    const league = await Leagues.findOne({
      where: { id: fantasyDbLeagueId },
      include: [
        {
          model: FantasyPlatforms,
          required: true,
          where: { userId },
        },
      ],
    });
    // If not found, return 404
    if (!league) {
      return res.status(404).json({ message: "League not found" });
    }
    // Delete the league
    await league.destroy();
    return res.json({ message: "League deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete league" });
  }
};

module.exports.deleteFantasyPlatform = async (req, res) => {
  try {
    const { userId } = req.user;
    const { fantasyPlatformId } = req.params;

    // Find the fantasy platform to delete
    const fantasyPlatform = await FantasyPlatforms.findOne({
      where: { fantasyPlatformId, userId },
    });

    // If not found, return 404
    if (!fantasyPlatform) {
      return res.status(404).json({ message: "Fantasy platform not found" });
    }

    // Delete all leagues associated with this fantasy platform
    await Leagues.destroy({
      where: { fantasyPlatformId: fantasyPlatform.fantasyPlatformId },
    });

    // Delete the fantasy platform itself
    await fantasyPlatform.destroy();

    return res.json({
      message: "Fantasy platform account deleted successfully",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Failed to delete fantasy platform account" });
  }
};

module.exports.resyncPlatform = async (req, res) => {
  // Implementation for resyncing a fantasy platform
  try {
    const { userId } = req.user; // assuming req.user is set
    const { platformData } = req.body; // Extract platform data from request body

    const { account, platform } = platformData; // Destructure account and platform from platformData
    const { fantasyPlatformId, username, leagues } = account; // Destructure account details

    // Find existing fantasy platform
    const fantasyPlatform = await FantasyPlatforms.findOne({
      where: { fantasyPlatformId, userId, provider: platform },
    });
    if (!fantasyPlatform) {
      return res.status(404).json({ message: "Fantasy platform not found" }); // Handle case where platform is not found
    }

    // Use Sleeper API to update account and leagues if the platform is Sleeper
    if (platform === ENABLED_PLATFORMS.SLEEPER) {
      const sleeperAccountResult = await getSleeperUser(username);
      if (sleeperAccountResult.error) {
        return sendResultError(res, sleeperAccountResult.error);
      }
      const sleeperAccount = sleeperAccountResult.data;
      if (!sleeperAccount) {
        return res.status(404).json({ message: "Sleeper user not found" }); // Handle case where Sleeper user is not found
      }

      // Update platform info with data from Sleeper
      fantasyPlatform.platformUserId = sleeperAccount.user_id;
      fantasyPlatform.username = sleeperAccount.username;
      fantasyPlatform.displayName = sleeperAccount.display_name;
      await fantasyPlatform.save(); // Save updated platform info

      // Loop through leagues and update from Sleeper data
      const leagueResults = await Promise.all(
        leagues.map(async (leagueData) => {
          const existingLeague = await Leagues.findOne({
            where: {
              id: leagueData.id,
              leagueId: leagueData.leagueId,
              fantasyPlatformId: fantasyPlatform.fantasyPlatformId,
            },
          });

          if (!existingLeague) return null; // Skip if league doesn't exist

          // Fetch latest league details from Sleeper
          const sleeperLeagueResult = await getSleeperByLeagueId(
            leagueData.leagueId,
          );
          if (sleeperLeagueResult.error) return sleeperLeagueResult;
          const sleeperLeague = sleeperLeagueResult.data;
          if (!sleeperLeague) return null;

          const draftData = await getDraftSettingsOrDefault(
            leagueData.leagueId,
          );
          const leagueDetails = mapSleeperLeague(sleeperLeague, draftData);

          // Update league info
          existingLeague.leagueName = leagueDetails.leagueName;
          existingLeague.seasonYear = leagueDetails.seasonYear;
          existingLeague.type = leagueDetails.type;
          existingLeague.config = leagueDetails.config;

          await existingLeague.save(); // Save updated league info
          return existingLeague;
        }),
      );
      const failedLeagueResult = leagueResults.find((result) => result?.error);
      if (failedLeagueResult) {
        return sendResultError(res, failedLeagueResult.error);
      }
    }

    // For simplicity, just returning success for now
    return res.json({ message: "Platform resynced successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to resync platform" }); // Handle errors
  }
};
