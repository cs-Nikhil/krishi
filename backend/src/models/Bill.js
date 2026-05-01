const mongoose = require("mongoose");

const generateBillNumber = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `BILL-${datePart}-${suffix}`;
};

const billSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true
    },
    billNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    billAmount: {
      type: Number,
      required: true,
      min: 0
    },
    paidAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    paymentMode: {
      type: String,
      enum: ["cash", "online"],
      required: true,
      default: "cash"
    },
    purchaseDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    file: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BillFile"
    },
    balanceAfter: {
      type: Number,
      default: 0,
      min: 0
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

billSchema.pre("validate", function validateBill(next) {
  if (!this.billNumber) {
    this.billNumber = generateBillNumber();
  }

  if (this.paidAmount > this.billAmount) {
    return next(new Error("Paid amount cannot be greater than bill amount"));
  }

  return next();
});

billSchema.index({ createdAt: -1 });
billSchema.index({ purchaseDate: -1 });

module.exports = mongoose.model("Bill", billSchema);
