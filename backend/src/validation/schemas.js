const { z } = require("zod");

const objectId = z.string().trim().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const optionalText = (max = 500) => z.string().trim().max(max).optional().default("");
const optionalTrimmedText = (max = 500) => z.string().trim().max(max).optional();
const optionalDate = z.coerce.date().optional();
const paymentModeValue = z.enum(["cash", "online"]);
const paymentMode = paymentModeValue.optional().default("cash");
const deviceType = z.enum(["android", "ios", "web", "unknown"]).optional();

const paginationQuery = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().max(100).optional(),
    entityType: z.string().trim().max(50).optional(),
    entityId: objectId.optional()
  })
  .passthrough();

const idParams = z.object({
  id: objectId
});

const deviceIdParams = z.object({
  deviceId: z.string().trim().min(1).max(160)
});

const loginBody = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(200),
  deviceId: z.string().trim().min(1).max(160).optional(),
  deviceType,
  deviceName: z.string().trim().max(120).optional(),
  os: z.string().trim().max(80).optional(),
  appVersion: z.string().trim().max(40).optional()
});

const refreshTokenBody = z.object({
  refreshToken: z.string().trim().min(32)
});

const logoutBody = z
  .object({
    refreshToken: z.string().trim().min(32).optional(),
    deviceId: z.string().trim().min(1).max(160).optional()
  })
  .partial();

const createCustomerBody = z.object({
  name: z.string().trim().min(1, "Customer name is required").max(120),
  nameHindi: optionalText(120),
  phone: z.string().trim().min(5, "Phone number is required").max(30),
  address: optionalText(500),
  addressHindi: optionalText(500),
  notes: optionalText(1000),
  creditLimit: z.coerce.number().min(0).optional().default(0),
  clientRequestId: z.string().trim().min(1).max(160).optional()
});

const updateCustomerBody = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    nameHindi: optionalTrimmedText(120),
    phone: z.string().trim().min(5).max(30).optional(),
    address: optionalTrimmedText(500),
    addressHindi: optionalTrimmedText(500),
    notes: optionalTrimmedText(1000),
    creditLimit: z.coerce.number().min(0).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one customer field is required"
  });

const createBillBody = z.object({
  customer: objectId,
  billNumber: z.string().trim().min(1).max(80).optional(),
  billAmount: z.coerce.number().min(0),
  paidAmount: z.coerce.number().min(0).optional().default(0),
  paymentMode,
  purchaseDate: optionalDate,
  clientRequestId: z.string().trim().min(1).max(160).optional()
});

const updateBillBody = z
  .object({
    billNumber: z.string().trim().min(1).max(80).optional(),
    billAmount: z.coerce.number().min(0).optional(),
    paidAmount: z.coerce.number().min(0).optional(),
    paymentMode: paymentModeValue.optional(),
    purchaseDate: optionalDate
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one bill field is required"
  });

const createPaymentBody = z.object({
  customer: objectId,
  paidAmount: z.coerce.number().positive(),
  paymentMode,
  paymentDate: optionalDate,
  notes: optionalText(1000),
  clientRequestId: z.string().trim().min(1).max(160).optional()
});

const updatePaymentBody = z
  .object({
    paidAmount: z.coerce.number().positive().optional(),
    paymentMode: paymentModeValue.optional(),
    paymentDate: optionalDate,
    notes: optionalTrimmedText(1000)
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one payment field is required"
  });

const offlineCustomer = z.object({
  clientRequestId: z.string().trim().min(1).max(160).optional(),
  clientId: z.string().trim().min(1).max(160).optional(),
  name: z.string().trim().min(1).max(120),
  nameHindi: optionalText(120),
  phone: z.string().trim().min(5).max(30),
  address: optionalText(500),
  addressHindi: optionalText(500),
  notes: optionalText(1000)
});

const offlineBill = z.object({
  clientRequestId: z.string().trim().min(1).max(160).optional(),
  clientId: z.string().trim().min(1).max(160).optional(),
  customer: objectId.optional(),
  customerId: z.string().trim().min(1).max(160).optional(),
  clientCustomerId: z.string().trim().min(1).max(160).optional(),
  billNumber: z.string().trim().min(1).max(80).optional(),
  billAmount: z.coerce.number().min(0),
  paidAmount: z.coerce.number().min(0).optional().default(0),
  paymentMode,
  purchaseDate: optionalDate
});

const offlinePayment = z.object({
  clientRequestId: z.string().trim().min(1).max(160).optional(),
  clientId: z.string().trim().min(1).max(160).optional(),
  customer: objectId.optional(),
  customerId: z.string().trim().min(1).max(160).optional(),
  clientCustomerId: z.string().trim().min(1).max(160).optional(),
  paidAmount: z.coerce.number().positive(),
  paymentMode,
  paymentDate: optionalDate,
  notes: optionalText(1000)
});

const syncBody = z
  .object({
    deviceId: z.string().trim().min(1).max(160).optional(),
    customerDrafts: z.array(offlineCustomer).max(100).optional().default([]),
    offlineBills: z.array(offlineBill).max(100).optional().default([]),
    offlinePayments: z.array(offlinePayment).max(100).optional().default([])
  })
  .refine(
    (value) => value.customerDrafts.length + value.offlineBills.length + value.offlinePayments.length <= 200,
    {
      message: "A single sync request can contain at most 200 records"
    }
  );

module.exports = {
  createBillBody,
  createCustomerBody,
  createPaymentBody,
  deviceIdParams,
  idParams,
  loginBody,
  logoutBody,
  paginationQuery,
  refreshTokenBody,
  syncBody,
  updateBillBody,
  updateCustomerBody,
  updatePaymentBody
};
