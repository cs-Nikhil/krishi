const crypto = require("crypto");
const UserSession = require("../models/UserSession");

const refreshDays = Number(process.env.JWT_REFRESH_EXPIRES_DAYS) || 30;

const hashValue = (value) => crypto.createHash("sha256").update(value).digest("hex");

const createRefreshToken = () => crypto.randomBytes(64).toString("hex");

const getRequestIp = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    return String(forwardedFor).split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || "";
};

const deriveDeviceId = (req, providedDeviceId) => {
  if (providedDeviceId) {
    return providedDeviceId;
  }

  const userAgent = req.get("user-agent") || "unknown";
  const fingerprint = hashValue(`${getRequestIp(req)}:${userAgent}`).slice(0, 24);
  return `web-${fingerprint}`;
};

const getDeviceMetadata = (req, body = {}) => ({
  deviceId: deriveDeviceId(req, body.deviceId || req.get("x-device-id")),
  deviceType: body.deviceType || req.get("x-device-type") || "web",
  deviceName: body.deviceName || req.get("x-device-name") || "",
  os: body.os || req.get("x-device-os") || "",
  appVersion: body.appVersion || req.get("x-app-version") || "",
  ipAddress: getRequestIp(req),
  userAgent: req.get("user-agent") || ""
});

const createUserSession = async ({ user, req, body = {} }) => {
  const refreshToken = createRefreshToken();
  const metadata = getDeviceMetadata(req, body);
  const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

  const session = await UserSession.create({
    userId: user._id,
    refreshTokenHash: hashValue(refreshToken),
    ...metadata,
    lastActive: new Date(),
    expiresAt
  });

  return { refreshToken, session };
};

const findActiveSessionByRefreshToken = async (refreshToken) => {
  return UserSession.findOne({
    refreshTokenHash: hashValue(refreshToken),
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() }
  });
};

const revokeSessionByRefreshToken = async (refreshToken) => {
  const result = await UserSession.updateOne(
    {
      refreshTokenHash: hashValue(refreshToken),
      revokedAt: { $exists: false }
    },
    { $set: { revokedAt: new Date() } }
  );

  return result.modifiedCount;
};

const revokeDeviceSessions = async ({ userId, deviceId }) => {
  const result = await UserSession.updateMany(
    {
      userId,
      deviceId,
      revokedAt: { $exists: false }
    },
    { $set: { revokedAt: new Date() } }
  );

  return result.modifiedCount;
};

const revokeSessionById = async (sessionId) => {
  const result = await UserSession.updateOne(
    {
      _id: sessionId,
      revokedAt: { $exists: false }
    },
    { $set: { revokedAt: new Date() } }
  );

  return result.modifiedCount;
};

const touchSession = async (sessionId) => {
  if (!sessionId) return null;

  return UserSession.findByIdAndUpdate(
    sessionId,
    { $set: { lastActive: new Date() } },
    { new: true }
  );
};

module.exports = {
  createUserSession,
  findActiveSessionByRefreshToken,
  getDeviceMetadata,
  revokeDeviceSessions,
  revokeSessionById,
  revokeSessionByRefreshToken,
  touchSession
};
