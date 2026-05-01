const jwt = require("jsonwebtoken");
const User = require("../models/User");
const UserSession = require("../models/UserSession");
const asyncHandler = require("../utils/asyncHandler");
const httpError = require("../utils/httpError");

const createAccessToken = (user, session) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      ...(session?._id ? { sid: session._id.toString() } : {})
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRES_IN || "15m" }
  );
};

const createToken = createAccessToken;

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
};

const verifyAccessToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

const authenticate = asyncHandler(async (req, res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    throw httpError(401, "Authentication token is required");
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw httpError(401, "Invalid or expired authentication token");
  }

  if (payload.sid) {
    const session = await UserSession.findOne({
      _id: payload.sid,
      userId: payload.sub,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      throw httpError(401, "Device session is inactive or expired");
    }

    session.lastActive = new Date();
    await session.save();
    req.session = session;
  }

  const user = await User.findById(payload.sub).select("+passwordHash");
  if (!user || !user.active) {
    throw httpError(401, "User account is inactive or unavailable");
  }

  req.user = user;
  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(httpError(403, "You do not have permission to perform this action"));
  }

  return next();
};

module.exports = { authenticate, authorize, createAccessToken, createToken, getBearerToken, verifyAccessToken };
