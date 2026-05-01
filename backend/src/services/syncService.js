const Bill = require("../models/Bill");
const Customer = require("../models/Customer");
const Payment = require("../models/Payment");
const SyncLog = require("../models/SyncLog");
const { assertPaymentDoesNotExceedDue, recalculateCustomerBalance } = require("./ledgerService");

const getClientKey = (item) => item.clientRequestId || item.clientId || null;

const addClientMappings = (map, item, customerId) => {
  for (const key of [item.clientRequestId, item.clientId]) {
    if (key) {
      map.set(key, customerId.toString());
    }
  }
};

const isObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(String(value || ""));

const resolveCustomerRef = (item, customerMap) => {
  return item.customer || item.customerId || customerMap.get(item.clientCustomerId) || null;
};

const findCustomerForSyncItem = async (item, customerMap) => {
  const customerRef = resolveCustomerRef(item, customerMap);
  if (!customerRef) {
    return null;
  }

  if (isObjectId(customerRef)) {
    return Customer.findOne({ _id: customerRef, isDeleted: { $ne: true } });
  }

  return Customer.findOne({ customerId: customerRef, isDeleted: { $ne: true } });
};

const pushFailure = (report, type, item, error) => {
  report.failed += 1;
  report.errors.push({
    type,
    clientRequestId: getClientKey(item),
    message: error.message || "Sync failed"
  });
};

const syncOfflinePayload = async ({ payload, user, deviceId }) => {
  const report = {
    synced: 0,
    failed: 0,
    duplicates: 0,
    conflicts: [],
    errors: [],
    results: {
      customers: [],
      bills: [],
      payments: []
    }
  };
  const customerMap = new Map();
  const affectedCustomers = new Set();

  for (const draft of payload.customerDrafts) {
    try {
      const clientKey = getClientKey(draft);
      const existingByClient = clientKey ? await Customer.findOne({ clientRequestId: clientKey, isDeleted: { $ne: true } }) : null;
      if (existingByClient) {
        report.duplicates += 1;
        addClientMappings(customerMap, draft, existingByClient._id);
        report.results.customers.push({ clientRequestId: clientKey, id: existingByClient._id, status: "duplicate" });
        continue;
      }

      const existingByPhone = await Customer.findOne({ phone: draft.phone, isDeleted: { $ne: true } });
      if (existingByPhone) {
        report.failed += 1;
        report.conflicts.push({
          type: "customer",
          field: "phone",
          clientRequestId: clientKey,
          existingId: existingByPhone._id,
          message: "A customer with this phone number already exists"
        });
        continue;
      }

      const customer = await Customer.create({
        name: draft.name,
        nameHindi: draft.nameHindi || "",
        phone: draft.phone,
        address: draft.address || "",
        addressHindi: draft.addressHindi || "",
        notes: draft.notes || "",
        ...(clientKey ? { clientRequestId: clientKey } : {}),
        source: "mobile",
        syncedAt: new Date(),
        createdBy: user._id,
        updatedBy: user._id
      });

      report.synced += 1;
      addClientMappings(customerMap, draft, customer._id);
      report.results.customers.push({ clientRequestId: clientKey, id: customer._id, status: "synced" });
    } catch (error) {
      pushFailure(report, "customer", draft, error);
    }
  }

  for (const item of payload.offlineBills) {
    try {
      const clientKey = getClientKey(item);
      const customer = await findCustomerForSyncItem(item, customerMap);

      const existingByClient = clientKey ? await Bill.findOne({ clientRequestId: clientKey }) : null;
      if (existingByClient) {
        report.duplicates += 1;
        report.results.bills.push({ clientRequestId: clientKey, id: existingByClient._id, status: "duplicate" });
        affectedCustomers.add(existingByClient.customer.toString());
        continue;
      }

      if (item.billNumber) {
        const existingByBillNumber = await Bill.findOne({ billNumber: item.billNumber });
        if (existingByBillNumber) {
          report.failed += 1;
          report.conflicts.push({
            type: "bill",
            field: "billNumber",
            clientRequestId: clientKey,
            existingId: existingByBillNumber._id,
            message: "A bill with this bill number already exists"
          });
          continue;
        }
      }

      if (!customer) {
        throw new Error("Customer not found for bill sync");
      }

      const bill = await Bill.create({
        customer: customer._id,
        billNumber: item.billNumber,
        billAmount: item.billAmount,
        paidAmount: item.paidAmount || 0,
        paymentMode: item.paymentMode || "cash",
        purchaseDate: item.purchaseDate || Date.now(),
        ...(clientKey ? { clientRequestId: clientKey } : {}),
        source: "mobile",
        syncedAt: new Date(),
        createdBy: user._id,
        updatedBy: user._id
      });

      report.synced += 1;
      affectedCustomers.add(customer._id.toString());
      report.results.bills.push({ clientRequestId: clientKey, id: bill._id, status: "synced" });
    } catch (error) {
      pushFailure(report, "bill", item, error);
    }
  }

  for (const customerId of Array.from(affectedCustomers)) {
    await recalculateCustomerBalance(customerId);
  }

  for (const item of payload.offlinePayments) {
    try {
      const clientKey = getClientKey(item);
      const customer = await findCustomerForSyncItem(item, customerMap);

      const existingByClient = clientKey ? await Payment.findOne({ clientRequestId: clientKey }) : null;
      if (existingByClient) {
        report.duplicates += 1;
        report.results.payments.push({ clientRequestId: clientKey, id: existingByClient._id, status: "duplicate" });
        continue;
      }

      if (!customer) {
        throw new Error("Customer not found for payment sync");
      }

      await assertPaymentDoesNotExceedDue(customer._id, item.paidAmount);

      const payment = await Payment.create({
        customer: customer._id,
        paidAmount: item.paidAmount,
        paymentMode: item.paymentMode || "cash",
        paymentDate: item.paymentDate || Date.now(),
        notes: item.notes || "",
        ...(clientKey ? { clientRequestId: clientKey } : {}),
        source: "mobile",
        syncedAt: new Date(),
        createdBy: user._id,
        updatedBy: user._id
      });

      await recalculateCustomerBalance(customer._id);
      report.synced += 1;
      report.results.payments.push({ clientRequestId: clientKey, id: payment._id, status: "synced" });
    } catch (error) {
      pushFailure(report, "payment", item, error);
    }
  }

  const status = report.failed ? (report.synced || report.duplicates ? "partial" : "failed") : "completed";
  const syncLog = await SyncLog.create({
    userId: user._id,
    deviceId: deviceId || "",
    status,
    synced: report.synced,
    failed: report.failed,
    duplicates: report.duplicates,
    conflicts: report.conflicts,
    syncErrors: report.errors,
    payloadSummary: {
      customers: payload.customerDrafts.length,
      bills: payload.offlineBills.length,
      payments: payload.offlinePayments.length
    }
  });

  return {
    ...report,
    syncLogId: syncLog._id
  };
};

module.exports = { syncOfflinePayload };
