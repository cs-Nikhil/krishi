const mongoose = require("mongoose");

const changeSchema = new mongoose.Schema(
  {
    field: {
      type: String,
      required: true
    },
    previousValue: mongoose.Schema.Types.Mixed,
    updatedValue: mongoose.Schema.Types.Mixed
  },
  { _id: false }
);

const auditLogSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ["customer", "bill", "payment", "user", "report", "backup"],
      required: true,
      index: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    action: {
      type: String,
      enum: ["create", "update", "delete", "export", "backup", "restore"],
      required: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    changedByRole: {
      type: String,
      enum: ["owner", "staff"]
    },
    changes: [changeSchema]
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityType: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
