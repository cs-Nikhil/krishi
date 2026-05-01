const express = require("express");
const AuditLog = require("../models/AuditLog");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate, authorize } = require("../middleware/auth");
const { sendSuccess } = require("../utils/apiResponse");
const { buildPaginationMeta, getPagination } = require("../utils/pagination");
const { paginationQuery } = require("../validation/schemas");

const router = express.Router();

router.use(authenticate, authorize("owner"));

router.get(
  "/",
  validate({ query: paginationQuery }),
  asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.query;
    const pagination = getPagination(req.query, { defaultLimit: 50 });
    const query = {};

    if (entityType) query.entityType = entityType;
    if (entityId) query.entityId = entityId;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate("changedBy", "name email role")
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      AuditLog.countDocuments(query)
    ]);

    sendSuccess(res, {
      message: "Audit logs loaded",
      data: {
        logs,
        pagination: buildPaginationMeta({ ...pagination, total })
      }
    });
  })
);

module.exports = router;
