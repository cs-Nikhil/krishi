const Bill = require("../models/Bill");
const Customer = require("../models/Customer");
const Payment = require("../models/Payment");
const httpError = require("../utils/httpError");
const { getHighDueThreshold, getHighPriorityThreshold, getOverdueDays } = require("./customerInsightsService");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const byLedgerOrder = (a, b) => {
  const aTime = new Date(a.date).getTime();
  const bTime = new Date(b.date).getTime();
  if (aTime !== bTime) return aTime - bTime;
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
};

const getLedgerItems = async (customerId) => {
  const [bills, payments] = await Promise.all([
    Bill.find({ customer: customerId }).lean(),
    Payment.find({ customer: customerId }).lean()
  ]);

  return [
    ...bills.map((bill) => ({
      ...bill,
      type: "bill",
      date: bill.purchaseDate,
      dueChange: bill.billAmount - bill.paidAmount
    })),
    ...payments.map((payment) => ({
      ...payment,
      type: "payment",
      date: payment.paymentDate,
      dueChange: -payment.paidAmount
    }))
  ].sort(byLedgerOrder);
};

const recalculateCustomerBalance = async (customerId) => {
  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw httpError(404, "Customer not found");
  }

  const items = await getLedgerItems(customerId);
  let balance = 0;
  let lastPaymentDate = null;
  let lastBillDate = null;

  for (const item of items) {
    balance = Math.max(0, balance + item.dueChange);

    if (item.type === "bill") {
      if (!lastBillDate || new Date(item.purchaseDate) > lastBillDate) {
        lastBillDate = new Date(item.purchaseDate);
      }
      if (Number(item.paidAmount || 0) > 0 && (!lastPaymentDate || new Date(item.purchaseDate) > lastPaymentDate)) {
        lastPaymentDate = new Date(item.purchaseDate);
      }
      await Bill.updateOne({ _id: item._id }, { $set: { balanceAfter: balance } });
    } else {
      if (!lastPaymentDate || new Date(item.paymentDate) > lastPaymentDate) {
        lastPaymentDate = new Date(item.paymentDate);
      }
      await Payment.updateOne({ _id: item._id }, { $set: { balanceAfter: balance } });
    }
  }

  customer.totalDue = balance;
  customer.lastPaymentDate = lastPaymentDate;
  const overdueCutoff = new Date(Date.now() - getOverdueDays() * MS_PER_DAY);
  const overdueBaseDate = lastPaymentDate || lastBillDate || customer.createdAt || new Date();
  const creditExceeded = Number(customer.creditLimit || 0) > 0 && balance > Number(customer.creditLimit || 0);
  const isOverdue = balance > 0 && overdueBaseDate <= overdueCutoff;

  if (creditExceeded || balance >= getHighPriorityThreshold() || isOverdue) {
    customer.riskLevel = "high";
  } else if (balance >= getHighDueThreshold()) {
    customer.riskLevel = "medium";
  } else {
    customer.riskLevel = "low";
  }

  await customer.save();
  return customer;
};

const assertPaymentDoesNotExceedDue = async (customerId, paidAmount, excludePaymentId) => {
  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw httpError(404, "Customer not found");
  }

  if (!excludePaymentId && paidAmount > customer.totalDue) {
    throw httpError(400, "Payment cannot be greater than current due amount");
  }
};

module.exports = {
  getLedgerItems,
  recalculateCustomerBalance,
  assertPaymentDoesNotExceedDue
};
