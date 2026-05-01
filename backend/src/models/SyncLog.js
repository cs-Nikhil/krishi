const mongoose = require("mongoose");

const syncLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    deviceId: {
      type: String,
      trim: true,
      default: "",
      index: true
    },
    status: {
      type: String,
      enum: ["completed", "partial", "failed"],
      required: true
    },
    synced: {
      type: Number,
      default: 0
    },
    failed: {
      type: Number,
      default: 0
    },
    duplicates: {
      type: Number,
      default: 0
    },
    conflicts: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    syncErrors: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    payloadSummary: {
      customers: {
        type: Number,
        default: 0
      },
      bills: {
        type: Number,
        default: 0
      },
      payments: {
        type: Number,
        default: 0
      }
    }
  },
  { timestamps: true }
);

syncLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("SyncLog", syncLogSchema);
