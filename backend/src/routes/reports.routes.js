const express = require("express");
const AuditLog = require("../models/AuditLog");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate } = require("../middleware/auth");
const { buildReport } = require("../services/customerInsightsService");
const { sendSuccess } = require("../utils/apiResponse");

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const report = await buildReport(req.query);

    sendSuccess(res, {
      message: "Report generated",
      data: { report }
    });
  })
);

router.post(
  "/export-log",
  asyncHandler(async (req, res) => {
    const { exportType = "print", filters = {} } = req.body || {};

    await AuditLog.create({
      entityType: "report",
      entityId: req.user._id,
      action: "export",
      changedBy: req.user._id,
      changedByRole: req.user.role,
      changes: [
        { field: "exportType", previousValue: null, updatedValue: exportType },
        { field: "filters", previousValue: null, updatedValue: filters }
      ]
    });

    sendSuccess(res, {
      message: "Report export logged",
      data: { exportType }
    });
  })
);

module.exports = router;
