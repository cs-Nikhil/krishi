const express = require("express");
const User = require("../models/User");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const httpError = require("../utils/httpError");
const { authenticate, createAccessToken, getBearerToken, verifyAccessToken } = require("../middleware/auth");
const { loginLimiter } = require("../middleware/rateLimiters");
const {
  createUserSession,
  findActiveSessionByRefreshToken,
  revokeDeviceSessions,
  revokeSessionById,
  revokeSessionByRefreshToken
} = require("../services/sessionService");
const { sendSuccess } = require("../utils/apiResponse");
const { loginBody, logoutBody, refreshTokenBody } = require("../validation/schemas");

const router = express.Router();

router.post(
  "/login",
  loginLimiter,
  validate({ body: loginBody }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !user.active) {
      throw httpError(401, "Invalid email or password");
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      throw httpError(401, "Invalid email or password");
    }

    const { refreshToken, session } = await createUserSession({ user, req, body: req.body });
    const accessToken = createAccessToken(user, session);

    sendSuccess(res, {
      message: "Login successful",
      data: {
        accessToken,
        refreshToken,
        token: accessToken,
        user: user.toJSON(),
        sessionId: session._id,
        deviceId: session.deviceId,
        expiresAt: session.expiresAt
      }
    });
  })
);

router.post(
  "/refresh-token",
  validate({ body: refreshTokenBody }),
  asyncHandler(async (req, res) => {
    const session = await findActiveSessionByRefreshToken(req.body.refreshToken);
    if (!session) {
      throw httpError(401, "Invalid or expired refresh token");
    }

    const user = await User.findById(session.userId);
    if (!user || !user.active) {
      throw httpError(401, "User account is inactive or unavailable");
    }

    session.lastActive = new Date();
    await session.save();

    const accessToken = createAccessToken(user, session);
    sendSuccess(res, {
      message: "Access token refreshed",
      data: {
        accessToken,
        token: accessToken,
        user: user.toJSON(),
        sessionId: session._id,
        deviceId: session.deviceId
      }
    });
  })
);

router.post(
  "/logout",
  validate({ body: logoutBody }),
  asyncHandler(async (req, res) => {
    let revoked = 0;

    if (req.body.refreshToken) {
      revoked += await revokeSessionByRefreshToken(req.body.refreshToken);
    }

    const accessToken = getBearerToken(req);
    if (accessToken) {
      try {
        const payload = verifyAccessToken(accessToken);
        if (payload.sid) {
          revoked += await revokeSessionById(payload.sid);
        }

        if (req.body.deviceId) {
          revoked += await revokeDeviceSessions({ userId: payload.sub, deviceId: req.body.deviceId });
        }
      } catch (error) {
        if (!req.body.refreshToken) {
          throw httpError(401, "Invalid or expired authentication token");
        }
      }
    }

    if (!revoked) {
      throw httpError(400, "Refresh token or active device session is required for logout");
    }

    sendSuccess(res, {
      message: "Logout successful",
      data: { revokedSessions: revoked }
    });
  })
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    sendSuccess(res, {
      message: "Authenticated user loaded",
      data: { user: req.user.toJSON() }
    });
  })
);

module.exports = router;
