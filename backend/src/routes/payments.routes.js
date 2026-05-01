const express = require("express");
const Customer = require("../models/Customer");
const Payment = require("../models/Payment");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const filterObject = require("../utils/filterObject");
const httpError = require("../utils/httpError");
const { authenticate, authorize } = require("../middleware/auth");
const { assertPaymentDoesNotExceedDue, recalculateCustomerBalance } = require("../services/ledgerService");
const { sendSuccess } = require("../utils/apiResponse");
const { buildPaginationMeta, getPagination } = require("../utils/pagination");
const { createPaymentBody, idParams, paginationQuery, updatePaymentBody } = require("../validation/schemas");

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  validate({ query: paginationQuery }),
  asyncHandler(async (req, res) => {
    const pagination = getPagination(req.query, { defaultLimit: 20 });
    const [payments, total] = await Promise.all([
      Payment.find()
        .populate("customer", "name nameHindi phone address addressHindi customerId totalDue")
        .sort({ paymentDate: -1, createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      Payment.countDocuments()
    ]);

    sendSuccess(res, {
      message: "Payments loaded",
      data: {
        payments,
        pagination: buildPaginationMeta({ ...pagination, total })
      }
    });
  })
);

router.post(
  "/",
  authorize("owner", "staff"),
  validate({ body: createPaymentBody }),
  asyncHandler(async (req, res) => {
    const data = filterObject(req.body, ["customer", "paidAmount", "paymentMode", "paymentDate", "notes", "clientRequestId"]);
    const paidAmount = Number(data.paidAmount);

    const customer = await Customer.findOne({ _id: data.customer, isDeleted: { $ne: true } });
    if (!customer) {
      throw httpError(404, "Customer not found");
    }

    await assertPaymentDoesNotExceedDue(customer._id, paidAmount);

    const payment = await Payment.create({
      customer: customer._id,
      paidAmount,
      paymentMode: data.paymentMode || "cash",
      paymentDate: data.paymentDate || Date.now(),
      notes: data.notes || "",
      ...(data.clientRequestId ? { clientRequestId: data.clientRequestId } : {}),
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    const updatedCustomer = await recalculateCustomerBalance(customer._id);
    const updatedPayment = await Payment.findById(payment._id);

    sendSuccess(res, {
      status: 201,
      message: "Payment recorded successfully",
      data: { payment: updatedPayment, customer: updatedCustomer }
    });
  })
);

router.patch(
  "/:id",
  authorize("owner"),
  validate({ params: idParams, body: updatePaymentBody }),
  asyncHandler(async (req, res) => {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      throw httpError(404, "Payment not found");
    }

    const before = payment.toObject();
    const updates = filterObject(req.body, ["paidAmount", "paymentMode", "paymentDate", "notes"]);

    Object.entries(updates).forEach(([key, value]) => {
      payment[key] = key === "paidAmount" ? Number(value) : value;
    });

    payment.updatedBy = req.user._id;
    await payment.save();
    await recalculateCustomerBalance(payment.customer);
    const updatedPayment = await Payment.findById(payment._id);
    await req.auditUpdate({ entityType: "payment", entityId: payment._id, before, after: updatedPayment });

    sendSuccess(res, {
      message: "Payment updated successfully",
      data: { payment: updatedPayment }
    });
  })
);

module.exports = router;
