const mongoose = require("mongoose");

const generateCustomerId = () => {
  const stamp = Date.now().toString(36).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CUS-${stamp}-${suffix}`;
};

const customerSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    nameHindi: {
      type: String,
      trim: true,
      default: ""
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    address: {
      type: String,
      trim: true,
      default: ""
    },
    addressHindi: {
      type: String,
      trim: true,
      default: ""
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
    totalDue: {
      type: Number,
      default: 0,
      min: 0
    },
    lastPaymentDate: {
      type: Date,
      index: true
    },
    riskLevel: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
      index: true
    },
    creditLimit: {
      type: Number,
      default: 0,
      min: 0
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
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

customerSchema.pre("validate", function setCustomerId(next) {
  if (!this.customerId) {
    this.customerId = generateCustomerId();
  }

  next();
});

customerSchema.index({ createdAt: -1 });
customerSchema.index({ totalDue: -1 });
customerSchema.index({ totalDue: -1, lastPaymentDate: 1 });
customerSchema.index({ nameHindi: 1 });
customerSchema.index({ isDeleted: 1, updatedAt: -1 });

module.exports = mongoose.model("Customer", customerSchema);
