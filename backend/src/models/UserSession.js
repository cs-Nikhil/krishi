const mongoose = require("mongoose");

const userSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    refreshTokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    deviceId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    deviceType: {
      type: String,
      enum: ["android", "ios", "web", "unknown"],
      default: "unknown"
    },
    deviceName: {
      type: String,
      trim: true,
      default: ""
    },
    os: {
      type: String,
      trim: true,
      default: ""
    },
    appVersion: {
      type: String,
      trim: true,
      default: ""
    },
    ipAddress: {
      type: String,
      trim: true,
      default: ""
    },
    userAgent: {
      type: String,
      trim: true,
      default: ""
    },
    lastActive: {
      type: Date,
      default: Date.now,
      index: true
    },
    revokedAt: {
      type: Date
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
userSessionSchema.index({ userId: 1, deviceId: 1, revokedAt: 1 });

userSessionSchema.virtual("active").get(function active() {
  return !this.revokedAt && this.expiresAt > new Date();
});

module.exports = mongoose.model("UserSession", userSessionSchema);
