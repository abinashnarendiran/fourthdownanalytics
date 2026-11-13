const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Op, fn, col, where } = require("sequelize");
const { Users, FantasyPlatforms, Leagues } = require("../models");
const { ENABLED_PLATFORMS } = require("../constants/platforms");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false,
  sameSite: "lax",
  maxAge: 1000 * 60 * 60 * 24,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*\d)(?=.*[^A-Za-z0-9]).*$/;

const sendValidationError = (res, fieldErrors, status = 400) =>
  res.status(status).json({ message: "Validation failed", fieldErrors });

const isString = (value) => typeof value === "string";

// GET /profile
module.exports.getProfile = async (req, res) => {
  try {
    const { userId } = req.user;

    const user = await Users.findByPk(userId, {
      attributes: ["userId", "name", "email", "createdAt"],
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    const sleeperPlatform = await FantasyPlatforms.findOne({
      where: { userId, provider: ENABLED_PLATFORMS.SLEEPER },
    });

    const activeLeagueCount = sleeperPlatform
      ? await Leagues.count({
          where: { fantasyPlatformId: sleeperPlatform.fantasyPlatformId },
        })
      : 0;

    return res.json({
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      sleeper: sleeperPlatform
        ? {
            connected: true,
            username: sleeperPlatform.username,
            displayName: sleeperPlatform.displayName,
            platformUserId: sleeperPlatform.platformUserId,
          }
        : {
            connected: false,
            username: null,
            displayName: null,
            platformUserId: null,
          },
      activeLeagueCount,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load profile" });
  }
};

// PATCH /profile
module.exports.updateProfile = async (req, res) => {
  try {
    const { userId } = req.user;
    const { name, email } = req.body || {};

    const fieldErrors = {};
    const trimmedName = isString(name) ? name.trim() : "";
    const trimmedEmail = isString(email) ? email.trim() : "";

    if (!trimmedName) fieldErrors.name = ["Name is required"];
    else if (trimmedName.length > 100)
      fieldErrors.name = ["Name must be 100 characters or fewer"];

    if (!EMAIL_REGEX.test(trimmedEmail))
      fieldErrors.email = ["Email is invalid"];

    if (Object.keys(fieldErrors).length) {
      return sendValidationError(res, fieldErrors);
    }

    const user = await Users.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (trimmedEmail.toLowerCase() !== user.email.toLowerCase()) {
      const existing = await Users.findOne({
        where: {
          [Op.and]: [
            where(fn("lower", col("email")), trimmedEmail.toLowerCase()),
            { userId: { [Op.ne]: userId } },
          ],
        },
      });
      if (existing) {
        return sendValidationError(
          res,
          { email: ["Email already in use"] },
          409,
        );
      }
    }

    user.name = trimmedName;
    user.email = trimmedEmail;
    await user.save();

    // Keep the JWT claims (used by /auth/me) in sync with the profile
    const token = jwt.sign(
      { userId: user.userId, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: "1d" },
    );
    res.cookie("auth_token", token, COOKIE_OPTIONS);

    return res.json({
      userId: user.userId,
      name: user.name,
      email: user.email,
    });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return sendValidationError(res, { email: ["Email already in use"] }, 409);
    }
    return res.status(500).json({ message: "Failed to update profile" });
  }
};

// PUT /profile/password
module.exports.changePassword = async (req, res) => {
  try {
    const { userId } = req.user;
    const { currentPassword, newPassword } = req.body || {};

    const fieldErrors = {};
    if (!isString(currentPassword) || !currentPassword) {
      fieldErrors.currentPassword = ["Current password is required"];
    }
    if (!isString(newPassword) || newPassword.length < 8) {
      fieldErrors.newPassword = ["Password must be at least 8 characters"];
    } else if (!PASSWORD_REGEX.test(newPassword)) {
      fieldErrors.newPassword = [
        "Password must contain at least 1 number and 1 special character",
      ];
    } else if (newPassword === currentPassword) {
      fieldErrors.newPassword = [
        "New password must be different from current password",
      ];
    }

    if (Object.keys(fieldErrors).length) {
      return sendValidationError(res, fieldErrors);
    }

    const user = await Users.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return sendValidationError(
        res,
        { currentPassword: ["Current password is incorrect"] },
        400,
      );
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ message: "Password updated" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to change password" });
  }
};
