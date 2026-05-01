const express = require("express");
const Bill = require("../models/Bill");
const BillFile = require("../models/BillFile");
const Customer = require("../models/Customer");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const filterObject = require("../utils/filterObject");
const httpError = require("../utils/httpError");
const upload = require("../middleware/upload");
const { authenticate, authorize } = require("../middleware/auth");
const { uploadLimiter } = require("../middleware/rateLimiters");
const { recalculateCustomerBalance } = require("../services/ledgerService");
const { sendSuccess } = require("../utils/apiResponse");
const { buildPaginationMeta, getPagination } = require("../utils/pagination");
const { createBillBody, idParams, paginationQuery, updateBillBody } = require("../validation/schemas");

const router = express.Router();

router.use(authenticate);

const createBillFile = async (file, userId) => {
  if (!file) return null;

  return BillFile.create({
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    data: file.buffer,
    uploadedBy: userId
  });
};

router.get(
  "/",
  validate({ query: paginationQuery }),
  asyncHandler(async (req, res) => {
    const { search = "" } = req.query;
    const pagination = getPagination(req.query, { defaultLimit: 20 });
    const query = {};

    if (search) {
      query.billNumber = new RegExp(search, "i");
    }

    const [bills, total] = await Promise.all([
      Bill.find(query)
        .populate("customer", "name nameHindi phone address addressHindi customerId totalDue")
        .sort({ purchaseDate: -1, createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      Bill.countDocuments(query)
    ]);

    sendSuccess(res, {
      message: "Bills loaded",
      data: {
        bills,
        pagination: buildPaginationMeta({ ...pagination, total })
      }
    });
  })
);

router.post(
  "/",
  authorize("owner", "staff"),
  uploadLimiter,
  upload.single("billFile"),
  validate({ body: createBillBody }),
  asyncHandler(async (req, res) => {
    const data = filterObject(req.body, [
      "customer",
      "billNumber",
      "billAmount",
      "paidAmount",
      "paymentMode",
      "purchaseDate",
      "clientRequestId"
    ]);

    if (data.paidAmount > data.billAmount) {
      throw httpError(400, "Paid amount cannot be greater than bill amount", {
        paidAmount: "Paid amount cannot be greater than bill amount"
      });
    }

    const customer = await Customer.findOne({ _id: data.customer, isDeleted: { $ne: true } });

    if (!customer) {
      throw httpError(404, "Customer not found");
    }

    const file = await createBillFile(req.file, req.user._id);
    const bill = await Bill.create({
      ...data,
      purchaseDate: data.purchaseDate || Date.now(),
      file: file?._id,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    const updatedCustomer = await recalculateCustomerBalance(customer._id);
    const populatedBill = await Bill.findById(bill._id);

    sendSuccess(res, {
      status: 201,
      message: "Bill created successfully",
      data: {
        billId: populatedBill._id,
        customerId: updatedCustomer._id,
        fileUploaded: Boolean(req.file),
        bill: populatedBill,
        customer: updatedCustomer
      }
    });
  })
);

router.patch(
  "/:id",
  authorize("owner"),
  validate({ params: idParams }),
  uploadLimiter,
  upload.single("billFile"),
  asyncHandler(async (req, res) => {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      throw httpError(404, "Bill not found");
    }

    const before = bill.toObject();
    const updates = filterObject(req.body, ["billNumber", "billAmount", "paidAmount", "paymentMode", "purchaseDate"]);
    const hasBodyUpdates = Object.keys(updates).length > 0;
    const validation = hasBodyUpdates ? updateBillBody.safeParse(updates) : { success: true, data: {} };
    if (!validation.success) {
      throw httpError(400, "Validation failed", validation.error.issues.reduce((errors, issue) => {
        errors[issue.path.join(".") || "request"] = issue.message;
        return errors;
      }, {}));
    }
    if (!hasBodyUpdates && !req.file) {
      throw httpError(400, "Validation failed", { request: "At least one bill field or file is required" });
    }

    const parsedUpdates = validation.data;

    if (req.file) {
      const file = await createBillFile(req.file, req.user._id);
      parsedUpdates.file = file._id;
    }

    const nextBillAmount = parsedUpdates.billAmount ?? bill.billAmount;
    const nextPaidAmount = parsedUpdates.paidAmount ?? bill.paidAmount;
    if (nextPaidAmount > nextBillAmount) {
      throw httpError(400, "Paid amount cannot be greater than bill amount", {
        paidAmount: "Paid amount cannot be greater than bill amount"
      });
    }

    Object.entries(parsedUpdates).forEach(([key, value]) => {
      if (["billAmount", "paidAmount"].includes(key)) {
        bill[key] = Number(value);
      } else {
        bill[key] = value;
      }
    });

    bill.updatedBy = req.user._id;
    await bill.save();
    await recalculateCustomerBalance(bill.customer);
    const updatedBill = await Bill.findById(bill._id);
    await req.auditUpdate({ entityType: "bill", entityId: bill._id, before, after: updatedBill });

    sendSuccess(res, {
      message: "Bill updated successfully",
      data: { bill: updatedBill }
    });
  })
);

router.get(
  "/:id/file",
  validate({ params: idParams }),
  asyncHandler(async (req, res) => {
    const bill = await Bill.findById(req.params.id);
    if (!bill || !bill.file) {
      throw httpError(404, "Bill file not found");
    }

    const file = await BillFile.findById(bill.file);
    if (!file) {
      throw httpError(404, "Bill file not found");
    }

    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${file.originalName}"`);
    res.send(file.data);
  })
);

module.exports = router;
