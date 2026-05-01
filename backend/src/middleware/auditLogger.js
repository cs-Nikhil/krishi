const AuditLog = require("../models/AuditLog");
const { diffObjects } = require("../utils/normalizeDoc");

const attachAuditLogger = (req, res, next) => {
  req.auditUpdate = async ({ entityType, entityId, before, after, ignoredFields = [] }) => {
    const changes = diffObjects(before, after, ignoredFields);
    if (!changes.length) return null;

    return AuditLog.create({
      entityType,
      entityId,
      action: "update",
      changedBy: req.user?._id,
      changedByRole: req.user?.role,
      changes
    });
  };

  next();
};

module.exports = attachAuditLogger;

