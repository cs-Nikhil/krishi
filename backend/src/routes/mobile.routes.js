const express = require("express");
const UserSession = require("../models/UserSession");
const { authenticate, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const { revokeDeviceSessions } = require("../services/sessionService");
const { syncOfflinePayload } = require("../services/syncService");
const { sendSuccess } = require("../utils/apiResponse");
const { deviceIdParams, syncBody } = require("../validation/schemas");

const router = express.Router();

router.use(authenticate);

router.get(
  "/devices",
  asyncHandler(async (req, res) => {
    const sessions = await UserSession.find({
      userId: req.user._id,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() }
    })
      .sort({ lastActive: -1 })
      .lean();

    const devices = sessions.map((session) => ({
      sessionId: session._id,
      deviceId: session.deviceId,
      deviceName: session.deviceName,
      deviceType: session.deviceType,
      os: session.os,
      appVersion: session.appVersion,
      ipAddress: session.ipAddress,
      lastActive: session.lastActive
    }));

    sendSuccess(res, {
      message: "Active devices loaded",
      data: { devices }
    });
  })
);

router.delete(
  "/devices/:deviceId",
  validate({ params: deviceIdParams }),
  asyncHandler(async (req, res) => {
    const revokedSessions = await revokeDeviceSessions({
      userId: req.user._id,
      deviceId: req.params.deviceId
    });

    sendSuccess(res, {
      message: "Device logged out",
      data: {
        deviceId: req.params.deviceId,
        revokedSessions
      }
    });
  })
);

router.post(
  "/sync",
  authorize("owner", "staff"),
  validate({ body: syncBody }),
  asyncHandler(async (req, res) => {
    const report = await syncOfflinePayload({
      payload: req.body,
      user: req.user,
      deviceId: req.body.deviceId || req.session?.deviceId
    });

    sendSuccess(res, {
      message: report.failed ? "Offline sync completed with issues" : "Offline sync completed",
      data: report
    });
  })
);

module.exports = router;
