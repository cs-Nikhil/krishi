const express = require("express");
const Customer = require("../models/Customer");
const Bill = require("../models/Bill");
const Payment = require("../models/Payment");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const filterObject = require("../utils/filterObject");
const httpError = require("../utils/httpError");
const { authenticate, authorize } = require("../middleware/auth");
const { getLedgerItems, recalculateCustomerBalance } = require("../services/ledgerService");
const { getCustomersWithInsights } = require("../services/customerInsightsService");
const { sendSuccess } = require("../utils/apiResponse");
const { buildPaginationMeta, getPagination } = require("../utils/pagination");
const { createCustomerBody, idParams, paginationQuery, updateCustomerBody } = require("../validation/schemas");

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  validate({ query: paginationQuery }),
  asyncHandler(async (req, res) => {
    const pagination = getPagination(req.query, { defaultLimit: 20 });
    const { customers, total } = await getCustomersWithInsights({ query: req.query, pagination });

    sendSuccess(res, {
      message: "Customers loaded",
      data: {
        customers,
        pagination: buildPaginationMeta({ ...pagination, total })
      }
    });
  })
);

router.post(
  "/",
  authorize("owner", "staff"),
  validate({ body: createCustomerBody }),
  asyncHandler(async (req, res) => {
    const data = filterObject(req.body, [
      "name",
      "nameHindi",
      "phone",
      "address",
      "addressHindi",
      "notes",
      "creditLimit"
    ]);

    const exists = await Customer.exists({ phone: data.phone.trim(), isDeleted: { $ne: true } });
    if (exists) {
      throw httpError(409, "A customer with this phone number already exists");
    }

    const customer = await Customer.create({
      ...data,
      ...(req.body.clientRequestId ? { clientRequestId: req.body.clientRequestId } : {}),
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    sendSuccess(res, {
      status: 201,
      message: "Customer created successfully",
      data: { customer }
    });
  })
);

router.get(
  "/:id",
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const customer = await Customer.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!customer) {
      throw httpError(404, "Customer not found");
    }

    sendSuccess(res, {
      message: "Customer loaded",
      data: { customer }
    });
  })
);

const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
  if (!customer) {
    throw httpError(404, "Customer not found");
  }

  const ownerFields = ["name", "nameHindi", "phone", "address", "addressHindi", "notes", "creditLimit"];
  const staffFields = ["name", "nameHindi", "address", "addressHindi", "notes", "creditLimit"];
  const allowedFields = req.user.role === "owner" ? ownerFields : staffFields;
  const updates = filterObject(req.body, allowedFields);
  const before = customer.toObject();

  if (updates.phone && updates.phone !== customer.phone) {
    const exists = await Customer.exists({ phone: updates.phone.trim(), _id: { $ne: customer._id }, isDeleted: { $ne: true } });
    if (exists) {
      throw httpError(409, "A customer with this phone number already exists");
    }
  }

  Object.assign(customer, updates, { updatedBy: req.user._id });
  await customer.save();
  const updatedCustomer = Object.prototype.hasOwnProperty.call(updates, "creditLimit")
    ? await recalculateCustomerBalance(customer._id)
    : customer;
  await req.auditUpdate({ entityType: "customer", entityId: customer._id, before, after: updatedCustomer });

  sendSuccess(res, {
    message: "Customer updated successfully",
    data: { customer: updatedCustomer }
  });
});

router.patch("/:id", authorize("owner", "staff"), validate({ params: idParams, body: updateCustomerBody }), updateCustomer);
router.put("/:id", authorize("owner", "staff"), validate({ params: idParams, body: updateCustomerBody }), updateCustomer);

router.delete(
  "/:id",
  authorize("owner"),
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const customer = await Customer.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!customer) {
      throw httpError(404, "Customer not found");
    }

    const before = customer.toObject();
    customer.isDeleted = true;
    customer.deletedAt = new Date();
    customer.deletedBy = req.user._id;
    customer.updatedBy = req.user._id;
    await customer.save();
    await req.auditUpdate({ entityType: "customer", entityId: customer._id, before, after: customer });

    sendSuccess(res, {
      message: "Customer deleted successfully",
      data: { customerId: customer._id }
    });
  })
);

router.get(
  "/:id/transactions",
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const customer = await Customer.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!customer) {
      throw httpError(404, "Customer not found");
    }

    const items = await getLedgerItems(customer._id);
    const transactions = items.map((item) => {
      if (item.type === "bill") {
        return {
          id: item._id,
          type: "bill",
          billNumber: item.billNumber,
          date: item.purchaseDate,
          billAmount: item.billAmount,
          paidAmount: item.paidAmount,
          paymentMode: item.paymentMode,
          dueChange: item.dueChange,
          balanceAfter: item.balanceAfter,
          fileUrl: item.file ? `/api/bills/${item._id}/file` : null
        };
      }

      return {
        id: item._id,
        type: "payment",
        date: item.paymentDate,
        paidAmount: item.paidAmount,
        paymentMode: item.paymentMode,
        dueChange: item.dueChange,
        balanceAfter: item.balanceAfter,
        notes: item.notes
      };
    });

    const [bills, payments] = await Promise.all([
      Bill.find({ customer: customer._id }).sort({ purchaseDate: -1 }),
      Payment.find({ customer: customer._id }).sort({ paymentDate: -1 })
    ]);

    sendSuccess(res, {
      message: "Customer transactions loaded",
      data: { customer, transactions, bills, payments }
    });
  })
);

module.exports = router;
