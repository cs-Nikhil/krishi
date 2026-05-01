const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true
    },
    customerName: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    dueAmount: {
      type: Number,
      required: true,
      min: 0,
      index: true
    },
    lastPaymentDate: {
      type: Date,
      index: true
    },
    type: {
      type: String,
      enum: ["due_overdue", "high_due_overdue", "credit_limit_exceeded"],
      required: true,
      index: true
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      required: true,
      default: "high",
      index: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    threshold: {
      type: Number,
      required: true,
      min: 0
    },
    cycleKey: {
      type: String,
      required: true,
      unique: true,
      index: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

notificationSchema.index({ isRead: 1, createdAt: -1 });
notificationSchema.index({ customerId: 1, createdAt: -1 });
notificationSchema.index({ dueAmount: -1, lastPaymentDate: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
