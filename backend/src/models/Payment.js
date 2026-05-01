const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true
    },
    paidAmount: {
      type: Number,
      required: true,
      min: 1
    },
    paymentMode: {
      type: String,
      enum: ["cash", "online"],
      required: true,
      default: "cash"
    },
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    balanceAfter: {
      type: Number,
      default: 0,
      min: 0
    },
    notes: {
      type: String,
      trim: true,
      default: ""
    },
    clientRequestId: {
      type: String,
      trim: true,
      sparse: true,
      unique: true
    },
    source: {
      type: String,
      enum: ["web", "mobile"],
      default: "web"
    },
    syncedAt: {
      type: Date
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

paymentSchema.index({ paymentDate: -1 });
paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Payment", paymentSchema);
