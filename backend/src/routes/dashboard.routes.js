const express = require("express");
const Bill = require("../models/Bill");
const Customer = require("../models/Customer");
const Payment = require("../models/Payment");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate } = require("../middleware/auth");
const { buildCustomerInsightStages } = require("../services/customerInsightsService");
const { sendSuccess } = require("../utils/apiResponse");

const router = express.Router();

router.use(authenticate);

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      customerCount,
      billCount,
      paymentCount,
      dueAggregate,
      overdueAggregate,
      paymentsTodayAggregate,
      billPaymentsTodayAggregate,
      recentBills,
      recentPayments
    ] = await Promise.all([
      Customer.countDocuments({ isDeleted: { $ne: true } }),
      Bill.countDocuments(),
      Payment.countDocuments(),
      Customer.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: null, totalDue: { $sum: "$totalDue" } } }
      ]),
      Customer.aggregate([...buildCustomerInsightStages({ query: { quickFilter: "overdue30" } }), { $count: "count" }]),
      Payment.aggregate([
        { $match: { paymentDate: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: "$paidAmount" } } }
      ]),
      Bill.aggregate([
        { $match: { purchaseDate: { $gte: todayStart, $lte: todayEnd }, paidAmount: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: "$paidAmount" } } }
      ]),
      Bill.find()
        .populate("customer", "name nameHindi phone address addressHindi customerId")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Payment.find()
        .populate("customer", "name nameHindi phone address addressHindi customerId")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    const recentActivity = [
      ...recentBills.map((bill) => ({
        id: bill._id,
        type: "bill",
        customer: bill.customer,
        amount: bill.billAmount,
        date: bill.createdAt
      })),
      ...recentPayments.map((payment) => ({
        id: payment._id,
        type: "payment",
        customer: payment.customer,
        amount: payment.paidAmount,
        date: payment.createdAt
      }))
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);

    sendSuccess(res, {
      message: "Dashboard summary loaded",
      data: {
        customerCount,
        billCount,
        paymentCount,
        totalDue: dueAggregate[0]?.totalDue || 0,
        overdueCustomers: overdueAggregate[0]?.count || 0,
        paymentsReceivedToday: (paymentsTodayAggregate[0]?.total || 0) + (billPaymentsTodayAggregate[0]?.total || 0),
        recentActivity
      }
    });
  })
);

module.exports = router;
