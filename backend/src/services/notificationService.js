const Notification = require("../models/Notification");
const {
  getDueNotificationCandidates,
  getDueThresholds,
  getHighPriorityThreshold
} = require("./customerInsightsService");

const getCycleDate = (date = new Date()) => date.toISOString().slice(0, 10);

const getMatchingThreshold = (dueAmount, thresholds) => {
  return thresholds.filter((threshold) => dueAmount > threshold).pop() || thresholds[0];
};

const buildDueMessage = ({ customerName, dueAmount, threshold }) => {
  return `${customerName} has unpaid dues of Rs ${Math.round(dueAmount)} and no recent payment. Follow up for recovery.`;
};

const runDueNotificationJob = async ({ now = new Date() } = {}) => {
  const thresholds = getDueThresholds();
  const highPriorityThreshold = getHighPriorityThreshold();
  const cycleDate = getCycleDate(now);
  const candidates = await getDueNotificationCandidates({ now, minDue: thresholds[0] });
  let created = 0;

  for (const customer of candidates) {
    const threshold = getMatchingThreshold(Number(customer.totalDue || 0), thresholds);
    const priority = "high";
    const type = Number(customer.totalDue || 0) >= highPriorityThreshold ? "high_due_overdue" : "due_overdue";
    const cycleKey = `${cycleDate}:${customer._id}:${threshold}`;
    const customerName = customer.name || customer.nameHindi || "Customer";
    const result = await Notification.updateOne(
      { cycleKey },
      {
        $setOnInsert: {
          customerId: customer._id,
          customerName,
          phone: customer.phone,
          dueAmount: customer.totalDue || 0,
          lastPaymentDate: customer.lastPaymentDate || null,
          type,
          priority,
          threshold,
          message: buildDueMessage({
            customerName,
            dueAmount: customer.totalDue || 0,
            threshold
          }),
          isRead: false,
          cycleKey,
          createdAt: now
        }
      },
      { upsert: true }
    );

    if (result.upsertedCount) {
      created += result.upsertedCount;
    }
  }

  return {
    checked: candidates.length,
    created,
    cycleDate,
    thresholds
  };
};

module.exports = {
  runDueNotificationJob
};
