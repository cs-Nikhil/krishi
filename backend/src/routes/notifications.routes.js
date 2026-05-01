const express = require("express");
const Notification = require("../models/Notification");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const httpError = require("../utils/httpError");
const { authenticate, authorize } = require("../middleware/auth");
const { runDueNotificationJob } = require("../services/notificationService");
const { sendSuccess } = require("../utils/apiResponse");
const { buildPaginationMeta, getPagination } = require("../utils/pagination");
const { idParams, paginationQuery } = require("../validation/schemas");

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  validate({ query: paginationQuery }),
  asyncHandler(async (req, res) => {
    const pagination = getPagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const query = {};

    if (req.query.unreadOnly === "true") {
      query.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query).sort({ isRead: 1, createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ isRead: false })
    ]);

    sendSuccess(res, {
      message: "Notifications loaded",
      data: {
        notifications,
        unreadCount,
        pagination: buildPaginationMeta({ ...pagination, total })
      }
    });
  })
);

router.patch(
  "/:id/read",
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const notification = await Notification.findByIdAndUpdate(req.params.id, { $set: { isRead: true } }, { new: true });

    if (!notification) {
      throw httpError(404, "Notification not found");
    }

    sendSuccess(res, {
      message: "Notification marked as read",
      data: { notification }
    });
  })
);

router.post(
  "/run-due-scan",
  authorize("owner"),
  asyncHandler(async (req, res) => {
    const result = await runDueNotificationJob();

    sendSuccess(res, {
      message: "Due notification scan completed",
      data: result
    });
  })
);

module.exports = router;
